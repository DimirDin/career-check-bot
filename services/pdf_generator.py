"""
CareerCheck — тёмный PDF-отчёт v3.

Изменения:
- generate_pdf возвращает bytes (не пишет на диск)
- плюсы/минусы — два столбца текстом, не теги
- описание без обрезки по символам
- имя из full_name с фолбэком
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

logger = logging.getLogger(__name__)

W, H = A4
M    = 18 * mm

# ── Палитра ───────────────────────────────────────────────────────────────────
BG        = (0.051, 0.051, 0.102)
PANEL     = (0.071, 0.071, 0.165)
PANEL2    = (0.090, 0.090, 0.200)
PURPLE    = (0.486, 0.227, 0.929)
BLUE      = (0.231, 0.510, 0.965)
CYAN      = (0.024, 0.714, 0.831)
GREEN     = (0.063, 0.725, 0.506)
ORANGE    = (0.961, 0.620, 0.043)
WHITE     = (1, 1, 1)
GRAY      = (0.580, 0.635, 0.722)
DIM       = (0.118, 0.141, 0.251)
GOLD      = (0.984, 0.749, 0.141)
SILVER    = (0.580, 0.635, 0.722)
BRONZE    = (0.804, 0.486, 0.247)
MUTED     = (0.290, 0.318, 0.376)
DARK_TEXT = (0.500, 0.560, 0.650)
RED_SOFT  = (0.929, 0.267, 0.267)
GREEN_SOFT= (0.063, 0.725, 0.506)

TRAIT_COLORS = [PURPLE, BLUE, ORANGE, GREEN, CYAN]
TRAIT_KEYS   = ['O', 'C', 'E', 'A', 'S']
TRAIT_NAMES  = ['Открытость', 'Организованность', 'Коммуникация', 'Эмпатия', 'Стабильность']

RIASEC_KEYS   = ['R', 'I', 'A', 'S', 'E', 'C']
RIASEC_SHORT  = ['Реалист', 'Исследователь', 'Артист', 'Социальный', 'Предприниматель', 'Конвенц.']
RIASEC_COLORS = [GRAY, PURPLE, ORANGE, GREEN, BLUE, CYAN]
RIASEC_LABELS = {
    'R': 'Реалист', 'I': 'Исследователь', 'A': 'Артист',
    'S': 'Социальный', 'E': 'Предприниматель', 'C': 'Конвенциональный',
}

MEDAL_COLORS = [GOLD, SILVER, BRONZE]
MEDALS       = ['#1', '#2', '#3']

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
        except Exception:
            pass
    if bold_path:
        try:
            pdfmetrics.registerFont(TTFont('DVBold', bold_path))
            bold_name = 'DVBold'
        except Exception:
            pass
    return reg_name or 'Helvetica', bold_name or 'Helvetica-Bold'


FONT_REG, FONT_BOLD = _register_fonts()

# ── Утилиты ───────────────────────────────────────────────────────────────────

def rgb(c, color):
    c.setFillColorRGB(*color)

def srgb(c, color):
    c.setStrokeColorRGB(*color)

def filled_rect(c, x, y, w, h, color, r=3):
    rgb(c, color)
    c.roundRect(x, y, w, h, r, fill=1, stroke=0)

def stroked_rect(c, x, y, w, h, color, lw=0.5, r=3):
    srgb(c, color)
    c.setLineWidth(lw)
    c.roundRect(x, y, w, h, r, fill=0, stroke=1)

def text(c, x, y, s, font, size, color, align='left'):
    rgb(c, color)
    c.setFont(font, size)
    if   align == 'center': c.drawCentredString(x, y, s)
    elif align == 'right':  c.drawRightString(x, y, s)
    else:                   c.drawString(x, y, s)

def trunc(s, n):
    return s if len(s) <= n else s[:n-1] + '...'

def measure_lines(c, s, font, size, max_w):
    """Считает количество строк при переносе по словам."""
    c.setFont(font, size)
    words = s.split()
    lines, line = 0, ''
    for w in words:
        test = (line + ' ' + w).strip()
        if c.stringWidth(test, font, size) <= max_w:
            line = test
        else:
            lines += 1
            line   = w
    if line:
        lines += 1
    return max(1, lines)

def multiline(c, x, y, s, font, size, color, max_w, lh):
    """Перенос по словам. Возвращает y после последней строки."""
    rgb(c, color)
    c.setFont(font, size)
    words = s.split()
    line  = ''
    for w in words:
        test = (line + ' ' + w).strip()
        if c.stringWidth(test, font, size) <= max_w:
            line = test
        else:
            if line:
                c.drawString(x, y, line)
                y -= lh
            line = w
    if line:
        c.drawString(x, y, line)
        y -= lh
    return y

def gradient_bar(c, x, y, length, thickness=3):
    n  = 60
    dx = length / n
    for i in range(n):
        t = i / n
        if t < 0.5:
            t2  = t * 2
            col = tuple(PURPLE[j]*(1-t2) + BLUE[j]*t2 for j in range(3))
        else:
            t2  = (t - 0.5) * 2
            col = tuple(BLUE[j]*(1-t2) + CYAN[j]*t2 for j in range(3))
        srgb(c, col)
        c.setLineWidth(thickness)
        c.line(x + i*dx, y, x + (i+1)*dx, y)

def divider(c, y):
    srgb(c, DIM)
    c.setLineWidth(0.4)
    c.line(M, y, W-M, y)
    return y - 8

# ── Компоненты страниц ────────────────────────────────────────────────────────

def draw_bg(c):
    filled_rect(c, 0, 0, W, H, BG, r=0)
    gradient_bar(c, M, H-4, W-2*M)

def draw_header(c, y, name, date, subtitle='Персональный отчёт'):
    text(c, M,    y, 'CAREER', FONT_BOLD, 15, WHITE)
    ox = c.stringWidth('CAREER', FONT_BOLD, 15) + 3
    text(c, M+ox, y, 'CHECK',  FONT_BOLD, 15, PURPLE)

    text(c, W-M, y,    subtitle, FONT_REG, 7, MUTED, align='right')
    text(c, W-M, y-9,  name,     FONT_REG, 7, MUTED, align='right')
    text(c, W-M, y-18, date,     FONT_REG, 7, MUTED, align='right')

    y2 = y - 24
    srgb(c, DIM); c.setLineWidth(0.4); c.setDash([2,4])
    c.line(M, y2, W-M, y2)
    c.setDash([])
    return y2 - 10

def section(c, y, title):
    text(c, M, y, title, FONT_BOLD, 7, PURPLE)
    return y - 12

def draw_type_block(c, y, dom_key):
    label = RIASEC_LABELS.get(dom_key, dom_key)
    bh = 34
    filled_rect(c, M, y-bh, W-2*M, bh, PANEL, r=5)
    stroked_rect(c, M, y-bh, W-2*M, bh, tuple(p*0.5 for p in PURPLE), lw=0.7, r=5)
    cx, cy = M+18, y-bh/2
    rgb(c, tuple(p*0.25 for p in PURPLE))
    c.circle(cx, cy, 11, fill=1, stroke=0)
    text(c, cx, cy-4, dom_key, FONT_BOLD, 10, PURPLE, align='center')
    text(c, M+36, y-12, label,                                FONT_BOLD, 12, WHITE)
    text(c, M+36, y-25, 'Доминирующий тип личности по RIASEC', FONT_REG,  7, GRAY)
    return y - bh - 8

def draw_big5(c, y, normalized):
    label_w = 74
    bar_x   = M + label_w + 4
    bar_w   = W - 2*M - label_w - 28
    val_x   = bar_x + bar_w + 5
    row_h   = 13

    for i, (key, color) in enumerate(zip(TRAIT_KEYS, TRAIT_COLORS)):
        val = normalized.get(key, 0)
        ry  = y - i*row_h
        text(c, M, ry, TRAIT_NAMES[i], FONT_REG, 8, GRAY)
        filled_rect(c, bar_x, ry-5, bar_w, 6, DIM, r=3)
        fw = bar_w * val / 100
        if fw > 0:
            filled_rect(c, bar_x, ry-5, fw, 6, color, r=3)
        text(c, val_x, ry-4, str(val), FONT_BOLD, 8, color)

    return y - len(TRAIT_KEYS)*row_h - 6

def draw_riasec(c, y, riasec):
    cols   = 3
    cell_w = (W - 2*M - (cols-1)*5) / cols
    cell_h = 40
    dom    = max(riasec, key=riasec.get)

    for i, (key, color, name) in enumerate(zip(RIASEC_KEYS, RIASEC_COLORS, RIASEC_SHORT)):
        col = i % cols
        row = i // cols
        cx  = M + col*(cell_w+5)
        cy  = y - row*(cell_h+5)
        is_dom = key == dom
        filled_rect(c, cx, cy-cell_h, cell_w, cell_h, PANEL2 if is_dom else PANEL, r=4)
        stroked_rect(c, cx, cy-cell_h, cell_w, cell_h,
                     tuple(p*0.6 for p in color) if is_dom else DIM,
                     lw=1.0 if is_dom else 0.4, r=4)
        val = riasec.get(key, 0)
        text(c, cx+cell_w/2, cy-14, key,           FONT_BOLD, 13, color, align='center')
        text(c, cx+cell_w/2, cy-24, trunc(name,14), FONT_REG,  6, MUTED, align='center')
        bx = cx+7; bw = cell_w-14
        filled_rect(c, bx, cy-cell_h+6, bw, 3, DIM, r=1)
        if val > 0:
            filled_rect(c, bx, cy-cell_h+6, bw*val/100, 3, color, r=1)
        text(c, cx+cell_w/2, cy-cell_h+11, str(val), FONT_REG, 5.5, MUTED, align='center')

    rows = (len(RIASEC_KEYS)+cols-1)//cols
    return y - rows*(cell_h+5) - 4

def draw_growth(c, y, normalized):
    RECS = {
        'O': ('Открытость',      'Читайте нон-фикшн, пробуйте новое хобби каждый месяц.'),
        'C': ('Организованность','Таск-трекер, time-blocking, правило 2 минут.'),
        'E': ('Коммуникация',    'Публичные выступления, митапы, менторство.'),
        'A': ('Эмпатия',         'Активное слушание, волонтёрство, ненасильственное общение.'),
        'S': ('Стабильность',    'Спорт, режим сна, медитация, снижение нагрузки.'),
    }
    weak = sorted(TRAIT_KEYS, key=lambda k: normalized.get(k, 0))[:2]
    bh   = 16 + len(weak)*20
    filled_rect(c, M, y-bh, W-2*M, bh, PANEL, r=5)
    tx, ty = M+10, y-13
    for key in weak:
        val       = normalized.get(key, 0)
        name, rec = RECS[key]
        text(c, tx, ty, f'{name} ({key}): {val}', FONT_BOLD, 7.5, GRAY)
        ty -= 10
        text(c, tx, ty, rec, FONT_REG, 7, DARK_TEXT)
        ty -= 12
    return y - bh - 6

def draw_footer(c, page_num, total):
    y = 13*mm
    srgb(c, DIM); c.setLineWidth(0.4); c.line(M, y, W-M, y)
    y -= 8
    text(c, M,   y, 'CareerCheck  t.me/CareerCheck_Bot',        FONT_REG, 6, MUTED)
    text(c, W/2, y, 'Результат — отправная точка, не приговор', FONT_REG, 6, MUTED, align='center')
    text(c, W-M, y, f'{page_num} / {total}',                    FONT_REG, 6, MUTED, align='right')

# ── Карточка профессии ────────────────────────────────────────────────────────

def draw_prof_card(c, y, prof, normalized, details, medal_color, medal_label):
    title       = prof.get('title', '')
    match_pct   = prof.get('match', 0)
    riasec_type = prof.get('riasec', '')
    growth      = prof.get('growth', '')

    # Описание — полное, без обрезки по символам
    description = ''
    pros, cons  = [], []
    if details:
        description = (details.get('reality') or details.get('description') or '')
        pros = [p for p in details.get('pros', []) if p][:4]
        cons = [p for p in details.get('cons', []) if p][:4]
    if not description:
        description = prof.get('description', '')

    inner_w   = W - 2*M - 14
    col_w     = (inner_w - 8) / 2   # ширина каждого столбца плюсов/минусов
    fs_desc   = 7.5
    fs_list   = 7.5
    lh        = 10

    ix = M + 12   # левый отступ внутри карточки

    # ── Считаем высоту карточки заранее ──────────────────────────────────────
    c.setFont(FONT_REG, fs_desc)
    desc_lines = measure_lines(c, description, FONT_REG, fs_desc, inner_w)

    pros_lines = sum(measure_lines(c, f'+ {p}', FONT_REG, fs_list, col_w) for p in pros) if pros else 0
    cons_lines = sum(measure_lines(c, f'- {p}', FONT_REG, fs_list, col_w) for p in cons) if cons else 0
    list_lines = max(pros_lines, cons_lines)   # столбцы идут параллельно

    has_list   = bool(pros or cons)
    has_growth = bool(growth)

    card_h = (
        14                           # заголовок
        + 14                         # отступ перед описанием
        + desc_lines * lh + 8        # описание + отступ после
        + 18                         # чипы черт + отступ
        + (lh + 2 + list_lines*lh + 6 if has_list else 0)
        + (16 if has_growth else 0)
        + 14                         # нижний отступ
    )

    # ── Рисуем фон ───────────────────────────────────────────────────────────
    filled_rect(c, M, y-card_h, W-2*M, card_h, PANEL, r=5)
    filled_rect(c, M, y-card_h, 4, card_h, medal_color, r=0)   # левая полоска

    ty = y - 14

    # Заголовок
    text(c, ix, ty, medal_label, FONT_BOLD, 10, medal_color)
    ml = c.stringWidth(medal_label, FONT_BOLD, 10) + 6
    text(c, ix+ml, ty, trunc(title, 40), FONT_BOLD, 10, WHITE)
    text(c, W-M-6, ty, f'{match_pct}%',  FONT_BOLD, 12, medal_color, align='right')

    ty -= 14
    # Описание
    ty = multiline(c, ix, ty, description, FONT_REG, fs_desc, DARK_TEXT, inner_w, lh)

    ty -= 8
    # Чипы черт (просто значения)
    chip_x = ix
    for key, color in zip(TRAIT_KEYS, TRAIT_COLORS):
        val   = normalized.get(key, 0)
        label = f'{key}: {val}'
        tw    = c.stringWidth(label, FONT_REG, 6.5) + 10
        filled_rect(c, chip_x, ty-9, tw, 11, DIM, r=4)
        text(c, chip_x+5, ty-6, label, FONT_REG, 6.5, color)
        chip_x += tw + 4
    ty -= 18

    # Плюсы / Минусы — два столбца
    if has_list:
        # Заголовки столбцов
        text(c, ix,          ty, 'Плюсы',  FONT_BOLD, 7, GREEN_SOFT)
        text(c, ix+col_w+8,  ty, 'Минусы', FONT_BOLD, 7, RED_SOFT)
        ty -= lh + 2

        left_y  = ty
        right_y = ty

        for p in pros:
            left_y = multiline(c, ix, left_y, f'+ {p}', FONT_REG, fs_list, GREEN_SOFT, col_w, lh)

        for p in cons:
            right_y = multiline(c, ix+col_w+8, right_y, f'- {p}', FONT_REG, fs_list, RED_SOFT, col_w, lh)

        ty = min(left_y, right_y) - 6

    # Перспективы
    if has_growth:
        text(c, ix, ty, f'Перспективы: {growth}', FONT_REG, 7, MUTED)
        ty -= 10

    return y - card_h - 10


# ── Публичный API ─────────────────────────────────────────────────────────────

def generate_pdf(
    user_data:         dict,
    normalized_scores: dict,
    riasec:            dict,
    top_professions:   list,
    details_list:      list,
    output_path:       Optional[str] = None,   # оставлен для обратной совместимости, но не используется
) -> bytes:
    """
    Генерирует PDF и возвращает bytes.
    На диск не пишет — передавайте напрямую в BufferedInputFile.
    output_path игнорируется (оставлен для совместимости).
    """
    # Имя: из full_name, фолбэк — Пользователь
    name    = (user_data.get('full_name') or user_data.get('name') or 'Пользователь').strip()
    date    = user_data.get('date', '---')
    dom_key = max(riasec, key=riasec.get)

    buf = io.BytesIO()
    c   = canvas.Canvas(buf, pagesize=A4)

    # ── Страница 1: Профиль ──────────────────────────────────────────────────
    draw_bg(c)
    y = H - M
    y = draw_header(c, y, name, date)

    y = section(c, y, 'ТИП ЛИЧНОСТИ')
    y = draw_type_block(c, y, dom_key)

    y = section(c, y, 'ПРОФИЛЬ BIG FIVE')
    y = draw_big5(c, y, normalized_scores)

    y = divider(c, y)

    y = section(c, y, 'RIASEC ПРОФИЛЬ')
    y = draw_riasec(c, y, riasec)

    y = divider(c, y)

    y = section(c, y, 'ЗОНЫ РОСТА')
    draw_growth(c, y, normalized_scores)

    draw_footer(c, 1, 2)
    c.showPage()

    # ── Страница 2: Профессии ────────────────────────────────────────────────
    draw_bg(c)
    y = H - M
    y = draw_header(c, y, name, date, subtitle='Подходящие профессии')

    y = section(c, y, 'ВАШИ ТОП-3 ПРОФЕССИИ')

    for i, prof in enumerate(top_professions[:3]):
        details = details_list[i] if i < len(details_list) else None
        y = draw_prof_card(c, y, prof, normalized_scores, details, MEDAL_COLORS[i], MEDALS[i])

    draw_footer(c, 2, 2)
    c.showPage()

    c.save()
    buf.seek(0)
    pdf_bytes = buf.read()
    logger.info(f'PDF generated in memory, size={len(pdf_bytes)} bytes')
    return pdf_bytes
