"""
ai_analyst.py — генерирует AI-контент для Premium PDF через Anthropic SDK.
"""

import json
import logging
import anthropic
from typing import Optional

from services.circuit_breaker import anthropic_breaker

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-20250514"

RIASEC_LABELS_ALL = {
    "ru": {"R":"Реалистичный","I":"Исследовательский","A":"Артистичный","S":"Социальный","E":"Предприимчивый","C":"Конвенциональный"},
    "en": {"R":"Realistic","I":"Investigative","A":"Artistic","S":"Social","E":"Enterprising","C":"Conventional"},
    "hi": {"R":"व्यावहारिक","I":"अन्वेषक","A":"कलात्मक","S":"सामाजिक","E":"उद्यमशील","C":"परंपरागत"},
    "es": {"R":"Realista","I":"Investigador","A":"Artístico","S":"Social","E":"Emprendedor","C":"Convencional"},
    "pt": {"R":"Realista","I":"Investigativo","A":"Artístico","S":"Social","E":"Empreendedor","C":"Convencional"},
}

TRAIT_LABELS_ALL = {
    "ru": {"O":"Открытость к опыту","C":"Сознательность","E":"Экстраверсия","A":"Доброжелательность","S":"Эмоц. стабильность"},
    "en": {"O":"Openness","C":"Conscientiousness","E":"Extraversion","A":"Agreeableness","S":"Emotional Stability"},
    "hi": {"O":"खुलापन","C":"कर्तव्यनिष्ठा","E":"बहिर्मुखता","A":"सहमतता","S":"भावनात्मक स्थिरता"},
    "es": {"O":"Apertura","C":"Responsabilidad","E":"Extraversión","A":"Amabilidad","S":"Estabilidad emocional"},
    "pt": {"O":"Abertura","C":"Conscienciosidade","E":"Extroversão","A":"Amabilidade","S":"Estabilidade emocional"},
}

LANG_INST = {
    "ru": "Отвечай строго на русском языке.",
    "en": "Reply strictly in English.",
    "hi": "केवल हिंदी में उत्तर दें।",
    "es": "Responde estrictamente en español.",
    "pt": "Responda estritamente em português.",
}


def _build_prompt(name, normalized, riasec, top_professions, details_list, lang):
    rl  = RIASEC_LABELS_ALL.get(lang, RIASEC_LABELS_ALL["en"])
    tl  = TRAIT_LABELS_ALL.get(lang, TRAIT_LABELS_ALL["en"])
    li  = LANG_INST.get(lang, LANG_INST["en"])
    dom = max(riasec, key=riasec.get)
    top_t = max(normalized, key=normalized.get)
    low_t = min(normalized, key=normalized.get)
    riasec_rank = sorted(riasec.items(), key=lambda x: -x[1])

    profs = ""
    for i, prof in enumerate(top_professions[:3]):
        det = details_list[i] if i < len(details_list) else {}
        pros = "; ".join((det.get("pros") or [])[:3])
        cons = "; ".join((det.get("cons") or [])[:3])
        real = det.get("reality") or det.get("description") or prof.get("description","")
        profs += f"\n  {i+1}. {prof['title']} — {prof['match']}%, тип {rl.get(prof['riasec'],prof['riasec'])}\n     {real}\n     + {pros}\n     - {cons}\n     Перспективность: {prof.get('growth','')}"

    return f"""{li}

Ты — опытный карьерный психолог и коуч. Результаты научного теста пользователя:

Имя: {name}
Big Five: O={normalized.get('O')}% C={normalized.get('C')}% E={normalized.get('E')}% A={normalized.get('A')}% S={normalized.get('S')}%
Сильнейшая черта: {tl.get(top_t)} ({normalized.get(top_t)}%)
Зона роста: {tl.get(low_t)} ({normalized.get(low_t)}%)
RIASEC доминант: {rl.get(dom)} ({dom}) — {riasec.get(dom)} баллов
Полный RIASEC: {', '.join(f"{rl.get(k,k)}: {v}" for k,v in riasec_rank)}
Топ-3 профессии:{profs}

Создай детальный отчёт. Отвечай ТОЛЬКО валидным JSON без markdown:

{{"personality_portrait":"4-5 предложений. Яркий психологический портрет с конкретными цифрами. Без шаблонов — только про этот уникальный профиль.","superpower":"3-4 предложения. Главная суперсила этого сочетания черт. Что этот человек делает лучше 90% людей.","shadow_side":"3 предложения. Паттерны поведения которые могут мешать карьере. Честно, с заботой.","career_vision_5y":"4-5 предложений. Где этот человек может быть через 5 лет. Конкретное и мотивирующее.","career_vision_10y":"3-4 предложения. Долгосрочный потенциал через 10 лет. Какой вклад в своей сфере.","ideal_work_environment":"3-4 предложения. Идеальная рабочая среда — команда, культура, формат, стиль управления.","communication_style":"3 предложения. Как этот человек взаимодействует с людьми. Сильные стороны и зоны роста.","stress_and_burnout":"3-4 предложения. Что вызывает стресс, признаки выгорания, как восстанавливаться.","top1_why_perfect":"5-6 предложений. Почему первая профессия идеальна для этого профиля. Детальная связь черт с требованиями.","top1_day_in_life":"4-5 предложений. Типичный рабочий день в этой профессии. Что будет приносить удовольствие.","top1_roadmap":["Шаг 1 — конкретное действие с временными рамками","Шаг 2","Шаг 3","Шаг 4","Шаг 5 — результат"],"top1_hard_skills":["навык 1","навык 2","навык 3","навык 4"],"top1_soft_skills":["мягкий навык 1","навык 2","навык 3"],"top1_resources":["Конкретный курс/книга с автором или платформой","Ресурс 2","Ресурс 3","Сообщество или конференция"],"top2_brief":"2-3 предложения про вторую профессию — почему подходит и чем отличается.","top3_brief":"2-3 предложения про третью профессию — неожиданный но логичный выбор.","salary_trajectory":"3 предложения. Реалистичная зарплатная траектория джун→мид→сеньор с диапазонами.","networking_advice":"3 предложения. Как строить профессиональные связи с учётом профиля.","red_flags":["флаг 1 — компании/вакансии которых избегать","флаг 2","флаг 3"],"action_today":"2-3 предложения. Одно конкретное действие СЕГОДНЯ. Максимально конкретно.","personal_message":"3-4 предложения. Личное послание от коуча. Тёплое, упомяни имя {name}."}}

Каждый пункт уникален для ЭТОГО профиля. Используй числа. Только JSON."""


async def generate_ai_analysis(
    name: str,
    normalized: dict,
    riasec: dict,
    top_professions: list,
    details_list: list,
    lang: str,
    api_key: str,
    timeout: float = 60.0,
) -> Optional[dict]:
    # B10: circuit breaker — при OPEN сразу возвращаем None (graceful degradation)
    if anthropic_breaker.is_open:
        logger.warning(f"AI analysis skipped: circuit breaker OPEN (stats={anthropic_breaker.stats()})")
        return None

    prompt = _build_prompt(name, normalized, riasec, top_professions, details_list, lang)
    try:
        client = anthropic.AsyncAnthropic(
            api_key=api_key,
            max_retries=3,
            timeout=timeout,
        )
        message = await client.messages.create(
            model=MODEL,
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        result = json.loads(raw)
        anthropic_breaker.record_success()
        logger.info(f"AI analysis OK: '{name}', lang={lang}, tokens={message.usage.output_tokens}")
        return result
    except json.JSONDecodeError as e:
        logger.error(f"AI JSON parse error: {e}")
        return None
    except anthropic.APIError as e:
        anthropic_breaker.record_failure()
        logger.error(f"Anthropic API error {e.status_code}: {e.message}")
        return None
    except Exception as e:
        anthropic_breaker.record_failure()
        logger.error(f"AI analysis error: {e}")
        return None
