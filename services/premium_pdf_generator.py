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
    WHITE, GRAY, DIM, GOLD, SILVER, BRONZE, MUTED, DARK_TEXT,
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


# ── Drawing helpers ────────────────────────────────────────────────────────────

def _hdr(c, y, name, date, page_info):
    text(c, M, y, "CAREER", FONT_BOLD, 14, WHITE)
    ox = c.stringWidth("CAREER", FONT_BOLD, 14) + 3
    text(c, M+ox, y, "CHECK", FONT_BOLD, 14, PURPLE)
    cx2 = M+ox+c.stringWidth("CHECK", FONT_BOLD, 14)+8
    text(c, cx2, y, "PREMIUM", FONT_BOLD, 8, GOLD)
    text(c, W-M, y,    page_info, FONT_REG, 7, MUTED, align='right')
    text(c, W-M, y-9,  name,      FONT_REG, 7, MUTED, align='right')
    text(c, W-M, y-18, date,      FONT_REG, 7, MUTED, align='right')
    y2 = y - 26
    gradient_bar(c, M, y2, W-2*M, thickness=2)
    return y2 - 10

def _ftr(c, n, total):
    y = 13*mm
    srgb(c, DIM); c.setLineWidth(0.4); c.line(M, y, W-M, y)
    y -= 8
    text(c, M,   y, f"careercheck.app  ·  {SUPPORT_BOT}", FONT_REG, 6, MUTED)
    text(c, W/2, y, "Premium Career Report", FONT_REG, 6, MUTED, align='center')
    text(c, W-M, y, f"{n} / {total}", FONT_REG, 6, MUTED, align='right')

def _sec(c, y, title, col=None):
    col = col or PURPLE
    filled_rect(c, M, y-10, 3, 12, col, r=1)
    text(c, M+8, y, title, FONT_BOLD, 8.5, WHITE)
    return y - 16

def _blk(c, y, s, mw=None, fs=8.5, col=None, lh=12):
    return multiline(c, M, y, s, FONT_REG, fs, col or DARK_TEXT, mw or (W-2*M), lh)

def _hi(c, y, s, col=None):
    col = col or GOLD
    bg  = tuple(p*0.12 for p in col)
    mw  = W-2*M-24
    c.setFont(FONT_REG, 8.5)
    bh  = measure_lines(c, s, FONT_REG, 8.5, mw)*12 + 22
    filled_rect(c, M, y-bh, W-2*M, bh, bg, r=6)
    stroked_rect(c, M, y-bh, W-2*M, bh, tuple(p*0.5 for p in col), lw=1.0, r=6)
    multiline(c, M+12, y-11, s, FONT_REG, 8.5, WHITE, mw, 12)
    return y - bh - 8

def _num(c, y, items, col=None):
    col = col or GREEN
    for i, item in enumerate(items, 1):
        filled_rect(c, M, y-12, 16, 16, tuple(p*0.15 for p in col), r=8)
        text(c, M+8, y-6, str(i), FONT_BOLD, 7.5, col, align='center')
        mw = W-2*M-22
        multiline(c, M+22, y, str(item), FONT_REG, 8, DARK_TEXT, mw, 11)
        y -= max(16, measure_lines(c, str(item), FONT_REG, 8, mw)*11 + 3)
    return y - 4

def _bul(c, y, items, col=None):
    col = col or GRAY
    for item in items:
        filled_rect(c, M, y-5, 5, 5, col, r=2)
        mw = W-2*M-12
        multiline(c, M+10, y, str(item), FONT_REG, 8, DARK_TEXT, mw, 11)
        y -= max(12, measure_lines(c, str(item), FONT_REG, 8, mw)*11 + 2)
    return y - 4

def _pills(c, y, items, col=None):
    col = col or CYAN
    bg  = tuple(p*0.14 for p in col)
    x   = M
    for item in items:
        lbl = str(item)
        tw  = c.stringWidth(lbl, FONT_REG, 7.5) + 14
        if x + tw > W-M: x = M; y -= 16
        filled_rect(c, x, y-12, tw, 13, bg, r=6)
        text(c, x+7, y-6, lbl, FONT_REG, 7.5, col)
        x += tw + 6
    return y - 20

def _2col(c, y, la, ra, lc, rc, lt, rt):
    cw = (W-2*M-12)/2
    text(c, M,       y, lt, FONT_BOLD, 7.5, lc)
    text(c, M+cw+12, y, rt, FONT_BOLD, 7.5, rc)
    y -= 13; ly = ry = y
    for item in la:
        filled_rect(c, M, ly-5, 5, 5, lc, r=2)
        ly = multiline(c, M+9, ly, str(item), FONT_REG, 7.5, DARK_TEXT, cw-9, 11) - 3
    for item in ra:
        filled_rect(c, M+cw+12, ry-5, 5, 5, rc, r=2)
        ry = multiline(c, M+cw+21, ry, str(item), FONT_REG, 7.5, DARK_TEXT, cw-9, 11) - 3
    return min(ly, ry) - 6


# ── 6 страниц ─────────────────────────────────────────────────────────────────

def _p1(c, ai, normalized, riasec, name, date, lang):
    draw_bg(c)
    y = H-M
    rl  = RIASEC_LABELS.get(lang, RIASEC_LABELS["en"])
    dom = max(riasec, key=riasec.get)
    y = _hdr(c, y, name, date, "Психологический профиль")

    text(c, M, y, "ПЕРСОНАЛЬНЫЙ КАРЬЕРНЫЙ ОТЧЁТ", FONT_BOLD, 15, WHITE)
    y -= 8; gradient_bar(c, M, y, W-2*M, thickness=1); y -= 16

    bh = 42
    filled_rect(c, M, y-bh, W-2*M, bh, PANEL, r=6)
    stroked_rect(c, M, y-bh, W-2*M, bh, tuple(p*0.5 for p in PURPLE), lw=1.0, r=6)
    filled_rect(c, M, y-bh, 5, bh, PURPLE, r=0)
    text(c, M+14, y-13, rl.get(dom, dom), FONT_BOLD, 15, WHITE)
    text(c, M+14, y-27, f"Доминирующий тип: {dom}  ·  Big Five x RIASEC", FONT_REG, 7.5, GRAY)
    text(c, W-M-8, y-13, str(riasec.get(dom)), FONT_BOLD, 22, PURPLE, align='right')
    text(c, W-M-8, y-27, "баллов", FONT_REG, 7, MUTED, align='right')
    y -= bh + 10

    y = _sec(c, y, "Психологический портрет", CYAN)
    if ai.get("personality_portrait"): y = _hi(c, y, ai["personality_portrait"], CYAN)

    y = _sec(c, y, "Ваша суперсила", GOLD)
    if ai.get("superpower"): y = _blk(c, y, ai["superpower"], fs=9, col=WHITE, lh=13)
    y -= 8; divider(c, y); y -= 14

    y = _sec(c, y, "На что обратить внимание", ORANGE)
    if ai.get("shadow_side"): y = _blk(c, y, ai["shadow_side"], col=GRAY)
    _ftr(c, 1, 6)


def _p2(c, normalized, riasec, name, date, lang):
    draw_bg(c)
    y = H-M
    tl = TRAIT_LABELS.get(lang, TRAIT_LABELS["en"])
    rl = RIASEC_LABELS.get(lang, RIASEC_LABELS["en"])
    y = _hdr(c, y, name, date, "Big Five & RIASEC")
    y = _sec(c, y, "Профиль личности Big Five (OCEAN)", CYAN)

    lw=88; bx=M+lw+4; bw=W-2*M-lw-32; vx=bx+bw+6; rh=16
    for i,(key,col) in enumerate(zip(TRAIT_KEYS, TRAIT_COLORS)):
        val=normalized.get(key,0); ry=y-i*rh
        text(c, M, ry, tl[i] if i<len(tl) else key, FONT_REG, 8.5, GRAY)
        filled_rect(c, bx, ry-6, bw, 8, DIM, r=4)
        if val>0: filled_rect(c, bx, ry-6, bw*val/100, 8, col, r=4)
        text(c, vx, ry-5, f"{val}%", FONT_BOLD, 8.5, col)
        if val>=70: lt,lc="Высокий",GREEN
        elif val>=40: lt,lc="Средний",GRAY
        else: lt,lc="Низкий",ORANGE
        tw=c.stringWidth(lt,FONT_REG,6.5)+10
        filled_rect(c, vx+24, ry-9, tw, 10, tuple(p*0.2 for p in lc), r=5)
        text(c, vx+29, ry-5, lt, FONT_REG, 6.5, lc)

    y -= len(TRAIT_KEYS)*rh+12; divider(c,y); y-=12
    y = _sec(c, y, "RIASEC — профессиональные интересы", PURPLE)

    rk=["R","I","A","S","E","C"]; rc=[GRAY,PURPLE,ORANGE,GREEN,BLUE,CYAN]
    cols=3; cw=(W-2*M-(cols-1)*6)/cols; ch=46
    dom=max(riasec,key=riasec.get)
    for i,(key,col) in enumerate(zip(rk,rc)):
        c_=i%cols; row=i//cols
        cx=M+c_*(cw+6); cy=y-row*(ch+6)
        is_d=key==dom
        filled_rect(c, cx, cy-ch, cw, ch, PANEL2 if is_d else PANEL, r=5)
        stroked_rect(c, cx, cy-ch, cw, ch, tuple(p*0.6 for p in col) if is_d else DIM, lw=1.2 if is_d else 0.4, r=5)
        val=riasec.get(key,0)
        text(c, cx+cw/2, cy-14, key, FONT_BOLD, 14, col, align='center')
        text(c, cx+cw/2, cy-25, trunc(rl.get(key,key),14), FONT_REG, 6, MUTED, align='center')
        bxr=cx+8; bwr=cw-16
        filled_rect(c, bxr, cy-ch+8, bwr, 4, DIM, r=2)
        if val>0: filled_rect(c, bxr, cy-ch+8, bwr*val/100, 4, col, r=2)
        text(c, cx+cw/2, cy-ch+15, str(val), FONT_REG, 6, MUTED, align='center')
    _ftr(c, 2, 6)


def _p3(c, ai, name, date, lang):
    draw_bg(c); y=H-M
    y = _hdr(c, y, name, date, "Карьерное видение")
    y = _sec(c, y, "Карьерное видение — 5 лет", PURPLE)
    if ai.get("career_vision_5y"): y=_blk(c,y,ai["career_vision_5y"],fs=9,col=WHITE,lh=13)
    y-=6
    y = _sec(c, y, "Долгосрочный потенциал — 10 лет", BLUE)
    if ai.get("career_vision_10y"): y=_blk(c,y,ai["career_vision_10y"],col=GRAY)
    y-=6; divider(c,y); y-=12
    y = _sec(c, y, "Идеальная рабочая среда", GREEN)
    if ai.get("ideal_work_environment"): y=_hi(c,y,ai["ideal_work_environment"],GREEN)
    y = _sec(c, y, "Стиль коммуникации", CYAN)
    if ai.get("communication_style"): y=_blk(c,y,ai["communication_style"])
    y-=6; divider(c,y); y-=12
    y = _sec(c, y, "Стресс и риск выгорания", ORANGE)
    if ai.get("stress_and_burnout"): y=_blk(c,y,ai["stress_and_burnout"],col=GRAY)
    _ftr(c, 3, 6)


def _p4(c, ai, top1, name, date, lang):
    draw_bg(c); y=H-M
    t1=top1.get("title","")
    y = _hdr(c, y, name, date, f"Анализ: {trunc(t1,28)}")
    bh=38
    filled_rect(c, M, y-bh, W-2*M, bh, PANEL, r=6)
    filled_rect(c, M, y-bh, 5, bh, GOLD, r=0)
    text(c, M+14, y-14, f"#1  {trunc(t1,42)}", FONT_BOLD, 13, WHITE)
    text(c, M+14, y-27, f"Совпадение: {top1.get('match',0)}%  ·  Тип: {top1.get('riasec','')}", FONT_REG, 7.5, GRAY)
    text(c, W-M-8, y-14, f"{top1.get('match',0)}%", FONT_BOLD, 20, GOLD, align='right')
    y -= bh+10
    y = _sec(c, y, "Почему это идеальная профессия для вас", GOLD)
    if ai.get("top1_why_perfect"): y=_blk(c,y,ai["top1_why_perfect"],fs=9,col=WHITE,lh=13)
    y-=6; divider(c,y); y-=12
    y = _sec(c, y, "Как выглядит ваш рабочий день", CYAN)
    if ai.get("top1_day_in_life"): y=_blk(c,y,ai["top1_day_in_life"])
    y-=6; divider(c,y); y-=12
    y = _sec(c, y, "Зарплатная траектория", GREEN)
    if ai.get("salary_trajectory"): y=_hi(c,y,ai["salary_trajectory"],GREEN)
    y = _sec(c, y, "Советы по нетворкингу", BLUE)
    if ai.get("networking_advice"): y=_blk(c,y,ai["networking_advice"],col=GRAY)
    _ftr(c, 4, 6)


def _p5(c, ai, name, date, lang):
    draw_bg(c); y=H-M
    y = _hdr(c, y, name, date, "Роадмап и навыки")
    y = _sec(c, y, "Ваш роадмап — 5 конкретных шагов", GREEN)
    if ai.get("top1_roadmap"): y=_num(c,y,ai["top1_roadmap"],GREEN)
    divider(c,y); y-=12
    y = _2col(c, y,
              ai.get("top1_hard_skills",[]), ai.get("top1_soft_skills",[]),
              CYAN, PURPLE, "Hard skills:", "Soft skills:")
    y-=4; divider(c,y); y-=12
    y = _sec(c, y, "Ресурсы, курсы и сообщества", ORANGE)
    if ai.get("top1_resources"): y=_bul(c,y,ai["top1_resources"],ORANGE)
    divider(c,y); y-=12
    y = _sec(c, y, "Красные флаги — чего избегать", RED_SOFT)
    if ai.get("red_flags"): y=_bul(c,y,ai["red_flags"],RED_SOFT)
    _ftr(c, 5, 6)


def _p6(c, ai, profs, name, date, lang):
    draw_bg(c); y=H-M
    y = _hdr(c, y, name, date, "Альтернативы и итог")
    if len(profs)>=2:
        p2=profs[1]
        y = _sec(c, y, f"#2  {trunc(p2.get('title',''),40)}  —  {p2.get('match',0)}%", SILVER)
        if ai.get("top2_brief"): y=_blk(c,y,ai["top2_brief"])
        y-=6
    if len(profs)>=3:
        p3=profs[2]
        y = _sec(c, y, f"#3  {trunc(p3.get('title',''),40)}  —  {p3.get('match',0)}%", BRONZE)
        if ai.get("top3_brief"): y=_blk(c,y,ai["top3_brief"])
        y-=6
    divider(c,y); y-=12
    y = _sec(c, y, "Действие на сегодня", GREEN)
    if ai.get("action_today"): y=_hi(c,y,ai["action_today"],GREEN)
    divider(c,y); y-=12
    y = _sec(c, y, "Личное послание от карьерного коуча", GOLD)
    if ai.get("personal_message"): y=_blk(c,y,ai["personal_message"],fs=9,col=WHITE,lh=14)
    y-=12; divider(c,y); y-=10
    text(c, W/2, y, f"Вопросы по отчёту? {SUPPORT_BOT}", FONT_REG, 7.5, GRAY, align='center')
    y-=10
    text(c, W/2, y, "careercheck.app", FONT_BOLD, 8, PURPLE, align='center')
    _ftr(c, 6, 6)


# ── Public API ─────────────────────────────────────────────────────────────────

async def generate_premium_pdf(
    user_data: dict, normalized_scores: dict, riasec: dict,
    top_professions: list, details_list: list,
    lang: str = "ru", api_key: str = "",
) -> bytes:
    name = (user_data.get("full_name") or user_data.get("name") or "User").strip()
    date = user_data.get("date", "---")

    ai = await generate_ai_analysis(
        name=name, normalized=normalized_scores, riasec=riasec,
        top_professions=top_professions, details_list=details_list,
        lang=lang, api_key=api_key,
    )
    if not ai:
        raise RuntimeError("AI analysis unavailable")

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
    logger.info(f"Premium PDF: '{name}', lang={lang}, {len(result)} bytes, 6 pages")
    return result
