"""
premium_handlers.py — хендлеры оплаты Telegram Stars и выдачи Premium PDF.

Подключить в main.py:
    from bot.premium_handlers import premium_router
    dp.include_router(premium_router)
"""

import base64
import logging
from datetime import datetime

import redis.asyncio as aioredis
from aiogram import Router, F
from aiogram import types
from aiogram.types import (
    CallbackQuery, Message,
    LabeledPrice, PreCheckoutQuery,
    InlineKeyboardMarkup, InlineKeyboardButton,
)

from db.database import get_last_result, get_profession_details_by_title_lang, get_user
from services.premium_pdf_generator import generate_premium_pdf
from locales import get_text
from config.settings import ANTHROPIC_API_KEY, PREMIUM_PRICE_STARS, get_ab_price
import json

logger = logging.getLogger(__name__)
premium_router = Router()

SUPPORT_BOT = "@CareerCheckSupport"
PAYLOAD = "premium_pdf_v1"


# ── Кнопка "Получить Premium PDF" ────────────────────────────────────────────

@premium_router.callback_query(F.data == "buy_premium_pdf")
async def cb_buy_premium(call: CallbackQuery, pool):
    """Показывает инвойс Telegram Stars. Сначала проверяет наличие результатов теста."""
    lang  = await _get_lang(pool, call.from_user.id)
    price = get_ab_price(call.from_user.id)   # M2: A/B test

    # Проверяем что тест пройден — иначе инвойс бессмысленен
    db_user = await get_user(pool, call.from_user.id)
    if db_user:
        result = await get_last_result(pool, db_user["id"])
    else:
        result = None

    if not result:
        msg = (
            "❌ Сначала пройдите тест — Premium PDF строится на ваших результатах.\n"
            "Нажмите /start чтобы начать."
        ) if lang == "ru" else (
            "❌ Please complete the test first — Premium PDF is built from your results.\n"
            "Press /start to begin."
        )
        await call.answer(msg, show_alert=True)
        return

    if lang == "ru":
        title = "Premium Career Report"
        desc  = (
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
        title       = title,
        description = desc,
        payload     = PAYLOAD,
        currency    = "XTR",
        prices      = [LabeledPrice(label="Premium PDF", amount=price)],
    )
    logger.info(f"Invoice sent: user={call.from_user.id}, price={price} Stars (A/B group {call.from_user.id % 3})")
    await call.answer()


# ── Pre-checkout ──────────────────────────────────────────────────────────────

@premium_router.pre_checkout_query()
async def pre_checkout(query: PreCheckoutQuery):
    """Telegram вызывает это перед списанием — должны ответить ok в течение 10 сек."""
    # Проверяем payload на случай если в будущем добавятся другие платные функции
    if query.invoice_payload != PAYLOAD:
        await query.answer(ok=False, error_message="Unknown product")
        return
    await query.answer(ok=True)


# ── Успешная оплата ───────────────────────────────────────────────────────────

@premium_router.message(F.successful_payment)
async def payment_success(message: Message, pool, redis: aioredis.Redis = None):
    """Оплата прошла — генерируем Premium PDF."""
    # Игнорируем платежи не от нашего инвойса
    if message.successful_payment.invoice_payload != PAYLOAD:
        return

    lang = await _get_lang(pool, message.from_user.id)

    await message.answer(
        "✅ Оплата получена! Генерирую ваш Premium-отчёт...\n⏳ Это займёт 15–30 секунд."
        if lang == "ru" else
        "✅ Payment received! Generating your Premium Report...\n⏳ This takes 15–30 seconds."
    )

    try:
        db_user = await get_user(pool, message.from_user.id)
        if not db_user:
            raise ValueError("User not found")

        result = await get_last_result(pool, db_user["id"])
        if not result:
            raise ValueError("No test results")

        def _parse(v):
            return json.loads(v) if isinstance(v, str) else v

        normalized      = _parse(result["normalized_scores"])
        riasec          = _parse(result["riasec_profile"])
        top_professions = _parse(result["top_professions"])

        details_list = []
        for prof in top_professions[:3]:
            det = await get_profession_details_by_title_lang(pool, prof["title"], lang)
            details_list.append(det or {})

        user_data = {
            "full_name": message.from_user.full_name or "User",
            "date":      datetime.now().strftime("%d.%m.%Y"),
        }

        # generate_premium_pdf — async функция, вызываем напрямую
        pdf_bytes = await generate_premium_pdf(
            user_data         = user_data,
            normalized_scores = normalized,
            riasec            = riasec,
            top_professions   = top_professions,
            details_list      = details_list,
            lang              = lang,
            api_key           = ANTHROPIC_API_KEY,
        )

        caption = (
            f"🌟 Ваш Premium Career Report готов!\n\nВопросы? Обращайтесь: {SUPPORT_BOT}"
            if lang == "ru" else
            f"🌟 Your Premium Career Report is ready!\n\nQuestions? Contact: {SUPPORT_BOT}"
        )

        # Сохраняем PDF в Redis для Mini App (TTL 10 минут)
        if redis:
            try:
                await redis.setex(
                    f"premium_pdf:{message.from_user.id}",
                    600,
                    base64.b64encode(pdf_bytes).decode(),
                )
            except Exception as re:
                logger.warning(f"Redis PDF store error: {re}")

        await message.answer_document(
            document = types.BufferedInputFile(pdf_bytes, filename="CareerCheck_Premium.pdf"),
            caption  = caption,
        )

        logger.info(
            f"Premium PDF sent: user={message.from_user.id}, "
            f"stars={message.successful_payment.total_amount}, lang={lang}"
        )

    except Exception as e:
        logger.error(f"Premium PDF generation failed: {e}", exc_info=True)
        await message.answer(
            f"❌ Произошла ошибка при генерации отчёта.\nНапишите нам — {SUPPORT_BOT}, мы поможем."
            if lang == "ru" else
            f"❌ An error occurred generating your report.\nContact us at {SUPPORT_BOT} — we'll help you."
        )


# ── Хелпер: получить язык пользователя ───────────────────────────────────────

async def _get_lang(pool, telegram_id: int) -> str:
    try:
        user = await get_user(pool, telegram_id)
        return user["lang"] if user else "ru"
    except Exception:
        return "ru"


# ── Утилита: кнопка "Получить Premium" для вставки в finish_test ─────────────

def premium_keyboard(lang: str) -> InlineKeyboardMarkup:
    btn_text = (
        f"🌟 Получить Premium PDF — {PREMIUM_PRICE_STARS} Stars"
        if lang == "ru" else
        f"🌟 Get Premium PDF — {PREMIUM_PRICE_STARS} Stars"
    )
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=btn_text, callback_data="buy_premium_pdf")
    ]])
