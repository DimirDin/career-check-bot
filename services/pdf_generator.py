"""
CareerCheck — PDF-отчёт v6 Aurora.
Полностью перерисован через matplotlib (тот же движок, что и share-карточка
в card_generator.py) вместо ручных reportlab-примитивов — визуально совпадает
с тем, что пользователь видит на странице результатов в Mini App: радары,
градиентная Aurora-палитра, крупная типографика вместо мелкого текста v5.

3 страницы:
  1. Тип личности + Big Five (радар + бары с описанием каждой черты)
  2. RIASEC (радар + разбивка по 6 типам) + зоны роста
  3. Топ-3 профессии (карточки: match%, почему подходит, плюсы/минусы, перспективы)
"""

import io
import logging
from typing import Optional

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import matplotlib.patches as mpatches
import matplotlib.patheffects as pe
from matplotlib.backends.backend_pdf import PdfPages

from locales import get_text

logger = logging.getLogger(__name__)

# ── Шрифты ────────────────────────────────────────────────────────────────────

def _get_font_path(bold=False):
    keyword = 'DejaVuSans-Bold' if bold else 'DejaVuSans.ttf'
    for f in fm.fontManager.ttflist:
        if keyword in f.fname and 'Mono' not in f.fname and 'Oblique' not in f.fname and 'Condensed' not in f.fname:
            return f.fname
    return None

FONT_REG  = _get_font_path(bold=False)
FONT_BOLD = _get_font_path(bold=True)

def _fp(bold=False, size=10):
    path = FONT_BOLD if bold else FONT_REG
    if path:
        return fm.FontProperties(fname=path, size=size)
    return fm.FontProperties(size=size)


# ── Палитра Aurora (совпадает с card_generator.py / фронтендом) ──────────────
BG       = "#080e1a"
BG_PANEL = "#0d1829"
PANEL2   = "#122038"
PURPLE   = "#6c5ce7"
BLUE     = "#00b4d8"
CYAN     = "#00d4aa"
GREEN    = "#a8ff78"
ORANGE   = "#fdcb6e"
WHITE    = "#ffffff"
GRAY     = "#8892a4"
DIM      = "#1a2840"
GOLD     = "#ffd700"
SILVER   = "#8892a4"
BRONZE   = "#cd8f5a"
RED_SOFT = "#ff6b6b"

TRAIT_COLORS  = [CYAN, PURPLE, ORANGE, GREEN, BLUE]
TRAIT_KEYS    = ["O", "C", "E", "A", "S"]
RIASEC_KEYS   = ["R", "I", "A", "S", "E", "C"]
RIASEC_COLORS = [GRAY, CYAN, ORANGE, GREEN, PURPLE, BLUE]
MEDAL_COLORS  = [GOLD, SILVER, BRONZE]
MEDALS        = ["#1", "#2", "#3"]

A4_SIZE = (8.27, 11.69)  # дюймы


# ── Общие компоненты страницы ─────────────────────────────────────────────────

def _new_page():
    fig = plt.figure(figsize=A4_SIZE, facecolor=BG)
    return fig

def _header(fig, name, date, subtitle):
    fig.text(0.07, 0.965, "CAREER", fontproperties=_fp(bold=True, size=20), color=WHITE, va='top')
    fig.text(0.225, 0.965, "CHECK", fontproperties=_fp(bold=True, size=20), color=CYAN, va='top')
    fig.text(0.93, 0.968, subtitle, fontproperties=_fp(size=8), color=GRAY, va='top', ha='right')
    fig.text(0.93, 0.952, f"{name}  ·  {date}", fontproperties=_fp(size=8), color=GRAY, va='top', ha='right')
    fig.add_artist(plt.Line2D([0.07, 0.93], [0.935, 0.935], transform=fig.transFigure,
                              color=PURPLE, alpha=0.3, linewidth=1.0))

def _footer(fig, page_num, total, lang):
    t = lambda key: get_text(key, lang)
    fig.add_artist(plt.Line2D([0.07, 0.93], [0.035, 0.035], transform=fig.transFigure,
                              color=PURPLE, alpha=0.25, linewidth=0.8))
    fig.text(0.07, 0.02, "@CareerCheckSupport", fontproperties=_fp(size=7.5), color=CYAN, va='top')
    fig.text(0.5, 0.02, t("pdf_footer_center"), fontproperties=_fp(size=7.5), color=GRAY, va='top', ha='center')
    fig.text(0.93, 0.02, f"{page_num} / {total}", fontproperties=_fp(size=7.5), color=GRAY, va='top', ha='right')

def _section_title(fig, y, title):
    fig.text(0.07, y, title, fontproperties=_fp(bold=True, size=10.5), color=PURPLE, va='top')
    return y - 0.022

def _radar(ax, values, labels, color, title):
    N      = len(values)
    angles = np.linspace(0, 2 * np.pi, N, endpoint=False).tolist()
    vals   = values + values[:1]
    angs   = angles + angles[:1]

    ax.set_facecolor(BG)
    for spine in ax.spines.values():
        spine.set_visible(False)

    levels      = [20, 40, 60, 80, 100]
    grid_colors = ["#1a1f3a", "#1e2545", "#222c52", "#26335f", "#2a3a6c"]
    for lvl, gc in zip(levels, grid_colors):
        lv = [lvl] * N + [lvl]
        ax.plot(angs, lv, color=gc, linewidth=1.0, linestyle='-', alpha=1.0)
        if lvl in [40, 80]:
            ax.text(angles[0], lvl + 6, str(lvl), fontproperties=_fp(size=6.5), color="#4a5580",
                    ha='center', va='bottom')

    for angle in angles:
        ax.plot([angle, angle], [0, 100], color="#1e2545", linewidth=0.9, alpha=1.0)

    ax.fill(angs, vals, color=color, alpha=0.22)
    ax.plot(angs, vals, color=color, linewidth=2.4,
            path_effects=[pe.Stroke(linewidth=4.5, foreground=color, alpha=0.25), pe.Normal()])
    ax.scatter(angles, values, color=color, s=55, zorder=5,
               path_effects=[pe.Stroke(linewidth=2.5, foreground=BG, alpha=1), pe.Normal()])

    ax.set_xticks(angles)
    ax.set_xticklabels(labels, fontproperties=_fp(size=8.5), color=WHITE)
    ax.set_ylim(0, 100)
    ax.set_yticks([])
    ax.tick_params(pad=10)
    if title:
        ax.set_title(title, fontproperties=_fp(bold=True, size=11), color=WHITE, pad=14)


def _trait_bars(fig, y0, y1, keys, colors, names, values, dom_key=None):
    """Горизонтальные бары с подписями. Возвращает y после блока."""
    ax = fig.add_axes([0.07, y1, 0.86, y0 - y1])
    ax.set_facecolor(BG)
    for spine in ax.spines.values():
        spine.set_visible(False)
    n = len(keys)
    y_pos = list(range(n - 1, -1, -1))
    for i, (key, color) in enumerate(zip(keys, colors)):
        val  = values.get(key, 0)
        yp   = y_pos[i]
        name = names[i] if i < len(names) else key
        is_dom = key == dom_key
        ax.barh(yp, 100, color=DIM, height=0.5)
        ax.barh(yp, val, color=color, alpha=1.0 if is_dom else 0.85, height=0.5)
        label = f"{name}" + ("  ★" if is_dom else "")
        ax.text(-2, yp, label, fontproperties=_fp(bold=is_dom, size=9.5),
                color=WHITE if is_dom else GRAY, ha='right', va='center')
        ax.text(102, yp, str(val), fontproperties=_fp(bold=True, size=9.5), color=color, ha='left', va='center')
    ax.set_xlim(-40, 116)
    ax.set_ylim(-0.6, n - 0.4)
    ax.set_xticks([]); ax.set_yticks([])
    return y1


def _wrap_text(s, width_chars):
    words = s.split()
    lines, line = [], ''
    for w in words:
        test = (line + ' ' + w).strip()
        if len(test) <= width_chars:
            line = test
        else:
            if line: lines.append(line)
            line = w
    if line: lines.append(line)
    return lines


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

    trait_names = t("card_trait_names")
    if not isinstance(trait_names, list):
        trait_names = ["O", "C", "E", "A", "S"]

    riasec_names = t("card_riasec_names")
    if not isinstance(riasec_names, list):
        riasec_names = RIASEC_KEYS

    riasec_labels = t("card_riasec_labels")
    if not isinstance(riasec_labels, dict):
        riasec_labels = {k: k for k in RIASEC_KEYS}

    growth_tips = t("pdf_growth_tips")
    if not isinstance(growth_tips, dict):
        growth_tips = {}

    dom_label   = riasec_labels.get(dom_key, dom_key)
    top_score   = max(normalized_scores.values()) if normalized_scores else 0
    top_trait   = next((k for k in TRAIT_KEYS if normalized_scores.get(k) == top_score), TRAIT_KEYS[0])
    top_trait_name = trait_names[TRAIT_KEYS.index(top_trait)]

    buf = io.BytesIO()
    total_pages = 3

    with PdfPages(buf) as pdf:
        # ── Страница 1: Тип личности + Big Five ─────────────────────────────
        fig = _new_page()
        _header(fig, name, date, t("pdf_subtitle"))

        fig.text(0.07, 0.90,
                 "ТВОЙ ПРОФЕССИОНАЛЬНЫЙ ТИП" if lang == "ru" else "YOUR PROFESSIONAL TYPE",
                 fontproperties=_fp(size=9), color=GRAY, va='top')
        fig.text(0.07, 0.875, dom_label, fontproperties=_fp(bold=True, size=30), color=WHITE, va='top')
        fig.text(0.07, 0.825,
                 (f"{'Сильная черта' if lang == 'ru' else 'Top trait'}: {top_trait_name} — {top_score}%"),
                 fontproperties=_fp(size=10.5), color=CYAN, va='top')

        y = _section_title(fig, 0.775, t("pdf_section_big5"))

        ax_radar = fig.add_axes([0.24, 0.50, 0.52, 0.26], projection='polar')
        _radar(ax_radar, [normalized_scores.get(k, 0) for k in TRAIT_KEYS], trait_names, CYAN, None)

        y_bars_top = 0.475
        _trait_bars(fig, y_bars_top, y_bars_top - 0.155, TRAIT_KEYS, TRAIT_COLORS, trait_names,
                    normalized_scores, dom_key=top_trait)

        # Описания черт под барами
        ty = y_bars_top - 0.19
        for i, key in enumerate(TRAIT_KEYS):
            _, desc = growth_tips.get(key, (trait_names[i], ""))
            val = normalized_scores.get(key, 0)
            color = TRAIT_COLORS[i]
            fig.text(0.07, ty, f"{trait_names[i]} ({val}%)", fontproperties=_fp(bold=True, size=8.5), color=color, va='top')
            lines = _wrap_text(desc, 92)
            for j, line in enumerate(lines[:2]):
                fig.text(0.07, ty - 0.014 - j * 0.013, line, fontproperties=_fp(size=8), color=GRAY, va='top')
            ty -= 0.014 + len(lines[:2]) * 0.013 + 0.012

        _footer(fig, 1, total_pages, lang)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # ── Страница 2: RIASEC + зоны роста ──────────────────────────────────
        fig = _new_page()
        _header(fig, name, date, t("pdf_subtitle"))

        y = _section_title(fig, 0.90, t("pdf_section_riasec"))

        ax_radar2 = fig.add_axes([0.24, 0.63, 0.52, 0.26], projection='polar')
        _radar(ax_radar2, [riasec.get(k, 0) for k in RIASEC_KEYS], riasec_names, PURPLE, None)

        _trait_bars(fig, 0.605, 0.605 - 0.18, RIASEC_KEYS, RIASEC_COLORS, riasec_names, riasec, dom_key=dom_key)

        y = _section_title(fig, 0.395, t("pdf_section_growth"))
        weak = sorted(TRAIT_KEYS, key=lambda k: normalized_scores.get(k, 0))[:2]
        ty = 0.365
        for key in weak:
            val = normalized_scores.get(key, 0)
            gname, rec = growth_tips.get(key, (key, ""))
            fig.text(0.07, ty, f"{gname} — {val}%", fontproperties=_fp(bold=True, size=9.5), color=WHITE, va='top')
            ty -= 0.02
            lines = _wrap_text(rec, 95)
            for line in lines:
                fig.text(0.07, ty, line, fontproperties=_fp(size=8.5), color=GRAY, va='top')
                ty -= 0.017
            ty -= 0.015

        _footer(fig, 2, total_pages, lang)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # ── Страница 3: Топ-3 профессии ──────────────────────────────────────
        fig = _new_page()
        _header(fig, name, date, t("pdf_subtitle2"))
        _section_title(fig, 0.90, t("pdf_section_top3"))

        card_h = 0.265
        card_gap = 0.02
        y_top = 0.87
        for i, prof in enumerate(top_professions[:3]):
            details = details_list[i] if i < len(details_list) else {}
            details = details or {}
            title       = prof.get('title', '')
            match_pct   = prof.get('match', 0)
            riasec_type = prof.get('riasec', '')
            growth      = prof.get('growth', '')
            description = details.get('reality') or details.get('description') or prof.get('description', '')
            pros = [p for p in (details.get('pros') or []) if p][:3]
            cons = [p for p in (details.get('cons') or []) if p][:3]

            y_card = y_top - i * (card_h + card_gap)
            mc = MEDAL_COLORS[i]

            ax = fig.add_axes([0.07, y_card - card_h, 0.86, card_h])
            ax.set_facecolor(BG_PANEL)
            ax.set_xlim(0, 1); ax.set_ylim(0, 1)
            for spine in ax.spines.values():
                spine.set_color(mc); spine.set_linewidth(1.0); spine.set_alpha(0.6)
            ax.set_xticks([]); ax.set_yticks([])

            ax.text(0.02, 0.90, MEDALS[i], fontproperties=_fp(bold=True, size=15), color=mc, ha='left', va='top')
            title_lines = _wrap_text(title, 42)
            ax.text(0.11, 0.90, title_lines[0] if title_lines else title,
                    fontproperties=_fp(bold=True, size=12), color=WHITE, ha='left', va='top')
            ax.text(0.98, 0.90, f"{match_pct}%", fontproperties=_fp(bold=True, size=15), color=mc, ha='right', va='top')

            rl = riasec_labels.get(riasec_type, riasec_type)
            ax.text(0.11, 0.80, rl, fontproperties=_fp(size=8), color=GRAY, ha='left', va='top')

            desc_lines = _wrap_text(description, 100)[:2]
            dy = 0.70
            for line in desc_lines:
                ax.text(0.02, dy, line, fontproperties=_fp(size=8.5), color="#c6cbe0", ha='left', va='top')
                dy -= 0.075

            # Плюсы / минусы в две колонки
            col_y = dy - 0.03
            if pros or cons:
                ax.text(0.02, col_y, t("pdf_pros"), fontproperties=_fp(bold=True, size=8), color=CYAN, ha='left', va='top')
                ax.text(0.52, col_y, t("pdf_cons"), fontproperties=_fp(bold=True, size=8), color=RED_SOFT, ha='left', va='top')
                py = col_y - 0.07
                for p in pros:
                    for line in _wrap_text(f"+ {p}", 44)[:1]:
                        ax.text(0.02, py, line, fontproperties=_fp(size=7.5), color=CYAN, ha='left', va='top')
                        py -= 0.055
                cy = col_y - 0.07
                for c in cons:
                    for line in _wrap_text(f"- {c}", 44)[:1]:
                        ax.text(0.52, cy, line, fontproperties=_fp(size=7.5), color=RED_SOFT, ha='left', va='top')
                        cy -= 0.055

            if growth:
                ax.text(0.98, 0.04, f"{t('pdf_prospects')}: {growth}",
                        fontproperties=_fp(size=7.5), color=GRAY, ha='right', va='bottom')

        _footer(fig, 3, total_pages, lang)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

    buf.seek(0)
    pdf_bytes = buf.read()

    if output_path:
        with open(output_path, 'wb') as f:
            f.write(pdf_bytes)

    logger.info(f'PDF generated (v6 Aurora/matplotlib): lang={lang}, size={len(pdf_bytes)} bytes')
    return pdf_bytes
