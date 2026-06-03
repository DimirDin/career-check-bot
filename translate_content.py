"""
translate_content.py — одноразовый скрипт перевода контента БД.
Использует Google Translate через deep-translator (бесплатно, без API ключа).

Установка зависимости:
    pip install deep-translator asyncpg

Запуск:
    python translate_content.py

    или с явными параметрами БД:
    DB_HOST=localhost DB_NAME=career_db DB_USER=career_user DB_PASSWORD=career_pass python translate_content.py

Что делает:
  1. Вопросы (question_text RU) → EN / HI / ES / PT
  2. Профессии (title, description RU) → EN / HI / ES / PT
  3. Детали профессий (reality, pros, cons) → EN / HI / ES / PT

Безопасно:
  - Пропускает записи где _en уже заполнен (можно перезапускать)
  - Пауза 0.3с между запросами чтобы не получить бан от Google
  - Фолбэк на оригинал при ошибке перевода
"""

import asyncio
import json
import logging
import os
import time

import asyncpg
from deep_translator import GoogleTranslator

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Настройки БД ──────────────────────────────────────────────────────────────
DB_CONFIG = {
    "host":     os.getenv("DB_HOST",     "localhost"),
    "port":     int(os.getenv("DB_PORT", "5432")),
    "database": os.getenv("DB_NAME",     "career_db"),
    "user":     os.getenv("DB_USER",     "career_user"),
    "password": os.getenv("DB_PASSWORD", "career_pass"),
}

LANGS = ["en", "hi", "es", "pt"]

# Коды языков для Google Translate
GT_CODES = {
    "en": "en",
    "hi": "hi",
    "es": "es",
    "pt": "pt",
}

PAUSE_SEC = 0.3   # пауза между запросами к Google


# ── Перевод ───────────────────────────────────────────────────────────────────

def translate_text(text: str, target_lang: str) -> str:
    """Переводит одну строку. Фолбэк на оригинал при ошибке."""
    if not text or not text.strip():
        return text
    try:
        translator = GoogleTranslator(source="ru", target=GT_CODES[target_lang])
        result = translator.translate(text)
        return result or text
    except Exception as e:
        logger.warning(f"translate_text failed ({target_lang}): {e}")
        return text


def translate_list(items: list[str], target_lang: str) -> list[str]:
    """Переводит список строк (pros/cons)."""
    result = []
    for item in items:
        result.append(translate_text(item, target_lang))
        time.sleep(PAUSE_SEC)
    return result


# ── Вопросы ───────────────────────────────────────────────────────────────────

async def translate_questions(pool: asyncpg.Pool):
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

        for i, row in enumerate(rows):
            translation = translate_text(row["question_text"], lang)
            time.sleep(PAUSE_SEC)

            async with pool.acquire() as conn:
                await conn.execute(
                    f"UPDATE questions SET {col} = $1 WHERE id = $2",
                    translation, row["id"]
                )

            if (i + 1) % 10 == 0:
                logger.info(f"    {i+1}/{len(rows)} questions translated to {lang}")

        logger.info(f"  {lang}: done ({len(rows)} questions)")

    logger.info("Questions: done ✓")


# ── Профессии ─────────────────────────────────────────────────────────────────

async def translate_professions(pool: asyncpg.Pool):
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

        for i, row in enumerate(rows):
            title_tr = translate_text(row["title"], lang)
            time.sleep(PAUSE_SEC)
            desc_tr  = translate_text(row["description"], lang)
            time.sleep(PAUSE_SEC)

            async with pool.acquire() as conn:
                await conn.execute(
                    f"UPDATE professions SET title_{lang} = $1, description_{lang} = $2 WHERE id = $3",
                    title_tr, desc_tr, row["id"]
                )

            logger.info(f"    [{i+1}/{len(rows)}] {row['title']} → {lang}")

    logger.info("Professions: done ✓")


# ── Детали профессий ──────────────────────────────────────────────────────────

async def translate_profession_details(pool: asyncpg.Pool):
    logger.info("=== Translating profession_details ===")

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT profession_id, reality, pros, cons FROM profession_details WHERE reality_en IS NULL ORDER BY profession_id"
        )

    if not rows:
        logger.info("Details: all already translated, skipping")
        return

    logger.info(f"Details to translate: {len(rows)}")

    for lang in LANGS:
        logger.info(f"  Language: {lang}")

        for i, row in enumerate(rows):
            # reality
            reality_tr = translate_text(row["reality"] or "", lang)
            if row["reality"]:
                time.sleep(PAUSE_SEC)

            # pros
            pros_raw = row["pros"]
            if isinstance(pros_raw, str):
                pros_raw = json.loads(pros_raw)
            pros_tr = translate_list(pros_raw or [], lang)

            # cons
            cons_raw = row["cons"]
            if isinstance(cons_raw, str):
                cons_raw = json.loads(cons_raw)
            cons_tr = translate_list(cons_raw or [], lang)

            async with pool.acquire() as conn:
                await conn.execute(
                    f"""UPDATE profession_details
                        SET reality_{lang} = $1,
                            pros_{lang}    = $2,
                            cons_{lang}    = $3
                        WHERE profession_id = $4""",
                    reality_tr,
                    json.dumps(pros_tr,  ensure_ascii=False),
                    json.dumps(cons_tr,  ensure_ascii=False),
                    row["profession_id"],
                )

            logger.info(f"    [{i+1}/{len(rows)}] detail profession_id={row['profession_id']} → {lang}")

    logger.info("Details: done ✓")


# ── Main ──────────────────────────────────────────────────────────────────────

async def main():
    logger.info(f"Connecting to DB: {DB_CONFIG['host']}/{DB_CONFIG['database']}")
    pool = await asyncpg.create_pool(**DB_CONFIG, min_size=2, max_size=5)
    logger.info("DB connected ✓")

    await translate_questions(pool)
    await translate_professions(pool)
    await translate_profession_details(pool)

    await pool.close()
    logger.info("=== All translations complete ✓ ===")


if __name__ == "__main__":
    asyncio.run(main())
