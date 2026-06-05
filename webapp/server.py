"""
CareerCheck Mini App — FastAPI backend
Отдаёт статику React-приложения и REST API для Mini App.

Эндпоинты:
  GET  /                        → index.html (SPA)
  GET  /api/results/{tg_id}     → последний результат пользователя
  POST /api/results/save        → сохранить результат из Mini App
  GET  /api/health              → healthcheck
"""

import json
import hmac
import hashlib
import logging
import os
import time
from pathlib import Path

import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncpg

# Подключаем существующие модули бота
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from config.settings import BOT_TOKEN, DB_CONFIG, REDIS_CONFIG, get_ab_price
from db.database import get_last_result, save_result, create_user, get_user
from services.calculator import calculate_scores, calculate_riasec, match_professions
from db.database import get_professions

logger = logging.getLogger(__name__)

app = FastAPI(title="CareerCheck Mini App", docs_url=None, redoc_url=None)

_raw_origins = os.getenv("ALLOWED_ORIGINS", "https://careercheck.app")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.telegram\.org",
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── DB pool ────────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    app.state.pool = await asyncpg.create_pool(**DB_CONFIG, min_size=2, max_size=10)
    redis_url = f"redis://{REDIS_CONFIG['host']}:{REDIS_CONFIG['port']}"
    app.state.redis = aioredis.from_url(redis_url, decode_responses=True)
    logger.info("Mini App: DB pool + Redis created")

@app.on_event("shutdown")
async def shutdown():
    await app.state.pool.close()
    await app.state.redis.aclose()


# ── Telegram Init Data Validation ─────────────────────────────────────────────

def validate_init_data(init_data: str) -> dict | None:
    """
    Проверяет подпись initData от Telegram WebApp.

    Правильная реализация для нового Telegram (2024+):
    - parse_qsl декодирует URL-encoded значения
    - из check_string исключается ТОЛЬКО 'hash' (signature включается!)
    - HMAC-SHA256 с ключом HMAC(b"WebAppData", bot_token)
    """
    from urllib.parse import parse_qsl
    try:
        if not init_data:
            return None

        params = dict(parse_qsl(init_data, keep_blank_values=True))

        if "hash" not in params or "user" not in params:
            logger.warning("initData missing required fields")
            return None

        # Исключаем ТОЛЬКО hash — signature остаётся в check_string
        check_string = "\n".join(
            f"{k}={params[k]}" for k in sorted(params) if k != "hash"
        )

        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        expected   = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()

        if not hmac.compare_digest(expected, params["hash"]):
            logger.warning(f"initData HMAC mismatch (user={params.get('user','')[:30]})")
            return None

        return json.loads(params["user"])

    except Exception as e:
        logger.warning(f"initData validation error: {e}")
        return None


# ── API ────────────────────────────────────────────────────────────────────────

class SaveResultRequest(BaseModel):
    init_data: str
    answers: list
    lang: str = "ru"

class EventRequest(BaseModel):
    event: str
    user_id: int
    metadata: dict = {}


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/event")
async def track_event(body: EventRequest, request: Request):
    """M1: Воронка конверсии — сохраняем событие в Redis stream."""
    try:
        redis = request.app.state.redis
        entry = json.dumps({
            "event":   body.event,
            "user_id": body.user_id,
            "ts":      time.time(),
            **body.metadata,
        })
        await redis.lpush(f"events:{body.event}", entry)
        await redis.expire(f"events:{body.event}", 86400 * 90)  # 90 дней
        await redis.incr(f"ev_count:{body.event}")
    except Exception as e:
        logger.debug(f"Event track error: {e}")
    return {"ok": True}


@app.get("/api/events/summary")
async def events_summary(request: Request):
    """M1: Агрегированная статистика событий для дашборда."""
    events = ["app_open","test_start","q10_answered","q30_answered",
              "q60_answered","view_results","view_premium","share_click"]
    redis = request.app.state.redis
    result = {}
    for ev in events:
        count = await redis.get(f"ev_count:{ev}")
        result[ev] = int(count or 0)
    return result


@app.get("/api/health/bot")
async def health_bot(request: Request):
    """Проверяет heartbeat бота — пишется в Redis каждые 30 сек."""
    try:
        ts = await request.app.state.redis.get("bot:heartbeat")
        if ts and (time.time() - float(ts)) < 90:
            return {"status": "ok", "last_seen_ago": round(time.time() - float(ts))}
        return JSONResponse({"status": "dead", "last_seen": ts}, status_code=503)
    except Exception as e:
        return JSONResponse({"status": "unknown", "error": str(e)}, status_code=503)


@app.get("/api/user/state")
async def get_user_state(init_data: str, request: Request):
    """Возвращает полное состояние пользователя для MenuPage."""
    user = validate_init_data(init_data)
    if not user:
        raise HTTPException(status_code=403, detail="Invalid init data")

    pool        = request.app.state.pool
    telegram_id = user["id"]
    tg_lang     = (user.get("language_code") or "en")[:2]

    db_user = await get_user(pool, telegram_id)
    if not db_user:
        return {
            "hasResults":      False,
            "hasPremium":      False,
            "testInProgress":  False,
            "currentQuestion": 0,
            "lastResultDate":  None,
            "lastResultId":    None,
            "historyCount":    0,
            "language":        tg_lang,
            "topProfession":   None,
        }

    # Последний результат
    result = await get_last_result(pool, db_user["id"])

    # Прогресс незавершённого теста
    from db.database import get_progress
    progress = await get_progress(pool, db_user["id"])

    # Количество прохождений
    async with pool.acquire() as conn:
        history_count = await conn.fetchval(
            "SELECT COUNT(*) FROM test_results WHERE user_id = $1", db_user["id"]
        ) or 0

    top_profession  = None
    last_result_date = None
    last_result_id   = None

    if result:
        top_raw = result["top_professions"]
        top = json.loads(top_raw) if isinstance(top_raw, str) else top_raw
        if top:
            t1 = top[0]
            top_profession = {
                "name":  t1.get("title", ""),
                "match": t1.get("match", 0),
                "id":    t1.get("title", "").replace(" ", "_").lower(),
            }
        last_result_date = result["completed_at"].isoformat() if result["completed_at"] else None
        last_result_id   = str(db_user["id"])

    test_in_progress  = False
    current_question  = 0
    if progress:
        cq = progress.get("current_question", 0)
        if 0 < cq < 60:
            test_in_progress = True
            current_question = cq

    lang = (db_user.get("lang") or tg_lang or "en")[:2]

    return {
        "hasResults":      bool(result),
        "hasPremium":      False,
        "testInProgress":  test_in_progress,
        "currentQuestion": current_question,
        "lastResultDate":  last_result_date,
        "lastResultId":    last_result_id,
        "historyCount":    int(history_count),
        "language":        lang,
        "topProfession":   top_profession,
        "premiumPrice":    get_ab_price(telegram_id),  # M2: A/B test
    }


@app.get("/api/questions")
async def get_questions_endpoint(lang: str = "ru", request: Request = None):
    """Возвращает активные вопросы. B6: кэширует в Redis на 24 часа."""
    from db.database import get_questions
    cache_key = f"questions:{lang}"
    redis = request.app.state.redis

    try:
        cached = await redis.get(cache_key)
        if cached:
            return {"questions": json.loads(cached), "cached": True}
    except Exception as e:
        logger.warning(f"Redis questions cache read error: {e}")

    pool = request.app.state.pool
    questions = await get_questions(pool, lang=lang)

    try:
        await redis.setex(cache_key, 86400, json.dumps(questions))
    except Exception as e:
        logger.warning(f"Redis questions cache write error: {e}")

    return {"questions": questions}


@app.get("/api/results/{telegram_id}")
async def get_results(telegram_id: int, init_data: str, request: Request):
    """Возвращает последний результат пользователя."""
    user = validate_init_data(init_data)
    if not user or user.get("id") != telegram_id:
        raise HTTPException(status_code=403, detail="Invalid init data")

    pool = request.app.state.pool
    db_user = await get_user(pool, telegram_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await get_last_result(pool, db_user["id"])
    if not result:
        raise HTTPException(status_code=404, detail="No results yet")

    def parse(v):
        return json.loads(v) if isinstance(v, str) else v

    return {
        "normalized_scores": parse(result["normalized_scores"]),
        "riasec_profile":    parse(result["riasec_profile"]),
        "top_professions":   parse(result["top_professions"]),
        "completed_at":      result["completed_at"].isoformat() if result["completed_at"] else None,
    }


@app.post("/api/results/save")
async def save_results_from_miniapp(body: SaveResultRequest, request: Request):
    """Принимает ответы из Mini App, считает результаты и сохраняет."""
    user = validate_init_data(body.init_data)
    if not user:
        raise HTTPException(status_code=403, detail="Invalid init data")

    telegram_id = user["id"]
    pool = request.app.state.pool

    # Создаём пользователя если нет
    await create_user(
        pool,
        telegram_id=telegram_id,
        username=user.get("username", ""),
        full_name=f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
        lang=body.lang,
    )
    db_user = await get_user(pool, telegram_id)

    # Считаем
    raw, normalized = calculate_scores(body.answers)
    riasec = calculate_riasec(normalized)
    professions = await get_professions(pool, lang=body.lang)
    top = match_professions(normalized, riasec, professions)

    await save_result(pool, db_user["id"], raw, normalized, riasec, top)

    return {
        "normalized_scores": normalized,
        "riasec_profile":    riasec,
        "top_professions":   top,
    }


# ── Static files + SPA fallback ───────────────────────────────────────────────

DIST = Path(__file__).parent / "dist"

if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        index = DIST / "index.html"
        return FileResponse(index)
else:
    @app.get("/")
    async def dev_notice():
        return JSONResponse({"message": "Run `npm run build` in miniapp/ first"})
