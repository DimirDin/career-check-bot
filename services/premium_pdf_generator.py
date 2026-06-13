"""
premium_pdf_generator.py — 6-страничный Premium PDF CareerCheck.
Страница 1: Обложка + психологический портрет
Страница 2: Big Five + RIASEC визуализация
Страница 3: Карьерное видение + идеальная среда
Страница 4: Глубокий анализ профессии #1
Страница 5: Роадмап + навыки + ресурсы
Страница 6: Профессии #2/#3 + итог + личное послание
"""

import io
import logging

from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm

from services.pdf_generator import (
    FONT_REG, FONT_BOLD,
    BG, PANEL, PANEL2, PURPLE, BLUE, CYAN, GREEN, ORANGE,
    WHITE, GRAY, DIM, GOLD, SILVER, BRONZE, MUTED, DARK_TEXT, LIGHT_TEXT,
    RED_SOFT, GREEN_SOFT, TRAIT_COLORS, TRAIT_KEYS,
    W, H, M,
    rgb, srgb, filled_rect, stroked_rect, text, multiline,
    measure_lines, trunc, gradient_bar, divider, draw_bg,
)
from services.ai_analyst import generate_ai_analysis

logger = logging.getLogger(__name__)

SUPPORT_BOT = "@CareerCheckSupport"

RIASEC_LABELS = {
    "ru": {"R":"Реалистичный","I":"Исследовательский","A":"Артистичный",
           "S":"Социальный","E":"Предприимчивый","C":"Конвенциональный"},
    "en": {"R":"Realistic","I":"Investigative","A":"Artistic",
           "S":"Social","E":"Enterprising","C":"Conventional"},
    "es": {"R":"Realista","I":"Investigador","A":"Artístico",
           "S":"Social","E":"Emprendedor","C":"Convencional"},
    "pt": {"R":"Realista","I":"Investigativo","A":"Artístico",
           "S":"Social","E":"Empreendedor","C":"Convencional"},
    "hi": {"R":"व्यावहारिक","I":"अन्वेषक","A":"कलात्मक",
           "S":"सामाजिक","E":"उद्यमशील","C":"परंपरागत"},
}
TRAIT_LABELS = {
    "ru": ["Открытость","Сознательность","Экстраверсия","Доброжелательность","Стабильность"],
    "en": ["Openness","Conscientiousness","Extraversion","Agreeableness","Stability"],
    "es": ["Apertura","Responsabilidad","Extraversión","Amabilidad","Estabilidad"],
    "pt": ["Abertura","Conscienciosidade","Extroversão","Amabilidade","Estabilidade"],
    "hi": ["खुलापन","कर्तव्यनिष्ठा","बहिर्मुखता","सहमतता","स्थिरता"],
}

PDF_LABELS = {
    "ru": {
        "main_title": "ПЕРСОНАЛЬНЫЙ КАРЬЕРНЫЙ ОТЧЁТ",
        "dom_sub": "Доминирующий тип",
        "bio_note": "Big Five x RIASEC",
        "score_label": "баллов",
        "p1_subtitle": "Психологический профиль",
        "sec_portrait": "Психологический портрет",
        "sec_superpower": "Ваша суперсила",
        "sec_shadow": "На что обратить внимание",
        "sec_big5": "Профиль личности Big Five (OCEAN)",
        "sec_riasec": "RIASEC — профессиональные интересы",
        "p2_subtitle": "Big Five & RIASEC",
        "sec_vision5": "Карьерное видение — 5 лет",
        "sec_vision10": "Долгосрочный потенциал — 10 лет",
        "sec_workenv": "Идеальная рабочая среда",
        "sec_comms": "Стиль коммуникации",
        "sec_stress": "Стресс и риск выгорания",
        "p3_subtitle": "Карьерное видение",
        "sec_why": "Почему это идеальная профессия для вас",
        "sec_daylife": "Как выглядит ваш рабочий день",
        "sec_salary": "Зарплатная траектория",
        "sec_network": "Советы по нетворкингу",
        "p4_subtitle": "Анализ",
        "prof_match": "Совпадение",
        "prof_type": "Тип",
        "sec_roadmap": "Ваш роадмап — 5 конкретных шагов",
        "sec_hard": "Hard skills:",
        "sec_soft": "Soft skills:",
        "sec_resources": "Ресурсы, курсы и сообщества",
        "sec_redflags": "Красные флаги — чего избегать",
        "p5_subtitle": "Роадмап и навыки",
        "sec_action": "Действие на сегодня",
        "sec_message": "Личное послание от карьерного коуча",
        "p6_subtitle": "Альтернативы и итог",
        "questions": "Вопросы по отчёту?",
        "level_high": "Высокий",
        "level_mid": "Средний",
        "level_low": "Низкий",
    },
    "en": {
        "main_title": "PERSONAL CAREER REPORT",
        "dom_sub": "Dominant type",
        "bio_note": "Big Five x RIASEC",
        "score_label": "pts",
        "p1_subtitle": "Psychological Profile",
        "sec_portrait": "Psychological Profile",
        "sec_superpower": "Your Superpower",
        "sec_shadow": "Areas to Watch",
        "sec_big5": "Big Five Personality Profile (OCEAN)",
        "sec_riasec": "RIASEC — Professional Interests",
        "p2_subtitle": "Big Five & RIASEC",
        "sec_vision5": "Career Vision — 5 Years",
        "sec_vision10": "Long-Term Potential — 10 Years",
        "sec_workenv": "Ideal Work Environment",
        "sec_comms": "Communication Style",
        "sec_stress": "Stress & Burnout Risk",
        "p3_subtitle": "Career Vision",
        "sec_why": "Why This Is Your Ideal Career",
        "sec_daylife": "A Day in Your Work Life",
        "sec_salary": "Salary Trajectory",
        "sec_network": "Networking Advice",
        "p4_subtitle": "Analysis",
        "prof_match": "Match",
        "prof_type": "Type",
        "sec_roadmap": "Your Roadmap — 5 Concrete Steps",
        "sec_hard": "Hard skills:",
        "sec_soft": "Soft skills:",
        "sec_resources": "Resources, Courses & Communities",
        "sec_redflags": "Red Flags — What to Avoid",
        "p5_subtitle": "Roadmap & Skills",
        "sec_action": "Action for Today",
        "sec_message": "Personal Message from Your Career Coach",
        "p6_subtitle": "Alternatives & Summary",
        "questions": "Questions about the report?",
        "level_high": "High",
        "level_mid": "Medium",
        "level_low": "Low",
    },
    "es": {
        "main_title": "INFORME DE CARRERA PERSONAL",
        "dom_sub": "Tipo dominante",
        "bio_note": "Big Five x RIASEC",
        "score_label": "pts",
        "p1_subtitle": "Perfil Psicológico",
        "sec_portrait": "Perfil Psicológico",
        "sec_superpower": "Tu Superpoder",
        "sec_shadow": "Áreas a Observar",
        "sec_big5": "Perfil de Personalidad Big Five (OCEAN)",
        "sec_riasec": "RIASEC — Intereses Profesionales",
        "p2_subtitle": "Big Five & RIASEC",
        "sec_vision5": "Visión de Carrera — 5 Años",
        "sec_vision10": "Potencial a Largo Plazo — 10 Años",
        "sec_workenv": "Entorno de Trabajo Ideal",
        "sec_comms": "Estilo de Comunicación",
        "sec_stress": "Estrés y Riesgo de Agotamiento",
        "p3_subtitle": "Visión de Carrera",
        "sec_why": "Por Qué Esta Es Tu Carrera Ideal",
        "sec_daylife": "Un Día en Tu Vida Laboral",
        "sec_salary": "Trayectoria Salarial",
        "sec_network": "Consejos de Networking",
        "p4_subtitle": "Análisis",
        "prof_match": "Coincidencia",
        "prof_type": "Tipo",
        "sec_roadmap": "Tu Hoja de Ruta — 5 Pasos Concretos",
        "sec_hard": "Hard skills:",
        "sec_soft": "Soft skills:",
        "sec_resources": "Recursos, Cursos y Comunidades",
        "sec_redflags": "Banderas Rojas — Qué Evitar",
        "p5_subtitle": "Hoja de Ruta y Habilidades",
        "sec_action": "Acción para Hoy",
        "sec_message": "Mensaje Personal de Tu Coach de Carrera",
        "p6_subtitle": "Alternativas y Resumen",
        "questions": "¿Preguntas sobre el informe?",
        "level_high": "Alto",
        "level_mid": "Medio",
        "level_low": "Bajo",
    },
    "pt": {
        "main_title": "RELATÓRIO DE CARREIRA PESSOAL",
        "dom_sub": "Tipo dominante",
        "bio_note": "Big Five x RIASEC",
        "score_label": "pts",
        "p1_subtitle": "Perfil Psicológico",
        "sec_portrait": "Perfil Psicológico",
        "sec_superpower": "Seu Superpoder",
        "sec_shadow": "Áreas a Observar",
        "sec_big5": "Perfil de Personalidade Big Five (OCEAN)",
        "sec_riasec": "RIASEC — Interesses Profissionais",
        "p2_subtitle": "Big Five & RIASEC",
        "sec_vision5": "Visão de Carreira — 5 Anos",
        "sec_vision10": "Potencial de Longo Prazo — 10 Anos",
        "sec_workenv": "Ambiente de Trabalho Ideal",
        "sec_comms": "Estilo de Comunicação",
        "sec_stress": "Estresse e Risco de Burnout",
        "p3_subtitle": "Visão de Carreira",
        "sec_why": "Por Que Esta É Sua Carreira Ideal",
        "sec_daylife": "Um Dia na Sua Vida Profissional",
        "sec_salary": "Trajetória Salarial",
        "sec_network": "Conselhos de Networking",
        "p4_subtitle": "Análise",
        "prof_match": "Compatibilidade",
        "prof_type": "Tipo",
        "sec_roadmap": "Seu Roteiro — 5 Passos Concretos",
        "sec_hard": "Hard skills:",
        "sec_soft": "Soft skills:",
        "sec_resources": "Recursos, Cursos e Comunidades",
        "sec_redflags": "Sinais de Alerta — O Que Evitar",
        "p5_subtitle": "Roteiro e Habilidades",
        "sec_action": "Ação para Hoje",
        "sec_message": "Mensagem Pessoal do Seu Coach de Carreira",
        "p6_subtitle": "Alternativas e Resumo",
        "questions": "Dúvidas sobre o relatório?",
        "level_high": "Alto",
        "level_mid": "Médio",
        "level_low": "Baixo",
    },
    "hi": {
        "main_title": "व्यक्तिगत करियर रिपोर्ट",
        "dom_sub": "प्रमुख प्रकार",
        "bio_note": "Big Five x RIASEC",
        "score_label": "अंक",
        "p1_subtitle": "मनोवैज्ञानिक प्रोफ़ाइल",
        "sec_portrait": "मनोवैज्ञानिक प्रोफ़ाइल",
        "sec_superpower": "आपकी महाशक्ति",
        "sec_shadow": "ध्यान देने योग्य क्षेत्र",
        "sec_big5": "Big Five व्यक्तित्व प्रोफ़ाइल (OCEAN)",
        "sec_riasec": "RIASEC — व्यावसायिक रुचियाँ",
        "p2_subtitle": "Big Five & RIASEC",
        "sec_vision5": "करियर दृष्टि — 5 वर्ष",
        "sec_vision10": "दीर्घकालिक क्षमता — 10 वर्ष",
        "sec_workenv": "आदर्श कार्य वातावरण",
        "sec_comms": "संचार शैली",
        "sec_stress": "तनाव और बर्नआउट जोखिम",
        "p3_subtitle": "करियर दृष्टि",
        "sec_why": "यह आपका आदर्श करियर क्यों है",
        "sec_daylife": "आपके कार्यदिवस की झलक",
        "sec_salary": "वेतन प्रक्षेपवक्र",
        "sec_network": "नेटवर्किंग सलाह",
        "p4_subtitle": "विश्लेषण",
        "prof_match": "मिलान",
        "prof_type": "प्रकार",
        "sec_roadmap": "आपका रोडमैप — 5 ठोस कदम",
        "sec_hard": "Hard skills:",
        "sec_soft": "Soft skills:",
        "sec_resources": "संसाधन, पाठ्यक्रम और समुदाय",
        "sec_redflags": "रेड फ्लैग — क्या से बचें",
        "p5_subtitle": "रोडमैप और कौशल",
        "sec_action": "आज के लिए कार्य",
        "sec_message": "आपके करियर कोच का व्यक्तिगत संदेश",
        "p6_subtitle": "विकल्प और सारांश",
        "questions": "रिपोर्ट के बारे में प्रश्न?",
        "level_high": "उच्च",
        "level_mid": "मध्यम",
        "level_low": "निम्न",
    },
}


def _L(lang: str) -> dict:
    """Получить словарь локализации PDF, фолбэк на английский."""
    return PDF_LABELS.get(lang, PDF_LABELS["en"])


def _get_fallback_ai_content(lang: str) -> dict:
    """Заглушка для AI-контента когда Claude API недоступен."""
    if lang == "ru":
        note = "⚠️ AI-анализ временно недоступен. Ваш персонализированный анализ будет добавлен в течение 24 часов. Обратитесь в @CareerCheckSupport."
    else:
        note = "⚠️ AI analysis temporarily unavailable. Your personalized analysis will be added within 24 hours. Contact @CareerCheckSupport."
    return {
        "personality_portrait": note,
        "superpower": note,
        "shadow_side": note,
        "career_vision_5y": note,
        "career_vision_10y": note,
        "ideal_work_environment": note,
        "communication_style": note,
        "stress_and_burnout": note,
        "top1_why_perfect": note,
        "top1_day_in_life": note,
        "top1_roadmap": [note],
        "top1_hard_skills": [],
        "top1_soft_skills": [],
        "top1_resources": [],
        "top2_brief": note,
        "top3_brief": note,
        "salary_trajectory": note,
        "networking_advice": note,
        "red_flags": [],
        "action_today": note,
        "personal_message": note,
    }


# ── Drawing helpers ────────────────────────────────────────────────────────────

def _hdr(c, y, name, date, page_info):
    # Logo
    text(c, M, y, "CAREER", FONT_BOLD, 13, WHITE)
    ox = c.stringWidth("CAREER", FONT_BOLD, 13) + 3
    text(c, M+ox, y, "CHECK", FONT_BOLD, 13, PURPLE)
    cx2 = M+ox+c.stringWidth("CHECK", FONT_BOLD, 13)+7
    filled_rect(c, cx2, y-8, c.stringWidth("PREMIUM", FONT_BOLD, 7)+10, 12,
                tuple(p*0.22 for p in GOLD), r=3)
    text(c, cx2+5, y-4, "PREMIUM", FONT_BOLD, 7, GOLD)
    # Right: page info + name
    text(c, W-M, y,    page_info, FONT_REG, 7, GRAY, align='right')
    text(c, W-M, y-10, name,      FONT_REG, 7.5, WHITE, align='right')
    text(c, W-M, y-21, date,      FONT_REG, 6.5, MUTED, align='right')
    y2 = y - 28
    gradient_bar(c, M, y2, W-2*M, thickness=2)
    return y2 - 12

def _ftr(c, n, total):
    y = 13*mm
    srgb(c, DIM); c.setLineWidth(0.4); c.line(M, y, W-M, y)
    y -= 9
    text(c, M,   y, f"careercheck.app  ·  {SUPPORT_BOT}", FONT_REG, 6.5, MUTED)
    text(c, W/2, y, "Premium Career Report", FONT_BOLD, 6.5, MUTED, align='center')
    text(c, W-M, y, f"{n} / {total}", FONT_REG, 6.5, MUTED, align='right')

def _sec(c, y, title, col=None):
    col = col or PURPLE
    filled_rect(c, M, y-13, W-2*M, 17, tuple(p*0.12 for p in col), r=4)
    filled_rect(c, M, y-13, 5, 17, col, r=2)
    text(c, M+12, y-3, title, FONT_BOLD, 10, WHITE)
    return y - 24

def _blk(c, y, s, mw=None, fs=10, col=None, lh=15):
    return multiline(c, M+4, y, s, FONT_REG, fs, col or LIGHT_TEXT, mw or (W-2*M-8), lh)

def _hi(c, y, s, col=None):
    """Выделенный блок — яркий фон, читаемый текст."""
    col = col or GOLD
    bg  = tuple(p*0.18 for p in col)
    border = tuple(p*0.55 for p in col)
    mw  = W-2*M-28
    c.setFont(FONT_REG, 10)
    bh  = measure_lines(c, s, FONT_REG, 10, mw)*15 + 28
    filled_rect(c, M, y-bh, W-2*M, bh, bg, r=7)
    stroked_rect(c, M, y-bh, W-2*M, bh, border, lw=1.3, r=7)
    filled_rect(c, M, y-bh, 5, bh, col, r=2)
    multiline(c, M+16, y-14, s, FONT_REG, 10, WHITE, mw, 15)
    return y - bh - 12

def _num(c, y, items, col=None):
    col = col or GREEN
    for i, item in enumerate(items, 1):
        filled_rect(c, M, y-16, 20, 20, tuple(p*0.20 for p in col), r=10)
        text(c, M+10, y-7, str(i), FONT_BOLD, 9, col, align='center')
        mw = W-2*M-28
        multiline(c, M+28, y, str(item), FONT_REG, 10, LIGHT_TEXT, mw, 15)
        y -= max(22, measure_lines(c, str(item), FONT_REG, 10, mw)*15 + 6)
    return y - 8

def _bul(c, y, items, col=None):
    col = col or GRAY
    for item in items:
        filled_rect(c, M+1, y-6, 7, 7, col, r=3)
        mw = W-2*M-16
        multiline(c, M+15, y, str(item), FONT_REG, 10, LIGHT_TEXT, mw, 15)
        y -= max(16, measure_lines(c, str(item), FONT_REG, 10, mw)*15 + 4)
    return y - 6

def _pills(c, y, items, col=None):
    col = col or CYAN
    bg  = tuple(p*0.18 for p in col)
    x   = M
    for item in items:
        lbl = str(item)
        tw  = c.stringWidth(lbl, FONT_REG, 8.5) + 18
        if x + tw > W-M: x = M; y -= 20
        filled_rect(c, x, y-14, tw, 16, bg, r=8)
        stroked_rect(c, x, y-14, tw, 16, tuple(p*0.4 for p in col), lw=0.7, r=8)
        text(c, x+9, y-5, lbl, FONT_REG, 8.5, col)
        x += tw + 8
    return y - 24

def _2col(c, y, la, ra, lc, rc, lt, rt):
    cw = (W-2*M-14)/2
    filled_rect(c, M,        y-13, cw, 16, tuple(p*0.15 for p in lc), r=4)
    filled_rect(c, M+cw+14,  y-13, cw, 16, tuple(p*0.15 for p in rc), r=4)
    text(c, M+7,       y-4, lt, FONT_BOLD, 9, lc)
    text(c, M+cw+21,   y-4, rt, FONT_BOLD, 9, rc)
    y -= 22; ly = ry = y
    for item in la:
        filled_rect(c, M+2, ly-6, 7, 7, lc, r=3)
        ly = multiline(c, M+14, ly, str(item), FONT_REG, 9, LIGHT_TEXT, cw-14, 13) - 4
    for item in ra:
        filled_rect(c, M+cw+16, ry-6, 7, 7, rc, r=3)
        ry = multiline(c, M+cw+28, ry, str(item), FONT_REG, 9, LIGHT_TEXT, cw-14, 13) - 4
    return min(ly, ry) - 10


# ── 6 страниц ─────────────────────────────────────────────────────────────────

def _cover_accent(c):
    """Декоративный акцент на обложке — градиентные дуги."""
    import math
    cx, cy, r0, r1 = W-M-10, H-M-30, 30, 55
    for ri in range(r0, r1, 3):
        t = (ri - r0) / (r1 - r0)
        col = tuple(CYAN[j]*(1-t) + PURPLE[j]*t for j in range(3))
        alpha = 0.3 + 0.5*t
        srgb(c, tuple(p*alpha for p in col))
        c.setLineWidth(2.5)
        c.arc(cx-ri, cy-ri, cx+ri, cy+ri, startAng=200, extent=120)

def _p1(c, ai, normalized, riasec, name, date, lang):
    draw_bg(c)
    y   = H-M
    L   = _L(lang)
    rl  = RIASEC_LABELS.get(lang, RIASEC_LABELS["en"])
    dom = max(riasec, key=riasec.get)
    y   = _hdr(c, y, name, date, L["p1_subtitle"])

    # Декоративный акцент в правом верхнем углу
    _cover_accent(c)

    # Заголовок отчёта
    text(c, M, y, L["main_title"], FONT_BOLD, 17, WHITE)
    y -= 6; gradient_bar(c, M, y, W-2*M, thickness=1.5); y -= 14

    # Имя пользователя крупно
    text(c, M, y, name, FONT_BOLD, 13, CYAN)
    y -= 18

    # Доминирующий тип — большой блок
    bh = 50
    filled_rect(c, M, y-bh, W-2*M, bh, PANEL2, r=8)
    stroked_rect(c, M, y-bh, W-2*M, bh, tuple(p*0.6 for p in PURPLE), lw=1.2, r=8)
    filled_rect(c, M, y-bh, 6, bh, PURPLE, r=0)
    # Большая буква типа
    filled_rect(c, M+14, y-bh+8, 34, 34, tuple(p*0.22 for p in PURPLE), r=17)
    text(c, M+31, y-bh+20, dom, FONT_BOLD, 18, PURPLE, align='center')
    # Название типа
    text(c, M+56, y-16, rl.get(dom, dom), FONT_BOLD, 15, WHITE)
    text(c, M+56, y-30, f"{L['dom_sub']}  ·  {L['bio_note']}", FONT_REG, 7.5, GRAY)
    text(c, W-M-10, y-13, str(riasec.get(dom)), FONT_BOLD, 26, PURPLE, align='right')
    text(c, W-M-10, y-30, L["score_label"], FONT_REG, 8, MUTED, align='right')
    y -= bh + 14

    y = _sec(c, y, L["sec_portrait"], CYAN)
    if ai.get("personality_portrait"): y = _hi(c, y, ai["personality_portrait"], CYAN)
    y -= 6

    y = _sec(c, y, L["sec_superpower"], GOLD)
    if ai.get("superpower"): y = _blk(c, y, ai["superpower"], fs=10.5, col=WHITE, lh=16)
    y -= 10; divider(c, y); y -= 16

    y = _sec(c, y, L["sec_shadow"], ORANGE)
    if ai.get("shadow_side"): y = _blk(c, y, ai["shadow_side"], fs=10, lh=15)
    _ftr(c, 1, 6)


def _p2(c, normalized, riasec, name, date, lang):
    draw_bg(c)
    y  = H-M
    L  = _L(lang)
    tl = TRAIT_LABELS.get(lang, TRAIT_LABELS["en"])
    rl = RIASEC_LABELS.get(lang, RIASEC_LABELS["en"])
    y  = _hdr(c, y, name, date, L["p2_subtitle"])
    y  = _sec(c, y, L["sec_big5"], CYAN)
    y += 4

    lw=105; bx=M+lw+8; bw=W-2*M-lw-52; vx=bx+bw+10; rh=23
    for i,(key,col) in enumerate(zip(TRAIT_KEYS, TRAIT_COLORS)):
        val=normalized.get(key,0); ry=y-i*rh
        row_bg = tuple(p*0.07 for p in col)
        filled_rect(c, M, ry-rh+4, W-2*M, rh-3, row_bg, r=4)
        text(c, M+6, ry-6, tl[i] if i<len(tl) else key, FONT_REG, 10, LIGHT_TEXT)
        filled_rect(c, bx, ry-11, bw, 11, DIM, r=5)
        if val>0: filled_rect(c, bx, ry-11, bw*val/100, 11, col, r=5)
        text(c, vx, ry-8, f"{val}%", FONT_BOLD, 10, col)
        if val>=70: lt,lc=L["level_high"],GREEN
        elif val>=40: lt,lc=L["level_mid"],GRAY
        else: lt,lc=L["level_low"],ORANGE
        tw=c.stringWidth(lt,FONT_REG,7.5)+14
        filled_rect(c, vx+32, ry-13, tw, 13, tuple(p*0.22 for p in lc), r=6)
        text(c, vx+39, ry-7, lt, FONT_REG, 7.5, lc)

    y -= len(TRAIT_KEYS)*rh+18; divider(c,y); y-=18
    y  = _sec(c, y, L["sec_riasec"], PURPLE)
    y += 4

    rk=["R","I","A","S","E","C"]; rc=[GRAY,PURPLE,ORANGE,GREEN,BLUE,CYAN]
    cols=3; cw=(W-2*M-(cols-1)*8)/cols; ch=62
    dom=max(riasec,key=riasec.get)
    for i,(key,col) in enumerate(zip(rk,rc)):
        c_=i%cols; row=i//cols
        cx=M+c_*(cw+8); cy=y-row*(ch+8)
        is_d=key==dom
        bg_col = PANEL2 if is_d else PANEL
        filled_rect(c, cx, cy-ch, cw, ch, bg_col, r=7)
        stroked_rect(c, cx, cy-ch, cw, ch,
                     tuple(p*0.7 for p in col) if is_d else tuple(p*0.3 for p in col),
                     lw=1.8 if is_d else 0.6, r=7)
        val=riasec.get(key,0)
        text(c, cx+cw/2, cy-18, key, FONT_BOLD, 20, col, align='center')
        text(c, cx+cw/2, cy-32, trunc(rl.get(key,key),14), FONT_REG, 7.5, GRAY, align='center')
        bxr=cx+10; bwr=cw-20
        filled_rect(c, bxr, cy-ch+11, bwr, 6, DIM, r=3)
        if val>0: filled_rect(c, bxr, cy-ch+11, bwr*val/100, 6, col, r=3)
        text(c, cx+cw/2, cy-ch+21, str(val), FONT_BOLD, 8, LIGHT_TEXT, align='center')
    _ftr(c, 2, 6)


def _p3(c, ai, name, date, lang):
    draw_bg(c); y=H-M
    L = _L(lang)
    y = _hdr(c, y, name, date, L["p3_subtitle"])
    y = _sec(c, y, L["sec_vision5"], PURPLE)
    if ai.get("career_vision_5y"): y=_blk(c,y,ai["career_vision_5y"],fs=10.5,col=WHITE,lh=16)
    y-=12
    y = _sec(c, y, L["sec_vision10"], BLUE)
    if ai.get("career_vision_10y"): y=_blk(c,y,ai["career_vision_10y"],fs=10,lh=15)
    y-=12; divider(c,y); y-=18
    y = _sec(c, y, L["sec_workenv"], GREEN)
    if ai.get("ideal_work_environment"): y=_hi(c,y,ai["ideal_work_environment"],GREEN)
    y-=4
    y = _sec(c, y, L["sec_comms"], CYAN)
    if ai.get("communication_style"): y=_blk(c,y,ai["communication_style"],fs=10,lh=15)
    y-=12; divider(c,y); y-=18
    y = _sec(c, y, L["sec_stress"], ORANGE)
    if ai.get("stress_and_burnout"): y=_blk(c,y,ai["stress_and_burnout"],col=GRAY,fs=10,lh=15)
    _ftr(c, 3, 6)


def _p4(c, ai, top1, name, date, lang):
    draw_bg(c); y=H-M
    L  = _L(lang)
    t1 = top1.get("title","")
    y  = _hdr(c, y, name, date, f"{L['p4_subtitle']}: {trunc(t1,28)}")
    # Hero-карточка профессии #1
    bh = 52
    filled_rect(c, M, y-bh, W-2*M, bh, PANEL2, r=8)
    stroked_rect(c, M, y-bh, W-2*M, bh, tuple(p*0.6 for p in GOLD), lw=1.5, r=8)
    filled_rect(c, M, y-bh, 6, bh, GOLD, r=0)
    # "#1" медаль
    filled_rect(c, M+14, y-bh+9, 30, 30, tuple(p*0.25 for p in GOLD), r=15)
    text(c, M+29, y-bh+20, "#1", FONT_BOLD, 10, GOLD, align='center')
    text(c, M+52, y-16, trunc(t1, 40), FONT_BOLD, 13, WHITE)
    text(c, M+52, y-30, f"{L['prof_match']}: {top1.get('match',0)}%  ·  {L['prof_type']}: {top1.get('riasec','')}", FONT_REG, 8, GRAY)
    text(c, W-M-10, y-13, f"{top1.get('match',0)}%", FONT_BOLD, 24, GOLD, align='right')
    y -= bh+16
    y = _sec(c, y, L["sec_why"], GOLD)
    if ai.get("top1_why_perfect"): y=_blk(c,y,ai["top1_why_perfect"],fs=10.5,col=WHITE,lh=16)
    y-=12; divider(c,y); y-=18
    y = _sec(c, y, L["sec_daylife"], CYAN)
    if ai.get("top1_day_in_life"): y=_blk(c,y,ai["top1_day_in_life"],fs=10,lh=15)
    y-=12; divider(c,y); y-=18
    y = _sec(c, y, L["sec_salary"], GREEN)
    if ai.get("salary_trajectory"): y=_hi(c,y,ai["salary_trajectory"],GREEN)
    y-=4
    y = _sec(c, y, L["sec_network"], BLUE)
    if ai.get("networking_advice"): y=_blk(c,y,ai["networking_advice"],col=GRAY,fs=10,lh=15)
    _ftr(c, 4, 6)


def _p5(c, ai, name, date, lang):
    draw_bg(c); y=H-M
    L = _L(lang)
    y = _hdr(c, y, name, date, L["p5_subtitle"])
    y = _sec(c, y, L["sec_roadmap"], GREEN)
    if ai.get("top1_roadmap"): y=_num(c,y,ai["top1_roadmap"],GREEN)
    divider(c,y); y-=18
    y = _2col(c, y,
              ai.get("top1_hard_skills",[]), ai.get("top1_soft_skills",[]),
              CYAN, PURPLE, L["sec_hard"], L["sec_soft"])
    y-=8; divider(c,y); y-=18
    y = _sec(c, y, L["sec_resources"], ORANGE)
    if ai.get("top1_resources"): y=_bul(c,y,ai["top1_resources"],ORANGE)
    divider(c,y); y-=18
    y = _sec(c, y, L["sec_redflags"], RED_SOFT)
    if ai.get("red_flags"): y=_bul(c,y,ai["red_flags"],RED_SOFT)
    _ftr(c, 5, 6)


def _prof_mini(c, y, prof, ai_key, ai, medal_col, L):
    """Мини-карточка профессии #2 или #3."""
    bh = 44
    filled_rect(c, M, y-bh, W-2*M, bh, PANEL, r=7)
    stroked_rect(c, M, y-bh, W-2*M, bh, tuple(p*0.4 for p in medal_col), lw=1.0, r=7)
    filled_rect(c, M, y-bh, 6, bh, medal_col, r=0)
    title = prof.get('title','')
    match = prof.get('match',0)
    text(c, M+16, y-16, trunc(title, 42), FONT_BOLD, 12, WHITE)
    text(c, M+16, y-30, f"{L['prof_match']}: {match}%  ·  {L['prof_type']}: {prof.get('riasec','')}", FONT_REG, 8, GRAY)
    text(c, W-M-12, y-14, f"{match}%", FONT_BOLD, 18, medal_col, align='right')
    y -= bh + 10
    if ai.get(ai_key): y=_blk(c, y, ai[ai_key], fs=10, lh=15)
    return y

def _p6(c, ai, profs, name, date, lang):
    draw_bg(c); y=H-M
    L = _L(lang)
    y = _hdr(c, y, name, date, L["p6_subtitle"])
    if len(profs)>=2:
        y = _prof_mini(c, y, profs[1], "top2_brief", ai, SILVER, L)
        y -= 12
    if len(profs)>=3:
        y = _prof_mini(c, y, profs[2], "top3_brief", ai, BRONZE, L)
        y -= 12
    divider(c,y); y-=18
    y = _sec(c, y, L["sec_action"], GREEN)
    if ai.get("action_today"): y=_hi(c,y,ai["action_today"],GREEN)
    divider(c,y); y-=18
    y = _sec(c, y, L["sec_message"], GOLD)
    if ai.get("personal_message"): y=_blk(c,y,ai["personal_message"],fs=10.5,col=WHITE,lh=16)
    y-=18; divider(c,y); y-=14
    text(c, W/2, y, f"{L['questions']} {SUPPORT_BOT}", FONT_REG, 9, GRAY, align='center')
    y-=14
    text(c, W/2, y, "careercheck.app", FONT_BOLD, 10, PURPLE, align='center')
    _ftr(c, 6, 6)


# ── Public API ─────────────────────────────────────────────────────────────────

async def generate_premium_pdf(
    user_data: dict, normalized_scores: dict, riasec: dict,
    top_professions: list, details_list: list,
    lang: str = "ru", api_key: str = "",
) -> tuple[bytes, bool]:
    """Генерирует Premium PDF. Возвращает (bytes, ai_used).
    ai_used=False означает что использован fallback-контент (AI был недоступен).
    """
    name = (user_data.get("full_name") or user_data.get("name") or "User").strip()
    date = user_data.get("date", "---")

    ai = await generate_ai_analysis(
        name=name, normalized=normalized_scores, riasec=riasec,
        top_professions=top_professions, details_list=details_list,
        lang=lang, api_key=api_key,
    )
    ai_used = bool(ai)
    if not ai:
        ai = _get_fallback_ai_content(lang)
        logger.warning(f"Premium PDF generated with fallback content: '{name}', lang={lang}")

    buf = io.BytesIO()
    c   = rl_canvas.Canvas(buf, pagesize=A4)
    t1  = top_professions[0] if top_professions else {}

    _p1(c, ai, normalized_scores, riasec, name, date, lang); c.showPage()
    _p2(c, normalized_scores, riasec, name, date, lang);     c.showPage()
    _p3(c, ai, name, date, lang);                            c.showPage()
    _p4(c, ai, t1, name, date, lang);                        c.showPage()
    _p5(c, ai, name, date, lang);                            c.showPage()
    _p6(c, ai, top_professions, name, date, lang);           c.showPage()
    c.save(); buf.seek(0)
    result = buf.read()

    logger.info(f"Premium PDF: '{name}', lang={lang}, {len(result)} bytes, 6 pages, ai_used={ai_used}")
    return result, ai_used
