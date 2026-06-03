"""
translate_content.py — одноразовый скрипт перевода контента БД.

Запуск:
    python translate_content.py

Что делает:
  1. Берёт все вопросы (question_text RU) → переводит → пишет _en/_hi/_es/_pt
  2. Берёт все профессии (title, description RU) → переводит
  3. Берёт все profession_details (reality, pros, cons) → переводит

Безопасность:
  - Пропускает записи, у которых _en уже заполнен (можно перезапускать)
  - Пакетная обработка по BATCH_SIZE записей
  - Пауза между запросами чтобы не упереться в rate limit
"""

import asyncio
import json
import logging
import os
import time

import asyncpg
import httpx

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Настройки ─────────────────────────────────────────────────────────────────
DB_CONFIG = {
    "host":     os.getenv("DB_HOST",     "localhost"),
    "port":     int(os.getenv("DB_PORT", "5432")),
    "database": os.getenv("DB_NAME",     "careercheck"),
    "user":     os.getenv("DB_USER",     "postgres"),
    "password": os.getenv("DB_PASSWORD", ""),
}

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL             = "claude-sonnet-4-20250514"
BATCH_SIZE        = 5    # записей за один вызов
PAUSE_SEC         = 0.5  # пауза между вызовами API

LANGS = ["en", "hi", "es", "pt"]
LANG_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "es": "Spanish",
    "pt": "Portuguese (Brazilian)",
}


# ── Claude API ────────────────────────────────────────────────────────────────

async def translate_batch(client: httpx.AsyncClient, texts: list[str], target_lang: str) -> list[str]:
    """
    Переводит список текстов на target_lang одним запросом.
    Возвращает список переводов в том же порядке.
    """
    numbered = "\n".join(f"{i+1}. {t}" for i, t in enumerate(texts))
    prompt = (
        f"Translate the following numbered Russian texts to {LANG_NAMES[target_lang]}.\n"
        f"Rules:\n"
        f"- Return ONLY a JSON array of strings, same order as input\n"
        f"- No explanations, no markdown, no extra text\n"
        f"- Keep professional/career tone\n"
        f"- For Hindi, use Devanagari script\n"
        f"- Preserve any special characters like % or numbers\n\n"
        f"Texts:\n{numbered}\n\n"
        f"Return: [\"translation1\", \"translation2\", ...]"
    )

    for attempt in range(3):
        try:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key":         ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type":      "application/json",
                },
                json={
                    "model":      MODEL,
                    "max_tokens": 4096,
                    "messages":   [{"role": "user", "content": prompt}],
                },
                timeout=60.0,
            )
            resp.raise_for_status()
            data = resp.json()
            raw  = data["content"][0]["text"].strip()

            # Убираем возможные markdown-блоки
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            raw = raw.strip()

            result = json.loads(raw)
            if isinstance(result, list) and len(result) == len(texts):
                return result

            logger.warning(f"Unexpected result length: {len(result)} vs {len(texts)}, retrying")

        except Exception as e:
            logger.error(f"API error (attempt {attempt+1}): {e}")
            if attempt < 2:
                await asyncio.sleep(2 ** attempt)

    # Фолбэк — возвращаем оригиналы чтобы не сломать БД
    logger.error(f"Translation failed for batch, returning originals")
    return texts


async def translate_json_list(client: httpx.AsyncClient, items: list[str], target_lang: str) -> list[str]:
    """Переводит список строк (pros/cons) как единицу."""
    if not items:
        return []
    return await translate_batch(client, items, target_lang)


# ── Вопросы ───────────────────────────────────────────────────────────────────

async def translate_questions(pool: asyncpg.Pool, client: httpx.AsyncClient):
    logger.info("=== Translating questions ===")

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, question_text FROM questions WHERE active = TRUE AND question_text_en IS NULL ORDER BY id"
        )

    if not rows:
        logger.info("Questions: all already translated, skipping")
        return

    logger.info(f"Questions to translate: {len(rows)}")

    for lang in LANGS:
        logger.info(f"  Language: {lang}")
        col = f"question_text_{lang}"

        # Обрабатываем батчами
        for start in range(0, len(rows), BATCH_SIZE):
            batch = rows[start:start + BATCH_SIZE]
            texts = [r["question_text"] for r in batch]
            ids   = [r["id"] for r in batch]

            translations = await translate_batch(client, texts, lang)
            await asyncio.sleep(PAUSE_SEC)

            async with pool.acquire() as conn:
                for row_id, translation in zip(ids, translations):
                    await conn.execute(
                        f"UPDATE questions SET {col} = $1 WHERE id = $2",
                        translation, row_id
                    )

            logger.info(f"    Translated questions {start+1}–{start+len(batch)}")

    logger.info("Questions: done ✓")


# ── Профессии ─────────────────────────────────────────────────────────────────

async def translate_professions(pool: asyncpg.Pool, client: httpx.AsyncClient):
    logger.info("=== Translating professions ===")

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, title, description FROM professions WHERE title_en IS NULL ORDER BY id"
        )

    if not rows:
        logger.info("Professions: all already translated, skipping")
        return

    logger.info(f"Professions to translate: {len(rows)}")

    for lang in LANGS:
        logger.info(f"  Language: {lang}")

        for start in range(0, len(rows), BATCH_SIZE):
            batch  = rows[start:start + BATCH_SIZE]
            ids    = [r["id"] for r in batch]

            titles = await translate_batch(client, [r["title"] for r in batch], lang)
            await asyncio.sleep(PAUSE_SEC)
            descs  = await translate_batch(client, [r["description"] for r in batch], lang)
            await asyncio.sleep(PAUSE_SEC)

            async with pool.acquire() as conn:
                for row_id, title, desc in zip(ids, titles, descs):
                    await conn.execute(
                        f"UPDATE professions SET title_{lang} = $1, description_{lang} = $2 WHERE id = $3",
                        title, desc, row_id
                    )

            logger.info(f"    Translated professions {start+1}–{start+len(batch)}")

    logger.info("Professions: done ✓")


# ── Детали профессий ──────────────────────────────────────────────────────────

async def translate_profession_details(pool: asyncpg.Pool, client: httpx.AsyncClient):
    logger.info("=== Translating profession_details ===")

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, reality, pros, cons FROM profession_details WHERE reality_en IS NULL ORDER BY id"
        )

    if not rows:
        logger.info("Details: all already translated, skipping")
        return

    logger.info(f"Details to translate: {len(rows)}")

    for lang in LANGS:
        logger.info(f"  Language: {lang}")

        for row in rows:
            row_id  = row["id"]
            reality = row["reality"] or ""

            pros_raw = row["pros"]
            cons_raw = row["cons"]
            if isinstance(pros_raw, str):
                pros_raw = json.loads(pros_raw)
            if isinstance(cons_raw, str):
                cons_raw = json.loads(cons_raw)
            pros = pros_raw or []
            cons = cons_raw or []

            # Переводим reality
            reality_tr = ""
            if reality:
                result = await translate_batch(client, [reality], lang)
                reality_tr = result[0]
                await asyncio.sleep(PAUSE_SEC)

            # Переводим pros и cons одним батчем
            pros_tr = await translate_json_list(client, pros, lang)
            await asyncio.sleep(PAUSE_SEC)
            cons_tr = await translate_json_list(client, cons, lang)
            await asyncio.sleep(PAUSE_SEC)

            async with pool.acquire() as conn:
                await conn.execute(
                    f"""UPDATE profession_details
                        SET reality_{lang} = $1,
                            pros_{lang}    = $2,
                            cons_{lang}    = $3
                        WHERE id = $4""",
                    reality_tr,
                    json.dumps(pros_tr,  ensure_ascii=False),
                    json.dumps(cons_tr,  ensure_ascii=False),
                    row_id,
                )

            logger.info(f"    Detail id={row_id} translated to {lang}")

    logger.info("Details: done ✓")


# ── Main ──────────────────────────────────────────────────────────────────────

async def main():
    if not ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY env variable is required")

    pool = await asyncpg.create_pool(**DB_CONFIG, min_size=2, max_size=5)
    logger.info("DB pool created")

    async with httpx.AsyncClient() as client:
        await translate_questions(pool, client)
        await translate_professions(pool, client)
        await translate_profession_details(pool, client)

    await pool.close()
    logger.info("=== All translations complete ✓ ===")


if __name__ == "__main__":
    asyncio.run(main())
