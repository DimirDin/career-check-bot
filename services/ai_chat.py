"""
ai_chat.py — AI-консультант карьеры через Promptra (Haiku).

Отдельный токен PROMPTRA_CHAT_API_KEY, модель claude-haiku-4-5.
Короткие ответы, персонализация по профилю.
"""

import logging
from openai import AsyncOpenAI

from services.circuit_breaker import promptra_breaker
from config.settings import PROMPTRA_CHAT_API_KEY, PROMPTRA_API_KEY, PROMPTRA_BASE_URL, PROMPTRA_CHAT_MODEL

logger = logging.getLogger(__name__)

MAX_TOKENS        = 350   # жёсткий лимит — короткие конкретные ответы
MAX_INPUT_CHARS   = 400   # максимум символов от пользователя
MAX_HISTORY_PAIRS = 5     # последние 5 пар user/assistant в контексте

RIASEC_NAMES = {
    "ru": {"R":"Реалистичный","I":"Исследовательский","A":"Артистичный",
           "S":"Социальный","E":"Предприимчивый","C":"Конвенциональный"},
    "en": {"R":"Realistic","I":"Investigative","A":"Artistic",
           "S":"Social","E":"Enterprising","C":"Conventional"},
}
TRAIT_NAMES = {
    "ru": {"O":"Открытость","C":"Сознательность","E":"Экстраверсия",
           "A":"Доброжелательность","S":"Стабильность"},
    "en": {"O":"Openness","C":"Conscientiousness","E":"Extraversion",
           "A":"Agreeableness","S":"Stability"},
}


def _trim_history(history: list) -> list:
    if len(history) <= MAX_HISTORY_PAIRS * 2:
        return history
    trimmed = history[-(MAX_HISTORY_PAIRS * 2):]
    while trimmed and trimmed[0]["role"] != "user":
        trimmed = trimmed[1:]
    return trimmed


def _build_system_prompt(normalized: dict, riasec: dict, top_professions: list, lang: str) -> str:
    rn  = RIASEC_NAMES.get(lang, RIASEC_NAMES["en"])
    tn  = TRAIT_NAMES.get(lang,  TRAIT_NAMES["en"])
    dom = max(riasec, key=riasec.get) if riasec else "I"

    bf    = " | ".join(f"{tn.get(k,k)}: {normalized.get(k,0)}%" for k in "OCEAS")
    profs = ", ".join(
        f"{p.get('title','?')} ({p.get('match',0)}%)"
        for p in (top_professions or [])[:3]
    )

    if lang == "ru":
        return (
            f"Ты — карьерный консультант. Отвечай ТОЛЬКО на русском языке. "
            f"Максимум 3 предложения. Без списков и заголовков — только короткий текст.\n\n"
            f"Профиль пользователя:\n"
            f"Big Five: {bf}\n"
            f"RIASEC-доминант: {rn.get(dom, dom)} ({dom})\n"
            f"Топ профессии: {profs}\n\n"
            f"Правила: конкретно, практично, с учётом профиля. Не повторяй профиль в ответе."
        )
    else:
        return (
            f"You are a career coach. Reply ONLY in English. "
            f"Maximum 3 sentences. No lists or headers — plain short text.\n\n"
            f"User profile:\n"
            f"Big Five: {bf}\n"
            f"RIASEC dominant: {rn.get(dom, dom)} ({dom})\n"
            f"Top careers: {profs}\n\n"
            f"Rules: specific, practical, reference the profile. Don't repeat the profile in your reply."
        )


async def ask_career_ai(
    question: str,
    history: list,
    normalized: dict,
    riasec: dict,
    top_professions: list,
    lang: str,
    api_key: str = "",   # оставлен для обратной совместимости, используем PROMPTRA_CHAT_API_KEY
) -> str | None:
    if promptra_breaker.is_open:
        logger.warning("AI chat skipped: circuit breaker OPEN")
        return None

    key = PROMPTRA_CHAT_API_KEY or PROMPTRA_API_KEY or api_key
    if not key:
        logger.error("PROMPTRA_CHAT_API_KEY not set")
        return None

    # Обрезаем вопрос на сервере тоже
    question = question[:MAX_INPUT_CHARS]

    system   = _build_system_prompt(normalized, riasec, top_professions, lang)
    messages = _trim_history(list(history)) + [{"role": "user", "content": question}]

    try:
        client = AsyncOpenAI(
            api_key=key,
            base_url=PROMPTRA_BASE_URL,
            timeout=25.0,
            max_retries=1,
        )
        response = await client.chat.completions.create(
            model=PROMPTRA_CHAT_MODEL,
            messages=[{"role": "system", "content": system}] + messages,
            max_tokens=MAX_TOKENS,
            temperature=0.6,
        )
        reply = response.choices[0].message.content.strip()
        promptra_breaker.record_success()
        tokens = response.usage.total_tokens if response.usage else "?"
        logger.info(f"AI chat OK via Promptra, tokens={tokens}, model={PROMPTRA_CHAT_MODEL}")
        return reply
    except Exception as e:
        promptra_breaker.record_failure()
        logger.error(f"AI chat error: {e}")
        return None
