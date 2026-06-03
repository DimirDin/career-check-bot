"""
CareerCheck — sharing card generator v2.
Изменения v2:
- Принимает lang: str для локализации подписей
- @Dimirdin в футере
"""

import io
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import matplotlib.patches as mpatches
import matplotlib.patheffects as pe

from locales import get_text

# ── Шрифт ────────────────────────────────────────────────────────────────────
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

# ── Палитра ───────────────────────────────────────────────────────────────────
BG       = "#0d0d1a"
BG_PANEL = "#12122a"
PURPLE   = "#7c3aed"
BLUE     = "#3b82f6"
CYAN     = "#06b6d4"
GREEN    = "#10b981"
ORANGE   = "#f59e0b"
WHITE    = "#ffffff"
GRAY     = "#94a3b8"
DIM      = "#334155"
GOLD     = "#fbbf24"
SILVER   = "#94a3b8"
BRONZE   = "#cd7c3f"

TRAIT_COLORS = [PURPLE, BLUE, ORANGE, GREEN, CYAN]
TRAIT_KEYS   = ["O", "C", "E", "A", "S"]
RIASEC_KEYS  = ["R", "I", "A", "S", "E", "C"]
MEDAL_COLORS = [GOLD, SILVER, BRONZE]
MEDALS       = ["#1", "#2", "#3"]


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
            ax.text(angles[0], lvl + 6, str(lvl),
                    fontproperties=_fp(size=6), color="#4a5580",
                    ha='center', va='bottom')

    for angle in angles:
        ax.plot([angle, angle], [0, 100], color="#1e2545", linewidth=0.9, alpha=1.0)

    ax.fill(angs, vals, color=color, alpha=0.22)
    ax.plot(angs, vals, color=color, linewidth=2.2,
            path_effects=[pe.Stroke(linewidth=4, foreground=color, alpha=0.25), pe.Normal()])
    ax.scatter(angles, values, color=color, s=40, zorder=5,
               path_effects=[pe.Stroke(linewidth=2.5, foreground=BG, alpha=1), pe.Normal()])

    ax.set_xticks(angles)
    ax.set_xticklabels(labels, fontproperties=_fp(size=7), color=GRAY)
    ax.set_ylim(0, 100)
    ax.set_yticks([])
    ax.tick_params(pad=7)
    ax.set_title(title, fontproperties=_fp(bold=True, size=10), color=WHITE, pad=12)


def generate_share_card(
    normalized: dict,
    riasec: dict,
    top_professions: list,
    lang: str = "ru",
) -> bytes:
    t = lambda key: get_text(key, lang)

    # Локализованные данные
    trait_names   = t("card_trait_names")
    if not isinstance(trait_names, list):
        trait_names = ["O", "C", "E", "A", "S"]

    riasec_names  = t("card_riasec_names")
    if not isinstance(riasec_names, list):
        riasec_names = ["R", "I", "A", "S", "E", "C"]

    riasec_labels = t("card_riasec_labels")
    if not isinstance(riasec_labels, dict):
        riasec_labels = {k: k for k in RIASEC_KEYS}

    dom       = max(riasec, key=riasec.get)
    dom_label = riasec_labels.get(dom, dom)

    fig = plt.figure(figsize=(8, 13), facecolor=BG)

    # ── 1. Шапка ─────────────────────────────────────────────────────────────
    fig.text(0.06, 0.965, "CAREER", fontproperties=_fp(bold=True, size=22),
             color=WHITE, va='top', transform=fig.transFigure)
    fig.text(0.345, 0.965, "CHECK", fontproperties=_fp(bold=True, size=22),
             color=PURPLE, va='top', transform=fig.transFigure)

    fig.text(0.06, 0.935, t("card_your_type"),
             fontproperties=_fp(size=9), color=GRAY,
             va='top', transform=fig.transFigure)
    fig.text(0.06, 0.915, dom_label,
             fontproperties=_fp(bold=True, size=26), color=WHITE,
             va='top', transform=fig.transFigure)

    fig.add_artist(plt.Line2D([0.06, 0.94], [0.855, 0.855],
                              transform=fig.transFigure,
                              color=PURPLE, alpha=0.4, linewidth=1.0))

    # ── 2. Радары ─────────────────────────────────────────────────────────────
    ax1 = fig.add_axes([0.04, 0.57, 0.44, 0.27], projection='polar')
    _radar(ax1, [normalized.get(k, 0) for k in TRAIT_KEYS], trait_names, CYAN, t("card_big5_title"))

    ax2 = fig.add_axes([0.52, 0.57, 0.44, 0.27], projection='polar')
    _radar(ax2, [riasec.get(k, 0) for k in RIASEC_KEYS], riasec_names, PURPLE, t("card_riasec_title"))

    fig.add_artist(plt.Line2D([0.06, 0.94], [0.555, 0.555],
                              transform=fig.transFigure,
                              color=PURPLE, alpha=0.2, linewidth=0.8))

    # ── 3. Бары профиля ───────────────────────────────────────────────────────
    ax3 = fig.add_axes([0.06, 0.33, 0.88, 0.21])
    ax3.set_facecolor(BG_PANEL)
    for spine in ax3.spines.values():
        spine.set_color(DIM); spine.set_linewidth(0.5)
    ax3.set_title(t("card_profile"), fontproperties=_fp(bold=True, size=9),
                  color=GRAY, loc='left', pad=8)

    y_pos = list(range(len(TRAIT_KEYS) - 1, -1, -1))
    for i, (key, color) in enumerate(zip(TRAIT_KEYS, TRAIT_COLORS)):
        val  = normalized.get(key, 0)
        yp   = y_pos[i]
        name = trait_names[i] if i < len(trait_names) else key
        ax3.barh(yp, 100, color="#1e2040", height=0.55)
        ax3.barh(yp, val, color=color, alpha=0.9, height=0.55)
        ax3.text(-1, yp, name, fontproperties=_fp(size=8.5),
                 color=WHITE, ha='right', va='center')
        ax3.text(102, yp, str(val), fontproperties=_fp(bold=True, size=8.5),
                 color=color, ha='left', va='center')

    ax3.set_xlim(-32, 112)
    ax3.set_ylim(-0.6, len(TRAIT_KEYS) - 0.4)
    ax3.set_xticks([]); ax3.set_yticks([])
    ax3.tick_params(left=False, bottom=False)

    fig.add_artist(plt.Line2D([0.06, 0.94], [0.315, 0.315],
                              transform=fig.transFigure,
                              color=PURPLE, alpha=0.2, linewidth=0.8))

    # ── 4. Топ профессий ──────────────────────────────────────────────────────
    ax4 = fig.add_axes([0.06, 0.06, 0.88, 0.245])
    ax4.set_facecolor(BG)
    ax4.axis('off')
    ax4.set_title(t("card_top_profs"), fontproperties=_fp(bold=True, size=9),
                  color=GRAY, loc='left', pad=8)

    for i, prof in enumerate(top_professions[:3]):
        title = prof["title"]
        match = prof["match"]
        mc    = MEDAL_COLORS[i]
        yp    = 0.76 - i * 0.30

        rect = mpatches.FancyBboxPatch(
            (0.0, yp - 0.07), 1.0, 0.24,
            boxstyle="round,pad=0.015",
            transform=ax4.transAxes,
            facecolor=BG_PANEL, edgecolor=mc, linewidth=1.0, alpha=0.9
        )
        ax4.add_patch(rect)
        bar_rect = mpatches.FancyBboxPatch(
            (0.0, yp - 0.07), 0.012, 0.24,
            boxstyle="square,pad=0.0",
            transform=ax4.transAxes,
            facecolor=mc, edgecolor='none'
        )
        ax4.add_patch(bar_rect)

        ax4.text(0.03, yp + 0.04, MEDALS[i],
                 transform=ax4.transAxes,
                 fontproperties=_fp(bold=True, size=14),
                 color=mc, ha='left', va='center')

        if len(title) <= 30:
            title_short = title
        else:
            words = title.split(); title_short = ""
            for w in words:
                candidate = (title_short + " " + w).strip()
                if len(candidate) <= 28:
                    title_short = candidate
                else:
                    break
            if not title_short:
                title_short = title[:28]
            title_short += "…"

        ax4.text(0.10, yp + 0.055, title_short,
                 transform=ax4.transAxes,
                 fontproperties=_fp(bold=True, size=10),
                 color=WHITE, ha='left', va='center')
        ax4.text(0.97, yp + 0.055, f"{match}%",
                 transform=ax4.transAxes,
                 fontproperties=_fp(bold=True, size=12),
                 color=mc, ha='right', va='center')

        riasec_type = prof.get("riasec", "")
        if riasec_type:
            rl = riasec_labels.get(riasec_type, riasec_type)
            ax4.text(0.10, yp - 0.015, rl,
                     transform=ax4.transAxes,
                     fontproperties=_fp(size=7.5),
                     color=GRAY, ha='left', va='center')

    # ── 5. Футер ──────────────────────────────────────────────────────────────
    fig.add_artist(plt.Line2D([0.06, 0.94], [0.048, 0.048],
                              transform=fig.transFigure,
                              color=PURPLE, alpha=0.25, linewidth=0.8))
    fig.text(0.06, 0.035, t("card_footer"),
             fontproperties=_fp(size=8), color=GRAY,
             transform=fig.transFigure)
    # @Dimirdin — правый угол футера
    fig.text(0.94, 0.035, "@Dimirdin",
             fontproperties=_fp(size=7), color=PURPLE,
             transform=fig.transFigure, ha='right')

    # ── Экспорт ───────────────────────────────────────────────────────────────
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                facecolor=BG, edgecolor='none')
    plt.close(fig)
    buf.seek(0)
    return buf.getvalue()
