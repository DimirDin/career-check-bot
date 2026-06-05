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
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncpg

# Подключаем существующие модули бота
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from config.settings import BOT_TOKEN, DB_CONFIG
from db.database import get_last_result, save_result, create_user, get_user
from services.calculator import calculate_scores, calculate_riasec, match_professions
from db.database import get_professions

logger = logging.getLogger(__name__)

app = FastAPI(title="CareerCheck Mini App", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DB pool ────────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    app.state.pool = await asyncpg.create_pool(**DB_CONFIG, min_size=2, max_size=10)
    logger.info("Mini App: DB pool created")

@app.on_event("shutdown")
async def shutdown():
    await app.state.pool.close()


# ── Telegram Init Data Validation ─────────────────────────────────────────────

def validate_init_data(init_data: str) -> dict | None:
    """
    Проверяет подпись initData от Telegram WebApp.
    Возвращает dict с данными пользователя или None если подпись невалидна.
    """
    try:
        params = dict(p.split("=", 1) for p in init_data.split("&") if "=" in p)
        check_string = "\n".join(
            f"{k}={params[k]}" for k in sorted(params) if k != "hash"
        )
        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        expected = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()

        if not hmac.compare_digest(expected, params.get("hash", "")):
            return None

        user_json = params.get("user", "{}")
        from urllib.parse import unquote
        return json.loads(unquote(user_json))
    except Exception as e:
        logger.warning(f"initData validation error: {e}")
        return None


# ── API ────────────────────────────────────────────────────────────────────────

class SaveResultRequest(BaseModel):
    init_data: str
    answers: list
    lang: str = "ru"


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/questions")
async def get_questions_endpoint(lang: str = "ru", request: Request = None):
    """Возвращает все активные вопросы для Mini App."""
    from db.database import get_questions
    pool = request.app.state.pool
    questions = await get_questions(pool, lang=lang)
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
