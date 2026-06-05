# ── Патчи для существующих файлов ─────────────────────────────────────────────

# ═══════════════════════════════════════════════════════════════
# 1. services/card_generator.py
#    Заменить @Dimirdin → @CareerCheckSupport
# ═══════════════════════════════════════════════════════════════

# Найти (строки ~249-251):
#     # @Dimirdin — правый угол футера
#     fig.text(0.94, 0.035, "@Dimirdin",
#              fontproperties=_fp(size=7), color=PURPLE,
#              transform=fig.transFigure, ha='right')

# Заменить на:
#     fig.text(0.94, 0.035, "@CareerCheckSupport",
#              fontproperties=_fp(size=7), color=PURPLE,
#              transform=fig.transFigure, ha='right')


# ═══════════════════════════════════════════════════════════════
# 2. services/pdf_generator.py
#    draw_footer — добавить @CareerCheckSupport
# ═══════════════════════════════════════════════════════════════

# Найти функцию draw_footer и заменить строку футера:
# БЫЛО:
#     text(c, M, y, get_text("pdf_footer_left", lang), FONT_REG, 6, MUTED)
#
# СТАЛО:
#     text(c, M, y, "@CareerCheckSupport  ·  careercheck.app", FONT_REG, 6, MUTED)


# ═══════════════════════════════════════════════════════════════
# 3. bot/handlers.py — finish_test
#    Убрать бесплатный PDF, добавить кнопку Premium
# ═══════════════════════════════════════════════════════════════

# В начало файла добавить импорт:
from bot.premium_handlers import premium_keyboard

# Найти блок генерации PDF (~строки 530-565):
#         # PDF
#         try:
#             ...
#             await message.answer_document(...)
#         except Exception as e:
#             logger.error(f"PDF generation error: {e}", ...)

# ПОЛНОСТЬЮ ЗАМЕНИТЬ НА (PDF больше не бесплатный):
#         # Предлагаем Premium PDF
#         await message.answer(
#             "🌟 <b>Хотите детальный отчёт?</b>\n\n"
#             "Premium PDF — 6 страниц с персональным AI-анализом:\n"
#             "• Психологический портрет\n"
#             "• Карьерное видение на 5 и 10 лет\n"
#             "• Роадмап и конкретные шаги\n"
#             "• Ресурсы и курсы под ваш профиль\n\n"
#             "Всего <b>99 Stars</b> (~$1)",
#             reply_markup=premium_keyboard(lang),
#         )


# ═══════════════════════════════════════════════════════════════
# 4. config/settings.py — добавить переменные
# ═══════════════════════════════════════════════════════════════

# Добавить в конец файла:
# import os
# ANTHROPIC_API_KEY  = os.getenv("ANTHROPIC_API_KEY", "")
# PREMIUM_PRICE_STARS = int(os.getenv("PREMIUM_PRICE_STARS", "99"))


# ═══════════════════════════════════════════════════════════════
# 5. main.py — подключить premium_router
# ═══════════════════════════════════════════════════════════════

# Добавить импорт:
# from bot.premium_handlers import premium_router

# После dp.include_router(router) добавить:
# dp.include_router(premium_router)


# ═══════════════════════════════════════════════════════════════
# 6. .env — добавить ключ
# ═══════════════════════════════════════════════════════════════

# ANTHROPIC_API_KEY=sk-ant-ВАШ_КЛЮЧ
# PREMIUM_PRICE_STARS=99


# ═══════════════════════════════════════════════════════════════
# 7. requirements.txt — добавить зависимости
# ═══════════════════════════════════════════════════════════════

# httpx>=0.27.0
# pypdf>=4.0.0
