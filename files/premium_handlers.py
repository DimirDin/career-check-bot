"""
premium_handlers.py — хендлеры оплаты Telegram Stars и выдачи Premium PDF.

Подключить в main.py:
    from bot.premium_handlers import premium_router
    dp.include_router(premium_router)

В config/settings.py добавить:
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    PREMIUM_PRICE_STARS = 99
"""

import asyncio
import logging
from datetime import datetime

from aiogram import Router, F
from aiogram.types import (
    CallbackQuery, Message,
    LabeledPrice, PreCheckoutQuery,
    InlineKeyboardMarkup, InlineKeyboardButton,
)

from db.database import get_last_result, get_professions, get_profession_details_by_title_lang
from services.premium_pdf_generator import generate_premium_pdf
from locales import get_text
from config.settings import ANTHROPIC_API_KEY, PREMIUM_PRICE_STARS
import json

logger = logging.getLogger(__name__)
premium_router = Router()

SUPPORT_BOT = "@CareerCheckSupport"


# ── Кнопка "Получить Premium PDF" ────────────────────────────────────────────

@premium_router.callback_query(F.data == "buy_premium_pdf")
async def cb_buy_premium(call: CallbackQuery, pool):
    """Показывает инвойс Telegram Stars."""
    lang = await _get_lang(pool, call.from_user.id)
    t    = lambda k: get_text(k, lang)

    if lang == "ru":
        title   = "Premium Career Report"
        desc    = (
            "🌟 Персональный AI-отчёт о карьере — 6 страниц:\n\n"
            "• Психологический портрет\n"
            "• Big Five + RIASEC визуализация\n"
            "• Карьерное видение на 5 и 10 лет\n"
            "• Глубокий анализ профессии #1\n"
            "• Роадмап + навыки + курсы\n"
            "• Личное послание от AI-коуча"
        )
    else:
        title = "Premium Career Report"
        desc  = (
            "🌟 Personal AI Career Report — 6 pages:\n\n"
            "• Psychological portrait\n"
            "• Big Five + RIASEC visualization\n"
            "• 5 and 10-year career vision\n"
            "• Deep analysis of profession #1\n"
            "• Roadmap + skills + courses\n"
            "• Personal message from AI coach"
        )

    await call.message.answer_invoice(
        title         = title,
        description   = desc,
        payload       = "premium_pdf_v1",
        currency      = "XTR",           # Telegram Stars
        prices        = [LabeledPrice(label="Premium PDF", amount=PREMIUM_PRICE_STARS)],
        # provider_token пустой — Stars не требуют токена провайдера
    )
    await call.answer()


# ── Pre-checkout ──────────────────────────────────────────────────────────────

@premium_router.pre_checkout_query()
async def pre_checkout(query: PreCheckoutQuery):
    """Telegram вызывает это перед списанием — должны ответить ok в течение 10 сек."""
    await query.answer(ok=True)


# ── Успешная оплата ───────────────────────────────────────────────────────────

@premium_router.message(F.successful_payment)
async def payment_success(message: Message, pool):
    """Оплата прошла — генерируем Premium PDF."""
    lang = await _get_lang(pool, message.from_user.id)

    if lang == "ru":
        await message.answer("✅ Оплата получена! Генерирую ваш Premium-отчёт...\n⏳ Это займёт 15–30 секунд.")
    else:
        await message.answer("✅ Payment received! Generating your Premium Report...\n⏳ This takes 15–30 seconds.")

    try:
        # Получаем последние результаты теста
        from db.database import get_user
        db_user = await get_user(pool, message.from_user.id)
        if not db_user:
            raise ValueError("User not found")

        result = await get_last_result(pool, db_user["id"])
        if not result:
            raise ValueError("No test results")

        def _parse(v):
            return json.loads(v) if isinstance(v, str) else v

        normalized     = _parse(result["normalized_scores"])
        riasec         = _parse(result["riasec_profile"])
        top_professions = _parse(result["top_professions"])

        # Детали профессий
        details_list = []
        for prof in top_professions[:3]:
            det = await get_profession_details_by_title_lang(pool, prof["title"], lang)
            details_list.append(det or {})

        user_data = {
            "full_name": message.from_user.full_name or "User",
            "date":      datetime.now().strftime("%d.%m.%Y"),
        }

        # Генерируем Premium PDF (синхронный в executor)
        loop = asyncio.get_event_loop()
        pdf_bytes = await loop.run_in_executor(
            None,
            lambda: asyncio.run(generate_premium_pdf(
                user_data        = user_data,
                normalized_scores= normalized,
                riasec           = riasec,
                top_professions  = top_professions,
                details_list     = details_list,
                lang             = lang,
                api_key          = ANTHROPIC_API_KEY,
            ))
        )

        # Отправляем PDF
        from aiogram import types
        caption = (
            "🌟 Ваш Premium Career Report готов!\n\n"
            f"Вопросы? Обращайтесь: {SUPPORT_BOT}"
        ) if lang == "ru" else (
            f"🌟 Your Premium Career Report is ready!\n\nQuestions? Contact: {SUPPORT_BOT}"
        )

        await message.answer_document(
            document = types.BufferedInputFile(pdf_bytes, filename="CareerCheck_Premium.pdf"),
            caption  = caption,
        )

        logger.info(f"Premium PDF sent to user {message.from_user.id}")

    except Exception as e:
        logger.error(f"Premium PDF generation failed: {e}", exc_info=True)
        err_msg = (
            f"❌ Произошла ошибка при генерации отчёта.\n"
            f"Напишите нам — {SUPPORT_BOT}, мы поможем."
        ) if lang == "ru" else (
            f"❌ An error occurred generating your report.\n"
            f"Contact us at {SUPPORT_BOT} — we'll help you."
        )
        await message.answer(err_msg)


# ── Хелпер: получить язык пользователя ───────────────────────────────────────

async def _get_lang(pool, telegram_id: int) -> str:
    try:
        from db.database import get_user
        user = await get_user(pool, telegram_id)
        return user["lang"] if user else "ru"
    except Exception:
        return "ru"


# ── Утилита: кнопка "Получить Premium" для вставки в finish_test ─────────────

def premium_keyboard(lang: str) -> InlineKeyboardMarkup:
    """Кнопка для добавления после результатов теста."""
    if lang == "ru":
        btn_text = "🌟 Получить Premium PDF — 99 Stars"
    else:
        btn_text = "🌟 Get Premium PDF — 99 Stars"

    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=btn_text, callback_data="buy_premium_pdf")
    ]])
