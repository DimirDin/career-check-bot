"""
ai_chat.py — AI-консультант карьеры (N4).

Использует claude-haiku (в 20× дешевле Sonnet).
Знает Big Five + RIASEC профиль пользователя из последнего теста.
3 бесплатных вопроса, затем Premium/Stars.
"""

import logging
import anthropic

from services.circuit_breaker import anthropic_breaker

logger = logging.getLogger(__name__)

CHAT_MODEL = "claude-3-5-haiku-20241022"
MAX_TOKENS = 450   # короткие конкретные ответы

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


def _build_system_prompt(normalized: dict, riasec: dict, top_professions: list, lang: str) -> str:
    rn  = RIASEC_NAMES.get(lang, RIASEC_NAMES["en"])
    tn  = TRAIT_NAMES.get(lang,  TRAIT_NAMES["en"])
    dom = max(riasec, key=riasec.get) if riasec else "I"

    bf  = " | ".join(f"{tn.get(k,k)}: {normalized.get(k,0)}%" for k in "OCEAS")
    dom_label = rn.get(dom, dom)
    profs = ", ".join(
        f"{p.get('title','?')} ({p.get('match',0)}%)"
        for p in (top_professions or [])[:3]
    )

    if lang == "ru":
        return (
            f"Ты — опытный карьерный консультант и психолог. "
            f"Отвечай ТОЛЬКО на русском языке.\n\n"
            f"Профиль пользователя (Big Five): {bf}\n"
            f"Доминирующий тип RIASEC: {dom_label} ({dom})\n"
            f"Топ профессии: {profs}\n\n"
            f"Отвечай конкретно, практично, коротко (2-4 предложения). "
            f"Используй профиль пользователя при каждом ответе. Будь поддерживающим."
        )
    else:
        return (
            f"You are an experienced career counselor and psychologist. "
            f"Reply ONLY in English.\n\n"
            f"User's Big Five profile: {bf}\n"
            f"Dominant RIASEC type: {dom_label} ({dom})\n"
            f"Top careers: {profs}\n\n"
            f"Be specific, practical, concise (2-4 sentences). "
            f"Reference the user's profile in each answer. Be supportive."
        )


async def ask_career_ai(
    question: str,
    history: list,          # [{"role":"user","content":"..."}, {"role":"assistant","content":"..."}]
    normalized: dict,
    riasec: dict,
    top_professions: list,
    lang: str,
    api_key: str,
) -> str | None:
    """Отправляет вопрос AI-консультанту. Возвращает ответ или None при ошибке."""

    if anthropic_breaker.is_open:
        logger.warning("AI chat skipped: circuit breaker OPEN")
        return None

    system = _build_system_prompt(normalized, riasec, top_professions, lang)
    messages = list(history) + [{"role": "user", "content": question}]

    try:
        client = anthropic.AsyncAnthropic(api_key=api_key, max_retries=2, timeout=30.0)
        msg    = await client.messages.create(
            model=CHAT_MODEL,
            max_tokens=MAX_TOKENS,
            system=system,
            messages=messages,
        )
        reply = msg.content[0].text.strip()
        anthropic_breaker.record_success()
        logger.info(f"AI chat OK, tokens={msg.usage.output_tokens}, lang={lang}")
        return reply
    except anthropic.APIError as e:
        anthropic_breaker.record_failure()
        logger.error(f"AI chat API error {e.status_code}: {e.message}")
        return None
    except Exception as e:
        anthropic_breaker.record_failure()
        logger.error(f"AI chat error: {e}")
        return None
