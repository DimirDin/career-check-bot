"""
ai_chat.py — AI-консультант карьеры (N4).

Использует claude-haiku (в 20× дешевле Sonnet).
Знает Big Five + RIASEC профиль пользователя из последнего теста.
3 бесплатных вопроса, затем Premium/Stars.
"""

import logging
import anthropic

from services.circuit_breaker import anthropic_breaker
from config.settings import CLAUDE_CHAT_MODEL as CHAT_MODEL

logger = logging.getLogger(__name__)

MAX_TOKENS      = 450   # короткие конкретные ответы
MAX_HISTORY_PAIRS = 6   # максимум 6 пар user/assistant в контексте

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
    """Оставляем последние MAX_HISTORY_PAIRS пар user/assistant."""
    if len(history) <= MAX_HISTORY_PAIRS * 2:
        return history
    trimmed = history[-(MAX_HISTORY_PAIRS * 2):]
    # Убеждаемся что начинается с role=user
    while trimmed and trimmed[0]["role"] != "user":
        trimmed = trimmed[1:]
    return trimmed


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

    system   = _build_system_prompt(normalized, riasec, top_professions, lang)
    messages = _trim_history(list(history)) + [{"role": "user", "content": question}]

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


async def generate_daily_advice(
    normalized: dict,
    riasec: dict,
    lang: str,
    api_key: str,
) -> str | None:
    """Один персонализированный карьерный совет на сегодня."""
    if anthropic_breaker.is_open:
        return None

    li = {"ru": "Отвечай строго на русском.", "en": "Reply strictly in English."}.get(lang, "Reply in English.")
    dom = max(riasec, key=riasec.get) if riasec else "I"
    top_trait = max(normalized, key=normalized.get) if normalized else "O"
    low_trait = min(normalized, key=normalized.get) if normalized else "S"

    prompt = f"""{li}

Пользователь: Big Five профиль: O={normalized.get('O',50)}% C={normalized.get('C',50)}% E={normalized.get('E',50)}% A={normalized.get('A',50)}% S={normalized.get('S',50)}%
Доминирующий RIASEC: {dom}
Сильная черта: {top_trait} ({normalized.get(top_trait,50)}%)
Зона роста: {low_trait} ({normalized.get(low_trait,50)}%)

Дай ОДИН конкретный карьерный совет на сегодня. Максимум 2-3 предложения.
Совет должен быть специфичен для этого профиля — не общий. Упоминай конкретные действия.
Начни сразу с совета без вступления."""

    try:
        import anthropic as _anthropic
        client = _anthropic.AsyncAnthropic(api_key=api_key, timeout=20.0)
        msg = await client.messages.create(
            model=CHAT_MODEL,
            max_tokens=150,
            messages=[{"role": "user", "content": prompt}],
        )
        anthropic_breaker.record_success()
        return msg.content[0].text.strip()
    except Exception as e:
        anthropic_breaker.record_failure()
        logger.error(f"Daily advice error: {e}")
        return None


async def generate_interview_prep(
    profession: str,
    normalized: dict,
    lang: str,
    api_key: str,
) -> str | None:
    """Топ-5 вопросов и персональный совет для собеседования."""
    if anthropic_breaker.is_open:
        return None

    li = {"ru": "Отвечай строго на русском.", "en": "Reply strictly in English."}.get(lang, "Reply in English.")
    has_profile = bool(normalized)
    profile_ctx = ""
    if has_profile:
        profile_ctx = f"\nПрофиль пользователя (Big Five): O={normalized.get('O',50)}% C={normalized.get('C',50)}% E={normalized.get('E',50)}% A={normalized.get('A',50)}% S={normalized.get('S',50)}%"

    prompt = f"""{li}

Профессия: {profession}{profile_ctx}

Дай подготовку к собеседованию в формате:

<b>Топ-5 вопросов для {profession}:</b>
1. ...
2. ...
3. ...
4. ...
5. ...

<b>{'Персональный совет' if has_profile else 'Совет'}:</b>
[2-3 предложения]

Будь конкретным. Только практичное."""

    try:
        import anthropic as _anthropic
        client = _anthropic.AsyncAnthropic(api_key=api_key, timeout=30.0)
        msg = await client.messages.create(
            model=CHAT_MODEL,
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        anthropic_breaker.record_success()
        return msg.content[0].text.strip()
    except Exception as e:
        anthropic_breaker.record_failure()
        logger.error(f"Interview prep error: {e}")
        return None


async def generate_journal_summary(entries: str, lang: str, api_key: str) -> str | None:
    """Краткая AI-сводка карьерных записей пользователя."""
    if anthropic_breaker.is_open:
        return None

    li = {"ru": "Отвечай строго на русском.", "en": "Reply strictly in English."}.get(lang, "Reply in English.")
    prompt = f"""{li}

Пользователь вёл карьерный дневник. Вот его записи за последние 30 дней:

{entries}

Напиши краткую (3-4 предложения) психологическую сводку: какие паттерны ты видишь в его карьерных размышлениях? Что его мотивирует? Какой главный инсайт из этих записей? Тон — поддерживающий, конкретный."""

    try:
        import anthropic as _anthropic
        client = _anthropic.AsyncAnthropic(api_key=api_key, timeout=30.0)
        msg = await client.messages.create(
            model=CHAT_MODEL,
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        anthropic_breaker.record_success()
        return msg.content[0].text.strip()
    except Exception as e:
        anthropic_breaker.record_failure()
        logger.error(f"Journal summary error: {e}")
        return None
