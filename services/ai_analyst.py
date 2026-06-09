"""
ai_analyst.py — генерирует AI-контент для Premium PDF через Anthropic SDK.
"""

import json
import logging
import anthropic
from typing import Optional

from services.circuit_breaker import anthropic_breaker
from config.settings import CLAUDE_PREMIUM_MODEL as MODEL

logger = logging.getLogger(__name__)

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

# Описания JSON-полей для промпта — на языке пользователя
FIELD_DESCRIPTIONS = {
    "ru": '{"personality_portrait":"4-5 предложений. Яркий психологический портрет с конкретными цифрами. Без шаблонов — только про этот уникальный профиль.","superpower":"3-4 предложения. Главная суперсила этого сочетания черт. Что этот человек делает лучше 90% людей.","shadow_side":"3 предложения. Паттерны поведения которые могут мешать карьере. Честно, с заботой.","career_vision_5y":"4-5 предложений. Где этот человек может быть через 5 лет. Конкретное и мотивирующее.","career_vision_10y":"3-4 предложения. Долгосрочный потенциал через 10 лет. Какой вклад в своей сфере.","ideal_work_environment":"3-4 предложения. Идеальная рабочая среда — команда, культура, формат, стиль управления.","communication_style":"3 предложения. Как этот человек взаимодействует с людьми. Сильные стороны и зоны роста.","stress_and_burnout":"3-4 предложения. Что вызывает стресс, признаки выгорания, как восстанавливаться.","top1_why_perfect":"5-6 предложений. Почему первая профессия идеальна для этого профиля. Детальная связь черт с требованиями.","top1_day_in_life":"4-5 предложений. Типичный рабочий день в этой профессии. Что будет приносить удовольствие.","top1_roadmap":["Шаг 1 — конкретное действие с временными рамками","Шаг 2","Шаг 3","Шаг 4","Шаг 5 — результат"],"top1_hard_skills":["навык 1","навык 2","навык 3","навык 4"],"top1_soft_skills":["мягкий навык 1","навык 2","навык 3"],"top1_resources":["Конкретный курс/книга с автором или платформой","Ресурс 2","Ресурс 3","Сообщество или конференция"],"top2_brief":"2-3 предложения про вторую профессию — почему подходит и чем отличается.","top3_brief":"2-3 предложения про третью профессию — неожиданный но логичный выбор.","salary_trajectory":"3 предложения. Реалистичная зарплатная траектория джун→мид→сеньор с диапазонами.","networking_advice":"3 предложения. Как строить профессиональные связи с учётом профиля.","red_flags":["флаг 1 — компании/вакансии которых избегать","флаг 2","флаг 3"],"action_today":"2-3 предложения. Одно конкретное действие СЕГОДНЯ. Максимально конкретно.","personal_message":"3-4 предложения. Личное послание от коуча. Тёплое, упомяни имя {name}."}',

    "en": '{"personality_portrait":"4-5 sentences. Vivid psychological portrait with specific numbers. No templates — only about this unique profile.","superpower":"3-4 sentences. The main superpower of this trait combination. What this person does better than 90% of people.","shadow_side":"3 sentences. Behavioral patterns that may hinder career growth. Honest, with care.","career_vision_5y":"4-5 sentences. Where this person can be in 5 years. Specific and motivating.","career_vision_10y":"3-4 sentences. Long-term potential in 10 years. What contribution in their field.","ideal_work_environment":"3-4 sentences. Ideal work environment — team, culture, format, management style.","communication_style":"3 sentences. How this person interacts with people. Strengths and growth areas.","stress_and_burnout":"3-4 sentences. What causes stress, burnout signs, how to recover.","top1_why_perfect":"5-6 sentences. Why the first profession is ideal for this profile. Detailed link between traits and requirements.","top1_day_in_life":"4-5 sentences. Typical work day in this profession. What will bring joy.","top1_roadmap":["Step 1 — specific action with timeline","Step 2","Step 3","Step 4","Step 5 — result"],"top1_hard_skills":["skill 1","skill 2","skill 3","skill 4"],"top1_soft_skills":["soft skill 1","skill 2","skill 3"],"top1_resources":["Specific course/book with author or platform","Resource 2","Resource 3","Community or conference"],"top2_brief":"2-3 sentences about the second profession — why it fits and how it differs.","top3_brief":"2-3 sentences about the third profession — unexpected but logical choice.","salary_trajectory":"3 sentences. Realistic salary trajectory junior→mid→senior with ranges.","networking_advice":"3 sentences. How to build professional connections given this profile.","red_flags":["flag 1 — companies/vacancies to avoid","flag 2","flag 3"],"action_today":"2-3 sentences. One specific action TODAY. As concrete as possible.","personal_message":"3-4 sentences. Personal message from the coach. Warm, mention the name {name}."}',

    "es": '{"personality_portrait":"4-5 oraciones. Retrato psicológico vívido con números específicos. Sin plantillas — solo sobre este perfil único.","superpower":"3-4 oraciones. La principal superpotencia de esta combinación de rasgos. Lo que esta persona hace mejor que el 90% de las personas.","shadow_side":"3 oraciones. Patrones de comportamiento que pueden obstaculizar la carrera. Honesto, con cuidado.","career_vision_5y":"4-5 oraciones. Dónde puede estar esta persona en 5 años. Específico y motivador.","career_vision_10y":"3-4 oraciones. Potencial a largo plazo en 10 años. Qué contribución en su campo.","ideal_work_environment":"3-4 oraciones. Entorno de trabajo ideal — equipo, cultura, formato, estilo de gestión.","communication_style":"3 oraciones. Cómo interactúa esta persona con la gente. Fortalezas y áreas de crecimiento.","stress_and_burnout":"3-4 oraciones. Qué causa estrés, señales de agotamiento, cómo recuperarse.","top1_why_perfect":"5-6 oraciones. Por qué la primera profesión es ideal para este perfil. Enlace detallado entre rasgos y requisitos.","top1_day_in_life":"4-5 oraciones. Día de trabajo típico en esta profesión. Qué traerá alegría.","top1_roadmap":["Paso 1 — acción específica con cronograma","Paso 2","Paso 3","Paso 4","Paso 5 — resultado"],"top1_hard_skills":["habilidad 1","habilidad 2","habilidad 3","habilidad 4"],"top1_soft_skills":["habilidad blanda 1","habilidad 2","habilidad 3"],"top1_resources":["Curso/libro específico con autor o plataforma","Recurso 2","Recurso 3","Comunidad o conferencia"],"top2_brief":"2-3 oraciones sobre la segunda profesión — por qué encaja y en qué difiere.","top3_brief":"2-3 oraciones sobre la tercera profesión — elección inesperada pero lógica.","salary_trajectory":"3 oraciones. Trayectoria salarial realista junior→mid→senior con rangos.","networking_advice":"3 oraciones. Cómo construir conexiones profesionales dado este perfil.","red_flags":["bandera 1 — empresas/vacantes a evitar","bandera 2","bandera 3"],"action_today":"2-3 oraciones. Una acción específica HOY. Lo más concreto posible.","personal_message":"3-4 oraciones. Mensaje personal del coach. Cálido, menciona el nombre {name}."}',

    "pt": '{"personality_portrait":"4-5 frases. Retrato psicológico vívido com números específicos. Sem modelos — apenas sobre este perfil único.","superpower":"3-4 frases. O principal superpoder desta combinação de traços. O que esta pessoa faz melhor que 90% das pessoas.","shadow_side":"3 frases. Padrões de comportamento que podem dificultar a carreira. Honesto, com cuidado.","career_vision_5y":"4-5 frases. Onde esta pessoa pode estar em 5 anos. Específico e motivador.","career_vision_10y":"3-4 frases. Potencial de longo prazo em 10 anos. Qual contribuição em seu campo.","ideal_work_environment":"3-4 frases. Ambiente de trabalho ideal — equipe, cultura, formato, estilo de gestão.","communication_style":"3 frases. Como esta pessoa interage com as pessoas. Pontos fortes e áreas de crescimento.","stress_and_burnout":"3-4 frases. O que causa estresse, sinais de esgotamento, como se recuperar.","top1_why_perfect":"5-6 frases. Por que a primeira profissão é ideal para este perfil. Ligação detalhada entre traços e requisitos.","top1_day_in_life":"4-5 frases. Dia de trabalho típico nesta profissão. O que trará alegria.","top1_roadmap":["Passo 1 — ação específica com cronograma","Passo 2","Passo 3","Passo 4","Passo 5 — resultado"],"top1_hard_skills":["habilidade 1","habilidade 2","habilidade 3","habilidade 4"],"top1_soft_skills":["habilidade suave 1","habilidade 2","habilidade 3"],"top1_resources":["Curso/livro específico com autor ou plataforma","Recurso 2","Recurso 3","Comunidade ou conferência"],"top2_brief":"2-3 frases sobre a segunda profissão — por que se encaixa e como difere.","top3_brief":"2-3 frases sobre a terceira profissão — escolha inesperada mas lógica.","salary_trajectory":"3 frases. Trajetória salarial realista júnior→pleno→sênior com faixas.","networking_advice":"3 frases. Como construir conexões profissionais dado este perfil.","red_flags":["sinal 1 — empresas/vagas a evitar","sinal 2","sinal 3"],"action_today":"2-3 frases. Uma ação específica HOJE. O mais concreto possível.","personal_message":"3-4 frases. Mensagem pessoal do coach. Caloroso, mencione o nome {name}."}',

    "hi": '{"personality_portrait":"4-5 वाक्य। विशिष्ट संख्याओं के साथ जीवंत मनोवैज्ञानिक चित्र। कोई टेम्पलेट नहीं — केवल इस अनूठे प्रोफ़ाइल के बारे में।","superpower":"3-4 वाक्य। इस लक्षण संयोजन की मुख्य महाशक्ति। यह व्यक्ति 90% लोगों से बेहतर क्या करता है।","shadow_side":"3 वाक्य। व्यवहार पैटर्न जो करियर को बाधित कर सकते हैं। ईमानदार, देखभाल के साथ।","career_vision_5y":"4-5 वाक्य। यह व्यक्ति 5 वर्षों में कहाँ हो सकता है। विशिष्ट और प्रेरणादायक।","career_vision_10y":"3-4 वाक्य। 10 वर्षों में दीर्घकालिक क्षमता। अपने क्षेत्र में क्या योगदान।","ideal_work_environment":"3-4 वाक्य। आदर्श कार्य वातावरण — टीम, संस्कृति, प्रारूप, प्रबंधन शैली।","communication_style":"3 वाक्य। यह व्यक्ति लोगों के साथ कैसे इंटरैक्ट करता है। ताकत और विकास क्षेत्र।","stress_and_burnout":"3-4 वाक्य। क्या तनाव का कारण बनता है, बर्नआउट के संकेत, कैसे ठीक हों।","top1_why_perfect":"5-6 वाक्य। पहला पेशा इस प्रोफ़ाइल के लिए आदर्श क्यों है। लक्षणों और आवश्यकताओं के बीच विस्तृत लिंक।","top1_day_in_life":"4-5 वाक्य। इस पेशे में विशिष्ट कार्य दिवस। क्या खुशी लाएगा।","top1_roadmap":["कदम 1 — समयसीमा के साथ विशिष्ट कार्रवाई","कदम 2","कदम 3","कदम 4","कदम 5 — परिणाम"],"top1_hard_skills":["कौशल 1","कौशल 2","कौशल 3","कौशल 4"],"top1_soft_skills":["सॉफ्ट स्किल 1","कौशल 2","कौशल 3"],"top1_resources":["लेखक या प्लेटफ़ॉर्म के साथ विशिष्ट कोर्स/किताब","संसाधन 2","संसाधन 3","समुदाय या सम्मेलन"],"top2_brief":"दूसरे पेशे के बारे में 2-3 वाक्य — क्यों फिट बैठता है और कैसे अलग है।","top3_brief":"तीसरे पेशे के बारे में 2-3 वाक्य — अप्रत्याशित लेकिन तार्किक विकल्प।","salary_trajectory":"3 वाक्य। जूनियर→मिड→सीनियर के साथ यथार्थवादी वेतन प्रक्षेपवक्र।","networking_advice":"3 वाक्य। इस प्रोफ़ाइल को देखते हुए पेशेवर संबंध कैसे बनाएं।","red_flags":["संकेत 1 — कंपनियां/रिक्तियां जिनसे बचना है","संकेत 2","संकेत 3"],"action_today":"2-3 वाक्य। आज एक विशिष्ट कार्रवाई। जितना संभव हो उतना ठोस।","personal_message":"3-4 वाक्य। कोच का व्यक्तिगत संदेश। गर्म, {name} नाम का उल्लेख करें।"}',
}

# Метки данных профиля в промпте — на языке пользователя
PROMPT_LABELS = {
    "ru": {
        "intro":        "Ты — опытный карьерный психолог и коуч. Результаты научного теста пользователя:",
        "name":         "Имя",
        "top_trait":    "Сильнейшая черта",
        "low_trait":    "Зона роста",
        "riasec_dom":   "RIASEC доминант",
        "riasec_full":  "Полный RIASEC",
        "top3":         "Топ-3 профессии",
        "prof_type":    "тип",
        "prof_growth":  "Перспективность",
        "instruction":  "Создай детальный отчёт. Отвечай ТОЛЬКО валидным JSON без markdown:",
        "footer":       "Каждый пункт уникален для ЭТОГО профиля. Используй числа. Только JSON.",
        "score":        "баллов",
    },
    "en": {
        "intro":        "You are an experienced career psychologist and coach. Scientific test results:",
        "name":         "Name",
        "top_trait":    "Strongest trait",
        "low_trait":    "Growth area",
        "riasec_dom":   "RIASEC dominant",
        "riasec_full":  "Full RIASEC",
        "top3":         "Top-3 professions",
        "prof_type":    "type",
        "prof_growth":  "Growth potential",
        "instruction":  "Create a detailed report. Reply ONLY with valid JSON, no markdown:",
        "footer":       "Each item is unique for THIS profile. Use numbers. JSON only.",
        "score":        "points",
    },
    "es": {
        "intro":        "Eres un psicólogo y coach de carrera experimentado. Resultados del test científico:",
        "name":         "Nombre",
        "top_trait":    "Rasgo más fuerte",
        "low_trait":    "Área de crecimiento",
        "riasec_dom":   "Dominante RIASEC",
        "riasec_full":  "RIASEC completo",
        "top3":         "Top-3 profesiones",
        "prof_type":    "tipo",
        "prof_growth":  "Potencial de crecimiento",
        "instruction":  "Crea un informe detallado. Responde SOLO con JSON válido, sin markdown:",
        "footer":       "Cada punto es único para ESTE perfil. Usa números. Solo JSON.",
        "score":        "puntos",
    },
    "pt": {
        "intro":        "Você é um psicólogo e coach de carreira experiente. Resultados do teste científico:",
        "name":         "Nome",
        "top_trait":    "Traço mais forte",
        "low_trait":    "Área de crescimento",
        "riasec_dom":   "Dominante RIASEC",
        "riasec_full":  "RIASEC completo",
        "top3":         "Top-3 profissões",
        "prof_type":    "tipo",
        "prof_growth":  "Potencial de crescimento",
        "instruction":  "Crie um relatório detalhado. Responda APENAS com JSON válido, sem markdown:",
        "footer":       "Cada item é único para ESTE perfil. Use números. Apenas JSON.",
        "score":        "pontos",
    },
    "hi": {
        "intro":        "आप एक अनुभवी करियर मनोवैज्ञानिक और कोच हैं। वैज्ञानिक परीक्षण के परिणाम:",
        "name":         "नाम",
        "top_trait":    "सबसे मजबूत गुण",
        "low_trait":    "विकास क्षेत्र",
        "riasec_dom":   "RIASEC प्रमुख",
        "riasec_full":  "पूर्ण RIASEC",
        "top3":         "शीर्ष-3 पेशे",
        "prof_type":    "प्रकार",
        "prof_growth":  "विकास क्षमता",
        "instruction":  "एक विस्तृत रिपोर्ट बनाएं। केवल वैध JSON में उत्तर दें, बिना markdown के:",
        "footer":       "प्रत्येक बिंदु इस प्रोफ़ाइल के लिए अद्वितीय है। संख्याओं का उपयोग करें। केवल JSON।",
        "score":        "अंक",
    },
}


def _build_prompt(name, normalized, riasec, top_professions, details_list, lang):
    rl  = RIASEC_LABELS_ALL.get(lang, RIASEC_LABELS_ALL["en"])
    tl  = TRAIT_LABELS_ALL.get(lang, TRAIT_LABELS_ALL["en"])
    li  = LANG_INST.get(lang, LANG_INST["en"])
    pl  = PROMPT_LABELS.get(lang, PROMPT_LABELS["en"])
    dom = max(riasec, key=riasec.get)
    top_t = max(normalized, key=normalized.get)
    low_t = min(normalized, key=normalized.get)
    riasec_rank = sorted(riasec.items(), key=lambda x: -x[1])

    profs = ""
    for i, prof in enumerate(top_professions[:3]):
        det  = details_list[i] if i < len(details_list) else {}
        pros = "; ".join((det.get("pros") or [])[:3])
        cons = "; ".join((det.get("cons") or [])[:3])
        real = det.get("reality") or det.get("description") or prof.get("description","")
        profs += (
            f"\n  {i+1}. {prof['title']} — {prof['match']}%, "
            f"{pl['prof_type']} {rl.get(prof['riasec'],prof['riasec'])}\n"
            f"     {real}\n     + {pros}\n     - {cons}\n"
            f"     {pl['prof_growth']}: {prof.get('growth','')}"
        )

    field_desc = FIELD_DESCRIPTIONS.get(lang, FIELD_DESCRIPTIONS["en"])
    # Подставляем имя в personal_message placeholder
    field_desc = field_desc.replace("{name}", name)

    return f"""{li}

{pl['intro']}

{pl['name']}: {name}
Big Five: O={normalized.get('O')}% C={normalized.get('C')}% E={normalized.get('E')}% A={normalized.get('A')}% S={normalized.get('S')}%
{pl['top_trait']}: {tl.get(top_t)} ({normalized.get(top_t)}%)
{pl['low_trait']}: {tl.get(low_t)} ({normalized.get(low_t)}%)
{pl['riasec_dom']}: {rl.get(dom)} ({dom}) — {riasec.get(dom)} {pl['score']}
{pl['riasec_full']}: {', '.join(f"{rl.get(k,k)}: {v}" for k,v in riasec_rank)}
{pl['top3']}:{profs}

{pl['instruction']}

{field_desc}

{pl['footer']}"""


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
