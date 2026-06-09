"""
CareerCheck — тёмный PDF-отчёт v5 Aurora.
Изменения v5:
- Тема Aurora: мятный (#00d4aa) + индиго (#6c5ce7)
- Убран @Dimirdin, добавлен @CareerCheckSupport
"""

import os
import io
import logging
from typing import Optional

import matplotlib
matplotlib.use('Agg')
import matplotlib.font_manager as fm

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from locales import get_text

logger = logging.getLogger(__name__)

W, H = A4
M    = 18 * mm

# ── Палитра Aurora ────────────────────────────────────────────────────────────
# Фон: #080e1a  Мятный акцент: #00d4aa  Индиго: #6c5ce7
BG        = (0.031, 0.055, 0.102)   # #080e1a — почти чёрный с синевой
PANEL     = (0.051, 0.094, 0.161)   # #0d1829 — панели
PANEL2    = (0.071, 0.125, 0.220)   # #122038 — выделенные панели
PURPLE    = (0.424, 0.361, 0.906)   # #6c5ce7 — индиго (главный фиолетовый)
BLUE      = (0.000, 0.706, 0.847)   # #00b4d8 — голубой
CYAN      = (0.000, 0.831, 0.667)   # #00d4aa — мятный (главный акцент)
GREEN     = (0.659, 1.000, 0.471)   # #a8ff78 — лаймовый
ORANGE    = (0.992, 0.796, 0.431)   # #fdcb6e — тёплый янтарный
WHITE     = (1, 1, 1)
GRAY      = (0.533, 0.573, 0.643)   # #8892a4 — нейтральный серый
DIM       = (0.102, 0.157, 0.251)   # #1a2840 — разделители
GOLD      = (1.000, 0.843, 0.000)   # #ffd700 — золото (медали)
SILVER    = (0.533, 0.573, 0.643)   # #8892a4 — серебро
BRONZE    = (0.804, 0.561, 0.353)   # #cd8f5a — бронза
MUTED     = (0.239, 0.314, 0.408)   # #3d5068 — приглушённый текст
DARK_TEXT = (0.353, 0.478, 0.588)   # #5a7a96 — тёмный вспомогательный
RED_SOFT  = (1.000, 0.420, 0.420)   # #ff6b6b — мягкий красный (минусы)
GREEN_SOFT= (0.000, 0.831, 0.667)   # #00d4aa — мятный (плюсы)

TRAIT_COLORS  = [CYAN, PURPLE, ORANGE, GREEN, BLUE]   # O C E A S
TRAIT_KEYS    = ['O', 'C', 'E', 'A', 'S']
RIASEC_KEYS   = ['R', 'I', 'A', 'S', 'E', 'C']
RIASEC_COLORS = [GRAY, CYAN, ORANGE, GREEN, PURPLE, BLUE]
MEDAL_COLORS  = [GOLD, SILVER, BRONZE]
MEDALS        = ['#1', '#2', '#3']


# ── Шрифты ────────────────────────────────────────────────────────────────────

def _register_fonts():
    candidates_reg = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/opt/homebrew/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/Library/Fonts/DejaVuSans.ttf',
    ]
    candidates_bold = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/opt/homebrew/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/Library/Fonts/DejaVuSans-Bold.ttf',
    ]
    for f in fm.fontManager.ttflist:
        if 'DejaVuSans.ttf' in f.fname and 'Bold' not in f.fname and 'Oblique' not in f.fname:
            candidates_reg.append(f.fname)
        if 'DejaVuSans-Bold.ttf' in f.fname:
            candidates_bold.append(f.fname)

    reg_path  = next((p for p in candidates_reg  if os.path.exists(p)), None)
    bold_path = next((p for p in candidates_bold if os.path.exists(p)), None)

    reg_name = bold_name = None
    if reg_path:
        try:
            pdfmetrics.registerFont(TTFont('DVReg', reg_path))
            reg_name = 'DVReg'
            logger.info(f"Font DVReg loaded: {reg_path}")
        except Exception as e:
            logger.error(f"Font DVReg load error: {e}")
    else:
        logger.warning("DejaVuSans.ttf NOT FOUND — falling back to Helvetica. Cyrillic text will be corrupted!")

    if bold_path:
        try:
            pdfmetrics.registerFont(TTFont('DVBold', bold_path))
            bold_name = 'DVBold'
            logger.info(f"Font DVBold loaded: {bold_path}")
        except Exception as e:
            logger.error(f"Font DVBold load error: {e}")
    else:
        logger.warning("DejaVuSans-Bold.ttf NOT FOUND — falling back to Helvetica-Bold.")

    return reg_name or 'Helvetica', bold_name or 'Helvetica-Bold'


FONT_REG, FONT_BOLD = _register_fonts()


# ── Утилиты ───────────────────────────────────────────────────────────────────

def rgb(c, color):  c.setFillColorRGB(*color)
def srgb(c, color): c.setStrokeColorRGB(*color)

def filled_rect(c, x, y, w, h, color, r=3):
    rgb(c, color); c.roundRect(x, y, w, h, r, fill=1, stroke=0)

def stroked_rect(c, x, y, w, h, color, lw=0.5, r=3):
    srgb(c, color); c.setLineWidth(lw); c.roundRect(x, y, w, h, r, fill=0, stroke=1)

def text(c, x, y, s, font, size, color, align='left'):
    rgb(c, color); c.setFont(font, size)
    if   align == 'center': c.drawCentredString(x, y, s)
    elif align == 'right':  c.drawRightString(x, y, s)
    else:                   c.drawString(x, y, s)

def trunc(s, n):
    return s if len(s) <= n else s[:n-1] + '...'

def measure_lines(c, s, font, size, max_w):
    c.setFont(font, size)
    words = s.split()
    lines, line = 0, ''
    for w in words:
        test = (line + ' ' + w).strip()
        if c.stringWidth(test, font, size) <= max_w:
            line = test
        else:
            lines += 1; line = w
    if line: lines += 1
    return max(1, lines)

def multiline(c, x, y, s, font, size, color, max_w, lh):
    rgb(c, color); c.setFont(font, size)
    words = s.split(); line = ''
    for w in words:
        test = (line + ' ' + w).strip()
        if c.stringWidth(test, font, size) <= max_w:
            line = test
        else:
            if line: c.drawString(x, y, line); y -= lh
            line = w
    if line: c.drawString(x, y, line); y -= lh
    return y

def gradient_bar(c, x, y, length, thickness=3):
    """Градиент мятный → индиго (Aurora)."""
    n = 60; dx = length / n
    for i in range(n):
        t2 = i / n
        if t2 < 0.5:
            t3  = t2 * 2
            col = tuple(CYAN[j]*(1-t3) + BLUE[j]*t3 for j in range(3))
        else:
            t3  = (t2 - 0.5) * 2
            col = tuple(BLUE[j]*(1-t3) + PURPLE[j]*t3 for j in range(3))
        srgb(c, col); c.setLineWidth(thickness)
        c.line(x + i*dx, y, x + (i+1)*dx, y)

def divider(c, y):
    srgb(c, DIM); c.setLineWidth(0.4); c.line(M, y, W-M, y)
    return y - 8


# ── Компоненты страниц ────────────────────────────────────────────────────────

def draw_bg(c):
    filled_rect(c, 0, 0, W, H, BG, r=0)
    gradient_bar(c, M, H-4, W-2*M)

def draw_header(c, y, name, date, subtitle=''):
    text(c, M,    y, 'CAREER', FONT_BOLD, 15, WHITE)
    ox = c.stringWidth('CAREER', FONT_BOLD, 15) + 3
    text(c, M+ox, y, 'CHECK',  FONT_BOLD, 15, PURPLE)
    text(c, W-M, y,    subtitle, FONT_REG, 7, MUTED, align='right')
    text(c, W-M, y-9,  name,     FONT_REG, 7, MUTED, align='right')
    text(c, W-M, y-18, date,     FONT_REG, 7, MUTED, align='right')
    y2 = y - 24
    srgb(c, DIM); c.setLineWidth(0.4); c.setDash([2,4])
    c.line(M, y2, W-M, y2); c.setDash([])
    return y2 - 10

def section(c, y, title):
    text(c, M, y, title, FONT_BOLD, 7, PURPLE)
    return y - 12

def draw_type_block(c, y, dom_key, lang):
    label = get_text("card_riasec_labels", lang)
    if isinstance(label, dict):
        label = label.get(dom_key, dom_key)
    else:
        label = dom_key
    bh = 34
    filled_rect(c, M, y-bh, W-2*M, bh, PANEL, r=5)
    stroked_rect(c, M, y-bh, W-2*M, bh, tuple(p*0.5 for p in PURPLE), lw=0.7, r=5)
    cx, cy = M+18, y-bh/2
    rgb(c, tuple(p*0.25 for p in PURPLE))
    c.circle(cx, cy, 11, fill=1, stroke=0)
    text(c, cx, cy-4, dom_key, FONT_BOLD, 10, PURPLE, align='center')
    text(c, M+36, y-12, label,                               FONT_BOLD, 12, WHITE)
    text(c, M+36, y-25, get_text("pdf_dom_label", lang),     FONT_REG,  7, GRAY)
    return y - bh - 8

def draw_big5(c, y, normalized, lang):
    trait_names = get_text("card_trait_names", lang)
    if not isinstance(trait_names, list):
        trait_names = ['O','C','E','A','S']
    label_w = 74; bar_x = M + label_w + 4
    bar_w   = W - 2*M - label_w - 28
    val_x   = bar_x + bar_w + 5
    row_h   = 13

    for i, (key, color) in enumerate(zip(TRAIT_KEYS, TRAIT_COLORS)):
        val = normalized.get(key, 0); ry = y - i*row_h
        name = trait_names[i] if i < len(trait_names) else key
        text(c, M, ry, name, FONT_REG, 8, GRAY)
        filled_rect(c, bar_x, ry-5, bar_w, 6, DIM, r=3)
        fw = bar_w * val / 100
        if fw > 0: filled_rect(c, bar_x, ry-5, fw, 6, color, r=3)
        text(c, val_x, ry-4, str(val), FONT_BOLD, 8, color)

    return y - len(TRAIT_KEYS)*row_h - 6

def draw_riasec(c, y, riasec, lang):
    riasec_names = get_text("card_riasec_names", lang)
    if not isinstance(riasec_names, list):
        riasec_names = RIASEC_KEYS
    cols = 3; cell_w = (W - 2*M - (cols-1)*5) / cols; cell_h = 40
    dom  = max(riasec, key=riasec.get)

    for i, (key, color) in enumerate(zip(RIASEC_KEYS, RIASEC_COLORS)):
        col    = i % cols; row = i // cols
        cx     = M + col*(cell_w+5); cy = y - row*(cell_h+5)
        is_dom = key == dom
        filled_rect(c, cx, cy-cell_h, cell_w, cell_h, PANEL2 if is_dom else PANEL, r=4)
        stroked_rect(c, cx, cy-cell_h, cell_w, cell_h,
                     tuple(p*0.6 for p in color) if is_dom else DIM,
                     lw=1.0 if is_dom else 0.4, r=4)
        val  = riasec.get(key, 0)
        name = riasec_names[i] if i < len(riasec_names) else key
        text(c, cx+cell_w/2, cy-14, key,            FONT_BOLD, 13, color, align='center')
        text(c, cx+cell_w/2, cy-24, trunc(name, 14), FONT_REG,  6, MUTED, align='center')
        bx = cx+7; bw = cell_w-14
        filled_rect(c, bx, cy-cell_h+6, bw, 3, DIM, r=1)
        if val > 0: filled_rect(c, bx, cy-cell_h+6, bw*val/100, 3, color, r=1)
        text(c, cx+cell_w/2, cy-cell_h+11, str(val), FONT_REG, 5.5, MUTED, align='center')

    rows = (len(RIASEC_KEYS)+cols-1)//cols
    return y - rows*(cell_h+5) - 4

def draw_growth(c, y, normalized, lang):
    recs  = get_text("pdf_growth_tips", lang)
    if not isinstance(recs, dict):
        recs = {}
    weak  = sorted(TRAIT_KEYS, key=lambda k: normalized.get(k, 0))[:2]
    bh    = 16 + len(weak)*20
    filled_rect(c, M, y-bh, W-2*M, bh, PANEL, r=5)
    tx, ty = M+10, y-13
    for key in weak:
        val            = normalized.get(key, 0)
        name, rec      = recs.get(key, (key, ''))
        text(c, tx, ty, f'{name} ({key}): {val}', FONT_BOLD, 7.5, GRAY)
        ty -= 10
        text(c, tx, ty, rec, FONT_REG, 7, DARK_TEXT)
        ty -= 12
    return y - bh - 6

def draw_footer(c, page_num, total, lang):
    y = 13*mm
    srgb(c, DIM); c.setLineWidth(0.4); c.line(M, y, W-M, y)
    y -= 8
    text(c, M,   y, "@CareerCheckSupport  ·  careercheck.app", FONT_REG, 6, MUTED)
    text(c, W/2, y, get_text("pdf_footer_center", lang), FONT_REG, 6, MUTED, align='center')
    text(c, W-M, y, f'{page_num} / {total}',              FONT_REG, 6, MUTED, align='right')

def draw_prof_card(c, y, prof, normalized, details, medal_color, medal_label, lang):
    title       = prof.get('title', '')
    match_pct   = prof.get('match', 0)
    riasec_type = prof.get('riasec', '')
    growth      = prof.get('growth', '')

    description = ''
    pros, cons  = [], []
    if details:
        description = (details.get('reality') or details.get('description') or '')
        pros = [p for p in details.get('pros', []) if p][:4]
        cons = [p for p in details.get('cons', []) if p][:4]
    if not description:
        description = prof.get('description', '')

    inner_w = W - 2*M - 14
    col_w   = (inner_w - 8) / 2
    fs_desc = 7.5; fs_list = 7.5; lh = 10
    ix = M + 12

    c.setFont(FONT_REG, fs_desc)
    desc_lines = measure_lines(c, description, FONT_REG, fs_desc, inner_w)
    pros_lines = sum(measure_lines(c, f'+ {p}', FONT_REG, fs_list, col_w) for p in pros) if pros else 0
    cons_lines = sum(measure_lines(c, f'- {p}', FONT_REG, fs_list, col_w) for p in cons) if cons else 0
    list_lines = max(pros_lines, cons_lines)
    has_list   = bool(pros or cons)
    has_growth = bool(growth)

    card_h = (
        14 + 14 + desc_lines*lh + 8 + 18
        + (lh + 2 + list_lines*lh + 6 if has_list else 0)
        + (16 if has_growth else 0)
        + 14
    )

    filled_rect(c, M, y-card_h, W-2*M, card_h, PANEL, r=5)
    filled_rect(c, M, y-card_h, 4, card_h, medal_color, r=0)

    ty = y - 14
    text(c, ix, ty, medal_label, FONT_BOLD, 10, medal_color)
    ml = c.stringWidth(medal_label, FONT_BOLD, 10) + 6
    text(c, ix+ml, ty, trunc(title, 40), FONT_BOLD, 10, WHITE)
    text(c, W-M-6, ty, f'{match_pct}%',  FONT_BOLD, 12, medal_color, align='right')

    ty -= 14
    ty = multiline(c, ix, ty, description, FONT_REG, fs_desc, DARK_TEXT, inner_w, lh)

    ty -= 8
    trait_names = get_text("card_trait_names", lang)
    if not isinstance(trait_names, list):
        trait_names = TRAIT_KEYS
    chip_x = ix
    for key, color, name in zip(TRAIT_KEYS, TRAIT_COLORS, trait_names):
        val   = normalized.get(key, 0)
        label = f'{key}: {val}'
        tw    = c.stringWidth(label, FONT_REG, 6.5) + 10
        filled_rect(c, chip_x, ty-9, tw, 11, DIM, r=4)
        text(c, chip_x+5, ty-6, label, FONT_REG, 6.5, color)
        chip_x += tw + 4
    ty -= 18

    if has_list:
        text(c, ix,         ty, get_text("pdf_pros", lang), FONT_BOLD, 7, GREEN_SOFT)
        text(c, ix+col_w+8, ty, get_text("pdf_cons", lang), FONT_BOLD, 7, RED_SOFT)
        ty -= lh + 2
        left_y  = ty; right_y = ty
        for p in pros:
            left_y  = multiline(c, ix, left_y, f'+ {p}', FONT_REG, fs_list, GREEN_SOFT, col_w, lh)
        for p in cons:
            right_y = multiline(c, ix+col_w+8, right_y, f'- {p}', FONT_REG, fs_list, RED_SOFT, col_w, lh)
        ty = min(left_y, right_y) - 6

    if has_growth:
        text(c, ix, ty, f'{get_text("pdf_prospects", lang)}: {growth}', FONT_REG, 7, MUTED)

    return y - card_h - 10


# ── Публичный API ─────────────────────────────────────────────────────────────

def generate_pdf(
    user_data:         dict,
    normalized_scores: dict,
    riasec:            dict,
    top_professions:   list,
    details_list:      list,
    lang:              str = "ru",
    output_path:       Optional[str] = None,
) -> bytes:
    t = lambda key: get_text(key, lang)

    name    = (user_data.get('full_name') or user_data.get('name') or 'User').strip()
    date    = user_data.get('date', '---')
    dom_key = max(riasec, key=riasec.get)

    buf = io.BytesIO()
    c   = canvas.Canvas(buf, pagesize=A4)

    # ── Страница 1: Профиль ──────────────────────────────────────────────────
    draw_bg(c)
    y = H - M
    y = draw_header(c, y, name, date, subtitle=t("pdf_subtitle"))

    y = section(c, y, t("pdf_section_type"))
    y = draw_type_block(c, y, dom_key, lang)

    y = section(c, y, t("pdf_section_big5"))
    y = draw_big5(c, y, normalized_scores, lang)

    y = divider(c, y)

    y = section(c, y, t("pdf_section_riasec"))
    y = draw_riasec(c, y, riasec, lang)

    y = divider(c, y)

    y = section(c, y, t("pdf_section_growth"))
    draw_growth(c, y, normalized_scores, lang)

    draw_footer(c, 1, 2, lang)
    c.showPage()

    # ── Страница 2: Профессии ────────────────────────────────────────────────
    draw_bg(c)
    y = H - M
    y = draw_header(c, y, name, date, subtitle=t("pdf_subtitle2"))
    y = section(c, y, t("pdf_section_top3"))

    for i, prof in enumerate(top_professions[:3]):
        details = details_list[i] if i < len(details_list) else None
        y = draw_prof_card(c, y, prof, normalized_scores, details, MEDAL_COLORS[i], MEDALS[i], lang)

    draw_footer(c, 2, 2, lang)
    c.showPage()

    c.save()
    buf.seek(0)
    pdf_bytes = buf.read()
    logger.info(f'PDF generated: lang={lang}, size={len(pdf_bytes)} bytes')
    return pdf_bytes
