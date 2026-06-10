import asyncio
import logging
import os
from datetime import datetime
import asyncpg
from aiogram import Router, F, types, Bot
from aiogram.types import (
    Message, CallbackQuery, InlineQuery,
    InlineQueryResultArticle, InputTextMessageContent,
    MenuButtonWebApp, WebAppInfo as BotWebAppInfo,
)
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from db.database import (
    create_user, get_user, update_user_lang, get_questions, save_result,
    get_professions, get_profession_details, get_profession_details_by_title_lang,
    get_stats, get_last_result,
    save_progress, get_progress, clear_progress,
    save_referral, get_referral_count, get_referrer,
    subscribe_challenges, unsubscribe_challenges,
)
from services.calculator import calculate_scores, calculate_riasec, match_professions
from services.pdf_generator import generate_pdf
from bot.premium_handlers import premium_keyboard
from services.card_generator import generate_share_card
from config.settings import ADMIN_IDS
from locales import get_text, resolve_lang

router = Router()
logger = logging.getLogger(__name__)


# ── Динамическая кнопка меню ──────────────────────────────────────────────────

async def update_menu_button_for_user(bot: Bot, user_id: int, pool: asyncpg.Pool) -> None:
    """
    Меняет текст кнопки чата под статус пользователя:
    - Нет теста       → "🚀 Начать тест"
    - Тест в процессе → "▶️ Продолжить тест"
    - Тест пройден    → "📊 Мои результаты"
    """
    domain = os.getenv("DOMAIN", "careercheck.app")
    base_url = f"https://{domain}"
    try:
        user     = await get_user(pool, user_id)
        progress = await get_progress(pool, user["id"]) if user else None

        if progress and 0 < progress.get("current_question", 0) < 60:
            text = "▶️ Продолжить тест"
            url  = base_url
        elif user and user.get("test_completed"):
            text = "📊 Мои результаты"
            url  = base_url
        else:
            text = "🚀 Начать тест"
            url  = base_url

        await bot.set_chat_menu_button(
            chat_id=user_id,
            menu_button=MenuButtonWebApp(text=text, web_app=BotWebAppInfo(url=url)),
        )
    except Exception as e:
        logger.debug(f"update_menu_button_for_user({user_id}): {e}")


class TestStates(StatesGroup):
    in_progress = State()
    finished    = State()


# Флаг блокировки: не даём нажать кнопку повторно пока обрабатывается ответ
_processing_users: set[int] = set()


# ── Вспомогательные функции ───────────────────────────────────────────────────

def make_bar(value: int, max_val: int = 100, width: int = 10) -> str:
    filled = round(value / max_val * width)
    return '▓' * filled + '░' * (width - filled)


def _make_progress_bar(current: int, total: int, width: int = 12) -> str:
    filled  = round(current / total * width)
    bar     = '▓' * filled + '░' * (width - filled)
    percent = round(current / total * 100)
    return f'[{bar}] {percent}%'


def get_trait_comment(trait: str, user_val: int, req_val: int, lang: str = "ru") -> str:
    diff = user_val - req_val
    if abs(diff) <= 10:
        return "✅ " + ("Идеально" if lang == "ru" else "Perfect")
    elif diff > 20:
        return "💪 " + ("Даже лучше, чем нужно" if lang == "ru" else "Even better than needed")
    elif diff > 0:
        return "👍 " + ("Немного выше нормы" if lang == "ru" else "Slightly above")
    elif diff > -20:
        return "⚠️ " + ("Ниже оптимума, но не критично" if lang == "ru" else "Below optimum, not critical")
    else:
        return "🚨 " + ("Нужно прокачать" if lang == "ru" else "Needs improvement")


def _welcome_image_path(lang: str) -> str:
    """Путь к картинке приветствия для языка. Фолбэк на welcome_en.png → welcome.png."""
    base = os.path.join(os.path.dirname(__file__), '..', 'assets')
    candidates = [
        os.path.join(base, f'welcome_{lang}.png'),
        os.path.join(base, 'welcome_en.png'),
        os.path.join(base, 'welcome.png'),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return candidates[-1]  # вернём путь даже если не существует — обработка в хендлере


def _riasec_label(key: str, lang: str) -> str:
    labels = {
        "ru": {'R': '🔧 Реалистичный', 'I': '🔬 Исследователь',
               'A': '🎨 Артист',        'S': '🤝 Социальный',
               'E': '💼 Предприимчивый','C': '📋 Конвенциональный'},
        "en": {'R': '🔧 Realistic', 'I': '🔬 Investigative',
               'A': '🎨 Artistic',  'S': '🤝 Social',
               'E': '💼 Enterprising','C': '📋 Conventional'},
        "hi": {'R': '🔧 यथार्थवादी', 'I': '🔬 खोजी',
               'A': '🎨 कलात्मक',   'S': '🤝 सामाजिक',
               'E': '💼 उद्यमी',    'C': '📋 पारंपरिक'},
        "es": {'R': '🔧 Realista', 'I': '🔬 Investigador',
               'A': '🎨 Artístico','S': '🤝 Social',
               'E': '💼 Emprendedor','C': '📋 Convencional'},
        "pt": {'R': '🔧 Realista', 'I': '🔬 Investigativo',
               'A': '🎨 Artístico','S': '🤝 Social',
               'E': '💼 Empreendedor','C': '📋 Convencional'},
    }
    return labels.get(lang, labels["en"]).get(key, key)


# ── Вспомогательные функции навигации ────────────────────────────────────────

async def show_main_hub(message: Message, pool: asyncpg.Pool, lang: str, user: dict) -> None:
    """Главное меню для вернувшегося пользователя."""
    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo as WAppInfo

    domain      = os.getenv("DOMAIN", "careercheck.app")
    miniapp_url = f"https://{domain}"
    first_name  = (
        message.from_user.first_name if hasattr(message, 'from_user') and message.from_user
        else message.chat.first_name or "друг"
    ) if hasattr(message, 'chat') else "друг"

    top_prof_text = ""
    try:
        last = await get_last_result(pool, user["id"])
        if last:
            import json as _json
            top_profs = last.get("top_professions")
            if isinstance(top_profs, str):
                top_profs = _json.loads(top_profs)
            if top_profs:
                tp = top_profs[0]
                top_prof_text = f"{tp.get('title', '')} — {tp.get('match', 0)}%"
    except Exception:
        pass

    if lang == "ru":
        text = (
            f"👋 <b>С возвращением, {first_name}!</b>\n\n"
            + (f"Твой лучший результат: <b>{top_prof_text}</b>\n\n" if top_prof_text else "")
            + "Что хочешь сделать?"
        )
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📋 Мой результат",       callback_data="my_result"),
             InlineKeyboardButton(text="🔄 Пройти снова",        callback_data="start_test_fresh")],
            [InlineKeyboardButton(text="🎯 Задания",             callback_data="show_challenges"),
             InlineKeyboardButton(text="👥 Пригласить друга",    callback_data="show_referral")],
            [InlineKeyboardButton(text="🚀 Открыть CareerCheck", web_app=WAppInfo(url=miniapp_url))],
        ])
    else:
        text = (
            f"👋 <b>Welcome back, {first_name}!</b>\n\n"
            + (f"Your best result: <b>{top_prof_text}</b>\n\n" if top_prof_text else "")
            + "What would you like to do?"
        )
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📋 My Result",           callback_data="my_result"),
             InlineKeyboardButton(text="🔄 Retake Test",         callback_data="start_test_fresh")],
            [InlineKeyboardButton(text="🎯 Challenges",          callback_data="show_challenges"),
             InlineKeyboardButton(text="👥 Invite a Friend",     callback_data="show_referral")],
            [InlineKeyboardButton(text="🚀 Open CareerCheck",    web_app=WAppInfo(url=miniapp_url))],
        ])

    await message.answer(text, reply_markup=kb)


async def show_onboarding(message: Message, lang: str) -> None:
    """Онбординг для нового пользователя."""
    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo as WAppInfo

    domain      = os.getenv("DOMAIN", "careercheck.app")
    miniapp_url = f"https://{domain}"
    first_name  = message.from_user.first_name or "друг"

    if lang == "ru":
        text = (
            f"🧠 <b>Привет, {first_name}!</b>\n\n"
            f"Я помогу тебе найти профессию, которая тебе действительно подходит.\n\n"
            f"<b>CareerCheck</b> использует научную модель <b>Big Five</b> — "
            f"ту же, что применяют HR-специалисты и психологи.\n\n"
            f"<b>Что ты получишь:</b>\n"
            f"📊 Психологический профиль личности\n"
            f"💼 Топ профессий с % совпадения\n"
            f"📚 Каталог из 160+ профессий\n\n"
            f"⚡️ <b>Быстрый тест</b> — 2 минуты, 10 вопросов\n"
            f"🎯 <b>Полный тест</b> — 15 минут, 60 вопросов"
        )
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🚀 Начать тест",          callback_data="start_test_fresh")],
            [InlineKeyboardButton(text="💼 Посмотреть профессии", web_app=WAppInfo(url=f"{miniapp_url}"))],
        ])
    else:
        text = (
            f"🧠 <b>Hey, {first_name}!</b>\n\n"
            f"I'll help you find a career that truly fits you.\n\n"
            f"<b>CareerCheck</b> uses the scientific <b>Big Five</b> model — "
            f"the same one used by HR professionals and psychologists.\n\n"
            f"<b>What you'll get:</b>\n"
            f"📊 Personality profile\n"
            f"💼 Top careers with % match\n"
            f"📚 Catalog of 160+ professions\n\n"
            f"⚡️ <b>Quick test</b> — 2 minutes, 10 questions\n"
            f"🎯 <b>Full test</b> — 15 minutes, 60 questions"
        )
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🚀 Start Test",           callback_data="start_test_fresh")],
            [InlineKeyboardButton(text="💼 Browse Professions",   web_app=WAppInfo(url=f"{miniapp_url}"))],
        ])

    await message.answer(text, reply_markup=kb)


async def show_referral_screen(message: Message, pool: asyncpg.Pool, tg_id: int) -> None:
    user   = await get_user(pool, tg_id)
    lang   = user['lang'] if user and user.get('lang') else 'ru'
    count  = await get_referral_count(pool, tg_id)
    bot_username = (await message.bot.me()).username
    link   = f"https://t.me/{bot_username}?start=ref_{tg_id}"

    if lang == 'ru':
        text = (
            f"🔗 <b>Твоя реферальная ссылка</b>\n\n"
            f"<code>{link}</code>\n\n"
            f"👥 Приглашено друзей: <b>{count}</b>\n\n"
            f"За каждого друга, который пройдёт тест — получишь уведомление.\n"
            f"Когда друг купит Premium — ты получишь скидку 50%!"
        )
    else:
        text = (
            f"🔗 <b>Your referral link</b>\n\n"
            f"<code>{link}</code>\n\n"
            f"👥 Friends invited: <b>{count}</b>\n\n"
            f"For every friend who completes the test — you'll get a notification.\n"
            f"When your friend buys Premium — you'll get 50% off!"
        )
    await message.answer(text)


async def show_challenges_screen(message: Message, pool: asyncpg.Pool, tg_id: int) -> None:
    user = await get_user(pool, tg_id)
    lang = user['lang'] if user and user.get('lang') else 'ru'
    await subscribe_challenges(pool, tg_id)

    if lang == 'ru':
        text = (
            "🎯 <b>Карьерные челленджи</b>\n\n"
            "Ты подписан! Каждый день в 9:00 я буду присылать тебе короткое карьерное задание.\n\n"
            "30 уникальных заданий, основанных на твоём профиле Big Five.\n\n"
            "Чтобы отписаться: /stop_challenges"
        )
    else:
        text = (
            "🎯 <b>Career Challenges</b>\n\n"
            "You're subscribed! Every day at 9:00 I'll send you a short career challenge.\n\n"
            "30 unique challenges based on your Big Five profile.\n\n"
            "To unsubscribe: /stop_challenges"
        )
    await message.answer(text)


# ── /start ────────────────────────────────────────────────────────────────────

@router.message(Command('start'))
async def cmd_start(message: Message, state: FSMContext, pool: asyncpg.Pool):
    await state.clear()

    # Устанавливаем кнопку меню для конкретного чата
    try:
        from aiogram.types import MenuButtonWebApp, WebAppInfo
        await message.bot.set_chat_menu_button(
            chat_id=message.chat.id,
            menu_button=MenuButtonWebApp(
                text="CareerCheck",
                web_app=WebAppInfo(url="https://careercheck.app"),
            ),
        )
    except Exception as e:
        logger.warning(f"[OPEN button] set_chat_menu_button error: {e}")

    tg_lang = message.from_user.language_code if message.from_user else None
    lang    = resolve_lang(tg_lang)

    command_args = message.text.split(maxsplit=1)[1] if message.text and ' ' in message.text else ''

    # Deep link: ref_USERID — реферальная программа
    if command_args.startswith('ref_'):
        try:
            referrer_id = int(command_args[4:])
            if referrer_id != message.from_user.id:
                await save_referral(pool, referrer_id, message.from_user.id)
                ref_count = await get_referral_count(pool, referrer_id)
                try:
                    if lang == 'ru':
                        await message.bot.send_message(
                            referrer_id,
                            f"🎉 Твой друг зарегистрировался по твоей ссылке!\n"
                            f"Всего приглашено: <b>{ref_count}</b>\n\n"
                            f"Когда друг пройдёт тест — ты получишь скидку 50% на Premium!"
                        )
                    else:
                        await message.bot.send_message(
                            referrer_id,
                            f"🎉 Your friend joined via your referral link!\n"
                            f"Total invited: <b>{ref_count}</b>\n\n"
                            f"When your friend completes the test — you'll get 50% off Premium!"
                        )
                except Exception:
                    pass
        except (ValueError, Exception) as e:
            logger.warning(f"Referral processing error: {e}")

    # Deep link: premium — из Mini App
    if command_args == 'premium':
        from bot.premium_handlers import premium_keyboard
        await message.answer(
            "🌟 <b>Premium Career Report</b>\n\n"
            "Персональный AI-анализ — 6 страниц:\n"
            "• Психологический портрет\n"
            "• Карьерное видение на 5 и 10 лет\n"
            "• Роадмап и конкретные шаги\n\n"
            "Всего <b>99 Stars</b> (~$1)",
            reply_markup=premium_keyboard(lang),
        )
        return

    user = None
    try:
        user = await get_user(pool, message.from_user.id)
        if not user:
            await create_user(
                pool,
                message.from_user.id,
                message.from_user.username,
                message.from_user.full_name,
                lang=lang,
            )
            logger.info(f"Created new user: {message.from_user.id}, lang={lang}")
            user = await get_user(pool, message.from_user.id)
        else:
            await update_user_lang(pool, message.from_user.id, lang)
    except Exception as e:
        logger.error(f"DB create_user error: {e}")

    # ── Проверяем незавершённый тест ──────────────────────────────────────────
    if user:
        progress = await get_progress(pool, user['id'])
        if progress and 0 < progress['current_question'] < 60:
            t = lambda key, **kw: get_text(key, lang, **kw)
            completed    = progress['current_question']
            percent      = round(completed / 60 * 100)
            minutes_left = max(1, (60 - completed) * 15 // 60)

            builder = InlineKeyboardBuilder()
            builder.button(text=t("btn_resume"),      callback_data='resume_test')
            builder.button(text=t("btn_start_fresh"), callback_data='start_test_fresh')
            builder.button(text=t("btn_about_test"),  callback_data='about_test')
            builder.adjust(1)

            await message.answer(
                t("resume_found", completed=completed, percent=percent, minutes_left=minutes_left),
                reply_markup=builder.as_markup()
            )
            return

    # ── Умный /start: хаб для вернувшихся, онбординг для новых ─────────────
    has_results = user and user.get("test_completed")
    if has_results:
        await show_main_hub(message, pool, lang, user)
    else:
        await show_onboarding(message, lang)

    try:
        await update_menu_button_for_user(message.bot, message.from_user.id, pool)
    except Exception as e:
        logger.debug(f"menu button update skipped: {e}")


# ── main_menu callback ────────────────────────────────────────────────────────

@router.callback_query(F.data == "main_menu")
async def cb_main_menu(callback: CallbackQuery, state: FSMContext, pool: asyncpg.Pool):
    await state.clear()
    user = await get_user(pool, callback.from_user.id)
    lang = user['lang'] if user and user.get('lang') else resolve_lang(callback.from_user.language_code)
    try:
        await callback.message.delete()
    except Exception:
        pass
    if user and user.get("test_completed"):
        await show_main_hub(callback.message, pool, lang, user)
    else:
        await show_onboarding(callback.message, lang)
    await callback.answer()


# ── show_challenges / show_referral callbacks ─────────────────────────────────

@router.callback_query(F.data == "show_challenges")
async def cb_show_challenges(callback: CallbackQuery, pool: asyncpg.Pool):
    await show_challenges_screen(callback.message, pool, callback.from_user.id)
    await callback.answer()


@router.callback_query(F.data == "show_referral")
async def cb_show_referral(callback: CallbackQuery, pool: asyncpg.Pool):
    await show_referral_screen(callback.message, pool, callback.from_user.id)
    await callback.answer()


# ── Возобновление теста ───────────────────────────────────────────────────────

@router.callback_query(F.data == 'resume_test')
async def resume_test(callback: CallbackQuery, state: FSMContext, pool: asyncpg.Pool):
    await callback.answer()

    user = await get_user(pool, callback.from_user.id)
    lang = user['lang'] if user and user.get('lang') else resolve_lang(callback.from_user.language_code)
    t    = lambda key, **kw: get_text(key, lang, **kw)

    if not user:
        await callback.message.edit_text(t("err_generic"))
        return

    progress = await get_progress(pool, user['id'])
    if not progress or progress['current_question'] >= 60:
        await callback.message.edit_text(t("err_no_progress"))
        return

    questions = await get_questions(pool, lang=lang)
    if not questions:
        await callback.message.edit_text(t("err_no_questions"))
        return

    await state.set_state(TestStates.in_progress)
    await state.update_data(
        answers=progress['answers'],
        current_question=progress['current_question'],
        questions=questions,
        db_user_id=user['id'],
        lang=lang,
    )

    await callback.message.edit_text(
        t("test_resumed", q_num=progress["current_question"] + 1)
    )
    await send_question(callback.message, state, pool, edit=False, telegram_user=callback.from_user)


# ── Начать тест с чистого листа ───────────────────────────────────────────────

@router.callback_query(F.data == 'start_test_fresh')
async def start_test_fresh(callback: CallbackQuery, state: FSMContext, pool: asyncpg.Pool):
    user = await get_user(pool, callback.from_user.id)
    lang = user['lang'] if user and user.get('lang') else resolve_lang(callback.from_user.language_code)
    t    = lambda key, **kw: get_text(key, lang, **kw)

    if user:
        await clear_progress(pool, user['id'])

    try:
        questions = await get_questions(pool, lang=lang)
        if not questions:
            await callback.message.edit_text(t("err_no_questions"))
            return

        db_user_id = user['id'] if user else None
        await state.set_state(TestStates.in_progress)
        await state.update_data(
            answers=[],
            current_question=0,
            questions=questions,
            db_user_id=db_user_id,
            lang=lang,
        )

        await callback.message.edit_text(t("test_started"))
        await send_question(callback.message, state, pool, edit=False, telegram_user=callback.from_user)

    except Exception as e:
        logger.error(f"Start test error: {e}")
        await callback.message.edit_text(t("err_generic"))


# ── О тесте ───────────────────────────────────────────────────────────────────

@router.callback_query(F.data == 'about_test')
async def about_test(callback: CallbackQuery, pool: asyncpg.Pool):
    user = await get_user(pool, callback.from_user.id)
    lang = user['lang'] if user and user.get('lang') else resolve_lang(callback.from_user.language_code)
    t    = lambda key, **kw: get_text(key, lang, **kw)

    builder = InlineKeyboardBuilder()
    builder.button(text=t("btn_start_test"), callback_data='start_test_fresh')
    builder.button(text=t("btn_home"),       callback_data='back_to_start')
    builder.adjust(1)

    await callback.message.edit_text(t("about_text"), reply_markup=builder.as_markup())


# ── Назад к старту ────────────────────────────────────────────────────────────

@router.callback_query(F.data == 'back_to_start')
async def back_to_start(callback: CallbackQuery, state: FSMContext, pool: asyncpg.Pool):
    await state.clear()
    user = await get_user(pool, callback.from_user.id)
    lang = user['lang'] if user and user.get('lang') else resolve_lang(callback.from_user.language_code)
    t    = lambda key, **kw: get_text(key, lang, **kw)

    builder = InlineKeyboardBuilder()
    if user and user.get('test_completed'):
        builder.button(text=t("btn_retake"),    callback_data='start_test_fresh')
        builder.button(text=t("btn_my_result"), callback_data='my_result')
    else:
        builder.button(text=t("btn_start_test"), callback_data='start_test_fresh')
    builder.button(text=t("btn_about_test"), callback_data='about_test')
    builder.adjust(1)
    await callback.answer()

    welcome_text = (
        t("welcome_title") + "\n" + t("welcome_subtitle")
        + "\n\n" + t("welcome_body") + t("welcome_footer")
    )
    await callback.message.answer(welcome_text, reply_markup=builder.as_markup())


# ── Обработка ответов ─────────────────────────────────────────────────────────

@router.callback_query(F.data.startswith('score_'), TestStates.in_progress)
async def process_answer(callback: CallbackQuery, state: FSMContext, pool: asyncpg.Pool):
    user_id = callback.from_user.id

    if user_id in _processing_users:
        data = await state.get_data()
        lang = data.get('lang', 'en')
        await callback.answer(get_text("wait_processing", lang), show_alert=False)
        return
    _processing_users.add(user_id)

    try:
        await callback.answer()

        score   = int(callback.data.split('_')[1])
        data    = await state.get_data()
        lang    = data.get('lang', 'en')
        t       = lambda key, **kw: get_text(key, lang, **kw)
        questions = data.get('questions', [])
        current   = data.get('current_question', 0)
        answers   = data.get('answers', [])

        if current >= len(questions):
            logger.warning(f"PROCESS_ANSWER: current ({current}) >= len(questions) ({len(questions)})")
            return

        q = questions[current]
        answers.append({
            'question_id': q['id'],
            'trait':       q['trait'],
            'is_inverted': q['is_inverted'],
            'score':       score
        })

        next_question = current + 1

        # Сохраняем прогресс
        db_user_id = data.get('db_user_id')
        if not db_user_id:
            user = await get_user(pool, callback.from_user.id)
            db_user_id = user['id'] if user else None

        if db_user_id:
            try:
                await save_progress(pool, db_user_id, answers, next_question)
            except Exception as e:
                logger.error(f"SAVE_PROGRESS ERROR: {e}")

        await state.update_data(answers=answers, current_question=next_question, db_user_id=db_user_id)
        logger.info(f"PROCESS_ANSWER: {next_question}/{len(questions)}")

        # Детектор нечестных ответов
        if next_question in (15, 30, 45) and len(answers) >= next_question:
            last_n      = answers[-next_question:]
            scores      = [a['score'] for a in last_n]
            most_common = max(set(scores), key=scores.count)
            ratio       = scores.count(most_common) / len(scores)
            if ratio >= 0.8:
                answer_labels = {
                    1: t("answer_no"), 2: t("answer_rather_no"), 3: t("answer_neutral"),
                    4: t("answer_rather_yes"), 5: t("answer_yes"),
                }
                label = answer_labels.get(most_common, str(most_common))
                await callback.message.answer(
                    t("honesty_warning", label=label, ratio=round(ratio * 100))
                )

        await send_question(callback.message, state, pool, edit=True, telegram_user=callback.from_user)

    except Exception as e:
        logger.error(f"Process answer error: {e}")
        data = await state.get_data()
        lang = data.get('lang', 'en')
        await callback.message.answer(get_text("err_generic", lang))
    finally:
        _processing_users.discard(user_id)


async def send_question(
    message: Message,
    state: FSMContext,
    pool: asyncpg.Pool,
    edit: bool = False,
    telegram_user=None,
):
    try:
        data      = await state.get_data()
        questions = data.get('questions', [])
        current   = data.get('current_question', 0)
        lang      = data.get('lang', 'en')
        t         = lambda key, **kw: get_text(key, lang, **kw)

        if current >= len(questions):
            logger.info(f"SEND_QUESTION: Test complete (current={current})")
            await finish_test(message, state, pool, telegram_user=telegram_user)
            return

        q     = questions[current]
        total = len(questions)
        text  = t(
            "question_header",
            current=current + 1,
            total=total,
            progress_bar=_make_progress_bar(current, total),
            question=q["question_text"],
        )

        builder = InlineKeyboardBuilder()
        builder.button(text=t("answer_no"),         callback_data='score_1')
        builder.button(text=t("answer_rather_no"),  callback_data='score_2')
        builder.button(text=t("answer_neutral"),    callback_data='score_3')
        builder.button(text=t("answer_rather_yes"), callback_data='score_4')
        builder.button(text=t("answer_yes"),        callback_data='score_5')
        builder.adjust(2, 1, 2)

        if edit:
            await message.edit_text(text, reply_markup=builder.as_markup())
        else:
            await message.answer(text, reply_markup=builder.as_markup())

    except Exception as e:
        logger.error(f"Send question error: {e}")
        data = await state.get_data()
        lang = data.get('lang', 'en')
        await message.answer(get_text("err_generic", lang))


# ── Завершение теста ──────────────────────────────────────────────────────────

async def finish_test(
    message: Message,
    state: FSMContext,
    pool: asyncpg.Pool,
    telegram_user=None,
):
    try:
        data    = await state.get_data()
        lang    = data.get('lang', 'en')
        t       = lambda key, **kw: get_text(key, lang, **kw)
        answers = data.get('answers', [])
        logger.info(f"FINISH_TEST: {len(answers)} answers, lang={lang}")

        if len(answers) < 60:
            await message.answer(f'⚠️ Not complete ({len(answers)}/60).')
            return

        raw, normalized = calculate_scores(answers)
        riasec          = calculate_riasec(normalized)
        professions     = await get_professions(pool, lang=lang)
        top_professions = match_professions(normalized, riasec, professions)

        tg_id = telegram_user.id if telegram_user else message.chat.id
        user = await get_user(pool, tg_id)
        if user:
            try:
                await save_result(pool, user['id'], raw, normalized, riasec, top_professions)
                await clear_progress(pool, user['id'])
            except Exception as e:
                logger.error(f"FINISH_TEST: save_result failed: {e}")

        dom_riasec = max(riasec, key=riasec.get)
        riasec_desc = t(f"riasec_{dom_riasec}")

        trait_keys  = ['O', 'C', 'E', 'A', 'S']
        trait_names = [t(f"trait_{k}") for k in trait_keys]

        main_text = (
            t("test_done_intro")
            + riasec_desc + "\n\n"
            + t("profile_header")
            + "".join(
                f'{name}: {make_bar(normalized[k])} {normalized[k]}\n'
                for k, name in zip(trait_keys, trait_names)
            )
            + "\n"
            + t("riasec_line", **riasec)
            + t("professions_coming")
        )
        await message.answer(main_text)

        # Детальный разбор топ-3
        traits_map = {
            'O': (t("trait_O"), 'generate ideas',     'see the unconventional'),
            'C': (t("trait_C"), 'follow through',      'create order'),
            'E': (t("trait_E"), 'persuade and lead',   'build relationships'),
            'A': (t("trait_A"), 'understand people',   'create harmony'),
            'S': (t("trait_S"), 'stay resilient',      'decide under stress'),
        }

        for i, prof in enumerate(top_professions[:3], 1):
            details = await get_profession_details_by_title_lang(pool, prof['title'], lang)
            req = prof.get('required_traits', {})
            if isinstance(req, str):
                import json as _json
                req = _json.loads(req)

            prof_text = f'<b>🏆 {i}. {prof["title"]} — {prof["match"]}%</b>\n\n'
            prof_text += t("prof_why_fits")

            reasons = []
            for trait, (name, strength, _) in traits_map.items():
                u_val = normalized[trait]
                r_val = req.get(trait, 50)
                if u_val >= r_val - 15:
                    if u_val >= r_val + 20:
                        reasons.append(f'• {name} ({u_val}) — {strength}')
                    else:
                        reasons.append(f'• {name} ({u_val}) — on target')
                elif u_val >= r_val - 30:
                    reasons.append(f'• {name} ({u_val}) below optimum ({r_val}), compensated by others')

            if not reasons:
                reasons.append('• Unique combination for this field')

            prof_text += '\n'.join(reasons[:3]) + '\n\n'
            prof_text += t("prof_compat")

            for k, name in zip(trait_keys, trait_names):
                u_val   = normalized[k]
                r_val   = req.get(k, 50)
                bar     = make_bar(u_val, max_val=100, width=8)
                comment = get_trait_comment(k, u_val, r_val, lang)
                prof_text += f'{name}: {bar} {u_val}/{r_val} {comment}\n'

            prof_text += '\n' + t("prof_growth", growth=prof["growth"])

            if details:
                reality = details.get('reality', '')
                if reality:
                    prof_text += t("prof_reality", reality=reality)
                pros = details.get('pros', [])
                if pros:
                    prof_text += t("prof_pros") + ''.join(f'• {p}\n' for p in pros[:3])
                cons = details.get('cons', [])
                if cons:
                    prof_text += t("prof_cons") + ''.join(f'• {c}\n' for c in cons[:3])

            await message.answer(prof_text)

        # Premium PDF offer
        await message.answer(
            "🌟 <b>Хотите детальный отчёт?</b>\n\n"
            "Premium PDF — 6 страниц с персональным AI-анализом:\n"
            "• Психологический портрет\n"
            "• Карьерное видение на 5 и 10 лет\n"
            "• Роадмап и конкретные шаги\n\n"
            "Всего <b>99 Stars</b> (~$1)",
            reply_markup=premium_keyboard(lang),
        )

        builder = InlineKeyboardBuilder()
        builder.button(text=t("btn_home"),    callback_data='main_menu')
        builder.button(text=t("btn_share"),   callback_data='share_result')
        builder.button(text=t("btn_retake"),  callback_data='start_test_fresh')
        builder.adjust(1)
        await message.answer(t("whats_next"), reply_markup=builder.as_markup())
        await state.set_state(TestStates.finished)

    except Exception as e:
        logger.error(f"Finish test error: {e}", exc_info=True)
        data = await state.get_data()
        lang = data.get('lang', 'en')
        await message.answer(get_text("err_generic", lang))


# ── /cancel ───────────────────────────────────────────────────────────────────

@router.message(Command('cancel'))
async def cmd_cancel(message: Message, state: FSMContext, pool: asyncpg.Pool):
    current_state = await state.get_state()
    data = await state.get_data()
    lang = data.get('lang') or 'en'
    t    = lambda key, **kw: get_text(key, lang, **kw)

    if current_state == TestStates.in_progress:
        current = data.get('current_question', 0)
        if current > 0:
            builder = InlineKeyboardBuilder()
            builder.button(text=t("btn_save_exit"),  callback_data='save_and_exit')
            builder.button(text=t("btn_clear_exit"), callback_data='clear_and_exit')
            builder.adjust(1)
            await message.answer(
                t("cancel_confirm", current=current),
                reply_markup=builder.as_markup()
            )
            return

    await state.clear()
    await message.answer(t("cancelled"))


@router.callback_query(F.data == 'save_and_exit')
async def save_and_exit(callback: CallbackQuery, state: FSMContext, pool: asyncpg.Pool):
    data = await state.get_data()
    lang = data.get('lang', 'en')
    t    = lambda key, **kw: get_text(key, lang, **kw)

    await callback.answer(t("btn_save_exit"))
    try:
        answers = data.get('answers', [])
        current = data.get('current_question', 0)
        if answers and current > 0:
            user = await get_user(pool, callback.from_user.id)
            if user:
                await save_progress(pool, user['id'], answers, current)
    except Exception as e:
        logger.warning(f"save_and_exit: extra save failed: {e}")

    await state.clear()
    await callback.message.edit_text(t("progress_saved"))


@router.callback_query(F.data == 'clear_and_exit')
async def clear_and_exit(callback: CallbackQuery, state: FSMContext, pool: asyncpg.Pool):
    data = await state.get_data()
    lang = data.get('lang', 'en')
    t    = lambda key, **kw: get_text(key, lang, **kw)

    user = await get_user(pool, callback.from_user.id)
    if user:
        await clear_progress(pool, user['id'])

    await callback.answer(t("btn_clear_exit"))
    await state.clear()
    await callback.message.edit_text(t("progress_cleared"))


# ── Поделиться ────────────────────────────────────────────────────────────────

@router.callback_query(F.data == 'share_result')
async def cb_share_result(callback: CallbackQuery, pool: asyncpg.Pool):
    await callback.answer()
    user = await get_user(pool, callback.from_user.id)
    lang = user['lang'] if user and user.get('lang') else resolve_lang(callback.from_user.language_code)
    t    = lambda key, **kw: get_text(key, lang, **kw)

    try:
        if not user:
            await callback.message.answer(t("not_registered"))
            return

        row = await get_last_result(pool, user['id'])
        if not row:
            await callback.message.answer(t("no_result"))
            return

        import json
        normalized = json.loads(row['normalized_scores']) if isinstance(row['normalized_scores'], str) else dict(row['normalized_scores'])
        riasec     = json.loads(row['riasec_profile'])    if isinstance(row['riasec_profile'], str)    else dict(row['riasec_profile'])
        top        = json.loads(row['top_professions'])   if isinstance(row['top_professions'], str)    else list(row['top_professions'])

        loop      = asyncio.get_running_loop()
        card_bytes = await loop.run_in_executor(
            None,
            lambda: generate_share_card(normalized, riasec, top, lang=lang)
        )

        dom = max(riasec, key=riasec.get)
        dom_label = _riasec_label(dom, lang)

        if lang == "ru":
            caption  = f"🎯 Мой тип личности: <b>{dom_label}</b>\n\nПрошёл карьерный тест CareerCheck. Узнай свой тип → @CareerCheck_Bot"
            hint     = "👆 <b>Перешли это фото друзьям</b> или нажми кнопку ниже"
        else:
            caption  = f"🎯 My personality type: <b>{dom_label}</b>\n\nI took the CareerCheck test. Find yours → @CareerCheck_Bot"
            hint     = "👆 <b>Forward this photo to friends</b> or tap the button below"

        # Кнопка "Поделиться" — открывает диалог выбора чата в Telegram
        share_text = f"Узнай свой карьерный тип! @CareerCheck_Bot" if lang == "ru" else "Find your career type! @CareerCheck_Bot"
        from urllib.parse import quote
        share_url  = f"https://t.me/share/url?url=https://t.me/CareerCheck_Bot&text={quote(share_text)}"

        share_kb = InlineKeyboardBuilder()
        share_kb.button(
            text="📤 Поделиться с друзьями" if lang == "ru" else "📤 Share with friends",
            url=share_url
        )

        await callback.message.answer_photo(
            photo=types.BufferedInputFile(card_bytes, filename='careercheck.png'),
            caption=caption,
        )
        await callback.message.answer(hint, reply_markup=share_kb.as_markup())

    except Exception as e:
        logger.error(f"Share card error: {e}", exc_info=True)
        await callback.message.answer(t("err_generic"))


# ── /myresult ─────────────────────────────────────────────────────────────────

@router.callback_query(F.data == 'my_result')
async def cb_my_result(callback: CallbackQuery, pool: asyncpg.Pool):
    await callback.answer()
    await _show_myresult(callback.message, callback.from_user.id, pool)


@router.message(Command('myresult'))
async def cmd_myresult(message: Message, pool: asyncpg.Pool):
    await _show_myresult(message, message.from_user.id, pool)


async def _show_myresult(message: Message, telegram_id: int, pool: asyncpg.Pool):
    user = await get_user(pool, telegram_id)
    lang = user['lang'] if user and user.get('lang') else 'en'
    t    = lambda key, **kw: get_text(key, lang, **kw)

    try:
        if not user:
            await message.answer(t("not_registered"))
            return

        row = await get_last_result(pool, user['id'])
        if not row:
            await message.answer(t("no_result"))
            return

        import json
        normalized = json.loads(row['normalized_scores']) if isinstance(row['normalized_scores'], str) else dict(row['normalized_scores'])
        riasec     = json.loads(row['riasec_profile'])    if isinstance(row['riasec_profile'], str)    else dict(row['riasec_profile'])
        top        = json.loads(row['top_professions'])   if isinstance(row['top_professions'], str)    else list(row['top_professions'])
        date_str   = row['completed_at'].strftime('%d.%m.%Y %H:%M') if row['completed_at'] else '—'

        dom_riasec   = max(riasec, key=riasec.get)
        riasec_label = _riasec_label(dom_riasec, lang)

        trait_keys   = ['O', 'C', 'E', 'A', 'S']
        trait_names  = [t(f"trait_{k}") for k in trait_keys]

        text = (
            t("myresult_header", date=date_str)
            + t("myresult_type", label=riasec_label)
            + t("myresult_big5")
            + "".join(
                f'{name}: {make_bar(normalized[k])} {normalized[k]}\n'
                for k, name in zip(trait_keys, trait_names)
            )
            + "\n"
            + t("myresult_top")
        )

        medals = ['🥇', '🥈', '🥉', '4.', '5.']
        for i, prof in enumerate(top[:5]):
            text += f'{medals[i]} {prof["title"]} — {prof["match"]}%\n'

        builder = InlineKeyboardBuilder()
        builder.button(text=t("btn_share"),  callback_data='share_result')
        builder.button(text=t("btn_retake"), callback_data='start_test_fresh')
        builder.adjust(1)

        await message.answer(text, reply_markup=builder.as_markup())

        # Premium PDF offer
        from bot.premium_handlers import premium_keyboard
        await message.answer(
            "🌟 <b>Хотите детальный AI-отчёт?</b>\n\n"
            "Premium PDF — 6 страниц:\n"
            "• Психологический портрет\n"
            "• Карьерное видение на 5 и 10 лет\n"
            "• Роадмап и конкретные шаги\n\n"
            "Всего <b>99 Stars</b> (~$1)" if lang == "ru" else
            "🌟 <b>Want a detailed AI report?</b>\n\n"
            "Premium PDF — 6 pages:\n"
            "• Psychological portrait\n"
            "• Career vision for 5 and 10 years\n"
            "• Roadmap and concrete steps\n\n"
            "Only <b>99 Stars</b> (~$1)",
            reply_markup=premium_keyboard(lang),
        )

    except Exception as e:
        logger.error(f"myresult error: {e}")
        await message.answer(t("err_generic"))


# ── /about ────────────────────────────────────────────────────────────────────

@router.message(Command('about'))
async def cmd_about(message: Message, pool: asyncpg.Pool):
    user = await get_user(pool, message.from_user.id)
    lang = user['lang'] if user and user.get('lang') else resolve_lang(message.from_user.language_code)
    await message.answer(get_text("about_creator", lang))


# ── /admin ────────────────────────────────────────────────────────────────────

@router.message(Command('admin'))
async def cmd_admin(message: Message, pool: asyncpg.Pool):
    if message.from_user.id not in ADMIN_IDS:
        await message.answer('❌ No access.')
        return

    try:
        stats = await get_stats(pool)

        def bar(value, max_val=100, length=10):
            filled = int((value / max_val) * length) if value else 0
            return '▓' * filled + '░' * (length - filled)

        avg = stats['avg_scores'] if stats['avg_scores'] else {}
        text = (
            f'📊 <b>Bot statistics</b>\n\n'
            f'👥 <b>Users:</b>\n'
            f'• Total: {stats["total_users"]}\n'
            f'• Tested: {stats["tested"]} ({round(stats["tested"]/stats["total_users"]*100) if stats["total_users"] and stats["tested"] else 0}%)\n\n'
            f'📈 <b>Activity:</b>\n'
            f'• Last 24h: +{stats["last_24h"]} tests\n'
            f'• Last 7 days: +{stats["last_7d"]} tests\n\n'
        )

        if avg and any(v is not None for v in avg.values()):
            text += (
                f'🧠 <b>Average Big Five:</b>\n'
                f'O: {bar(avg.get("avg_o",0))} {round(avg.get("avg_o") or 0)}\n'
                f'C: {bar(avg.get("avg_c",0))} {round(avg.get("avg_c") or 0)}\n'
                f'E: {bar(avg.get("avg_e",0))} {round(avg.get("avg_e") or 0)}\n'
                f'A: {bar(avg.get("avg_a",0))} {round(avg.get("avg_a") or 0)}\n'
                f'S: {bar(avg.get("avg_s",0))} {round(avg.get("avg_s") or 0)}\n\n'
            )

        if stats['top_profs']:
            text += '🏆 <b>Top professions:</b>\n'
            for i, p in enumerate(stats['top_profs'], 1):
                text += f'{i}. {p["title"]} — {p["cnt"]} times\n'

        if stats.get('lang_stats'):
            text += '\n🌐 <b>Languages:</b>\n'
            for ls in stats['lang_stats']:
                text += f'• {ls["lang"]}: {ls["cnt"]}\n'

        text += f'\n<i>Updated: {datetime.now().strftime("%H:%M:%S")}</i>'
        await message.answer(text)

    except Exception as e:
        logger.error(f"Admin error: {e}")
        await message.answer('❌ Error loading stats')


# ── /help ─────────────────────────────────────────────────────────────────────

@router.message(Command('help'))
async def cmd_help(message: Message, pool: asyncpg.Pool):
    user = await get_user(pool, message.from_user.id)
    lang = user['lang'] if user and user.get('lang') else resolve_lang(message.from_user.language_code)
    await message.answer(get_text("help_text", lang))


# ── /refer — реферальная ссылка (M3) ─────────────────────────────────────────

@router.message(Command('refer'))
async def cmd_refer(message: Message, pool: asyncpg.Pool):
    await show_referral_screen(message, pool, message.from_user.id)


# ── /challenges — ежедневные карьерные задания (N3) ───────────────────────────

@router.message(Command('challenges'))
async def cmd_challenges(message: Message, pool: asyncpg.Pool):
    await show_challenges_screen(message, pool, message.from_user.id)


@router.message(Command('stop_challenges'))
async def cmd_stop_challenges(message: Message, pool: asyncpg.Pool):
    await unsubscribe_challenges(pool, message.from_user.id)
    tg_id  = message.from_user.id
    user   = await get_user(pool, tg_id)
    lang   = user['lang'] if user and user.get('lang') else 'ru'
    msg = "✅ Ты отписан от ежедневных челленджей." if lang == 'ru' else "✅ You've unsubscribed from daily challenges."
    await message.answer(msg)


# ── Inline mode — поделиться результатом ─────────────────────────────────────

@router.inline_query()
async def inline_share_result(query: InlineQuery, pool: asyncpg.Pool, bot_username: str = ""):
    """
    Пользователь пишет @CareerCheck_Bot в любом чате →
    показывает карточку результата → он отправляет её другу.
    """
    user_id = query.from_user.id
    lang    = resolve_lang(query.from_user.language_code)

    try:
        user   = await get_user(pool, user_id)
        result = await get_last_result(pool, user["id"]) if user else None
    except Exception:
        result = None

    domain = os.getenv("DOMAIN", "careercheck.app")
    if not bot_username:
        bot_username = (await query.bot.get_me()).username

    if not result:
        # Нет результатов — предлагаем пройти тест
        if lang == "ru":
            title       = "🧠 CareerCheck — карьерный тест Big Five"
            description = "Узнай свой профиль личности и топ профессий за 15 минут"
            body        = (
                "🧠 <b>CareerCheck</b>\n\n"
                "Карьерное тестирование на основе научной модели Big Five.\n\n"
                "✅ 160+ профессий с % совпадения\n"
                "✅ Психологический профиль OCEAN\n"
                "✅ RIASEC-тип карьеры\n\n"
                f"👉 @{bot_username}"
            )
            cta_text = "🚀 Пройти тест"
        else:
            title       = "🧠 CareerCheck — Big Five Career Test"
            description = "Discover your personality profile and top careers in 15 minutes"
            body        = (
                "🧠 <b>CareerCheck</b>\n\n"
                "Career testing based on the scientific Big Five model.\n\n"
                "✅ 160+ careers with % match\n"
                "✅ Personality profile OCEAN\n"
                "✅ RIASEC career type\n\n"
                f"👉 @{bot_username}"
            )
            cta_text = "🚀 Take the test"

        from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
        kb = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text=cta_text, url=f"https://t.me/{bot_username}")
        ]])

        results = [InlineQueryResultArticle(
            id="no_results",
            title=title,
            description=description,
            input_message_content=InputTextMessageContent(message_text=body, parse_mode="HTML"),
            reply_markup=kb,
        )]
        await query.answer(results, cache_time=60, is_personal=True)
        return

    # Есть результаты — формируем красивую карточку
    import json as _json

    def _parse(v):
        return _json.loads(v) if isinstance(v, str) else (v or {})

    normalized  = _parse(result.get("normalized_scores", {}))
    riasec      = _parse(result.get("riasec_profile", {}))
    top_profs   = _parse(result.get("top_professions", []))
    if isinstance(top_profs, str):
        top_profs = _json.loads(top_profs)

    # Big Five бары (текстовые)
    traits = {"O": "Открытость", "C": "Добросовестность", "E": "Экстраверсия",
              "A": "Доброжелательность", "S": "Стабильность"}
    if lang != "ru":
        traits = {"O": "Openness", "C": "Conscientiousness", "E": "Extraversion",
                  "A": "Agreeableness", "S": "Stability"}

    big5_lines = "\n".join(
        f"{name}: {make_bar(normalized.get(k, 0))} {normalized.get(k, 0)}%"
        for k, name in traits.items()
    )

    # Топ профессий
    top3 = top_profs[:3]
    if lang == "ru":
        prof_lines = "\n".join(f"• {p.get('title','?')} — {p.get('match',0)}%" for p in top3)
        riasec_dom = max(riasec, key=riasec.get) if riasec else "?"
        title       = f"🎯 Мой карьерный профиль — {top3[0].get('title','?')} ({top3[0].get('match',0)}%)"
        description = f"Big Five + {len(top3)} топ профессий · RIASEC: {riasec_dom}"
        body = (
            f"🧠 <b>Мой карьерный профиль (Big Five)</b>\n\n"
            f"{big5_lines}\n\n"
            f"<b>Топ профессий:</b>\n{prof_lines}\n\n"
            f"<b>RIASEC:</b> {riasec_dom}\n\n"
            f"📊 Проверь свой профиль → @{bot_username}"
        )
        cta_text = "🚀 Пройти тест"
    else:
        prof_lines  = "\n".join(f"• {p.get('title','?')} — {p.get('match',0)}%" for p in top3)
        riasec_dom  = max(riasec, key=riasec.get) if riasec else "?"
        title       = f"🎯 My Career Profile — {top3[0].get('title','?')} ({top3[0].get('match',0)}%)"
        description = f"Big Five + {len(top3)} top careers · RIASEC: {riasec_dom}"
        body = (
            f"🧠 <b>My Career Profile (Big Five)</b>\n\n"
            f"{big5_lines}\n\n"
            f"<b>Top careers:</b>\n{prof_lines}\n\n"
            f"<b>RIASEC:</b> {riasec_dom}\n\n"
            f"📊 Check your profile → @{bot_username}"
        )
        cta_text = "🚀 Take the test"

    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=cta_text, url=f"https://t.me/{bot_username}")
    ]])

    results = [InlineQueryResultArticle(
        id="my_result",
        title=title,
        description=description,
        input_message_content=InputTextMessageContent(message_text=body, parse_mode="HTML"),
        reply_markup=kb,
    )]
    await query.answer(results, cache_time=0, is_personal=True)


# ── /advice ───────────────────────────────────────────────────────────────────

@router.message(Command('advice'))
async def cmd_advice(message: Message, pool: asyncpg.Pool):
    user = await get_user(pool, message.from_user.id)
    lang = user['lang'] if user and user.get('lang') else resolve_lang(message.from_user.language_code)

    if not user:
        await message.answer("Сначала пройди тест: /start" if lang == 'ru' else "Take the test first: /start")
        return

    result = await get_last_result(pool, user['id'])
    if not result:
        await message.answer(
            "Сначала пройди тест — тогда советы будут персональными! /start"
            if lang == 'ru' else
            "Take the test first — then advice will be personal! /start"
        )
        return

    import json as _json
    def _p(v): return _json.loads(v) if isinstance(v, str) else v
    normalized = _p(result['normalized_scores'])
    riasec     = _p(result['riasec_profile'])

    from services.ai_chat import generate_daily_advice
    from config.settings import ANTHROPIC_API_KEY
    advice = await generate_daily_advice(
        normalized=normalized,
        riasec=riasec,
        lang=lang,
        api_key=ANTHROPIC_API_KEY,
    )

    if not advice:
        advice = (
            "Сегодня найди 10 минут чтобы записать одно профессиональное достижение этой недели."
            if lang == 'ru' else
            "Today, find 10 minutes to write down one professional achievement from this week."
        )

    dom = max(riasec, key=riasec.get) if riasec else "I"
    riasec_emoji = {'R': '🔧', 'I': '🔬', 'A': '🎨', 'S': '🤝', 'E': '💼', 'C': '📋'}.get(dom, '💡')

    if lang == 'ru':
        await message.answer(
            f"{riasec_emoji} <b>Совет дня</b>\n\n{advice}\n\n<i>Основан на твоём Big Five профиле</i>"
        )
    else:
        await message.answer(
            f"{riasec_emoji} <b>Advice of the day</b>\n\n{advice}\n\n<i>Based on your Big Five profile</i>"
        )


# ── /salary ───────────────────────────────────────────────────────────────────

@router.message(Command('salary'))
async def cmd_salary(message: Message, pool: asyncpg.Pool):
    user = await get_user(pool, message.from_user.id)
    lang = user['lang'] if user and user.get('lang') else 'ru'

    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        await message.answer(
            "Укажи профессию: <code>/salary разработчик</code>" if lang == 'ru'
            else "Specify a profession: <code>/salary developer</code>"
        )
        return

    query = args[1].strip()
    from data.salary_data import find_salary
    data = find_salary(query, lang)

    if not data:
        await message.answer(
            f"Не нашёл данные по '{query}'. Попробуй другое название.\nПример: /salary дизайнер"
            if lang == 'ru' else
            f"No data found for '{query}'. Try another name."
        )
        return

    matched = data.get('matched', query)
    curr = data['currency']
    text = (
        f"💰 <b>{matched.title()}</b>\n\n"
        f"Junior: <b>{data['junior']}</b> {curr}\n"
        f"Middle: <b>{data['mid']}</b> {curr}\n"
        f"Senior: <b>{data['senior']}</b> {curr}\n\n"
    )

    if user:
        result = await get_last_result(pool, user['id'])
        if result:
            text += "<i>💡 Для персонального карьерного плана → /start</i>"

    await message.answer(text)


# ── /interview ────────────────────────────────────────────────────────────────

@router.message(Command('interview'))
async def cmd_interview(message: Message, pool: asyncpg.Pool):
    user = await get_user(pool, message.from_user.id)
    lang = user['lang'] if user and user.get('lang') else 'ru'

    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        await message.answer(
            "Укажи профессию: <code>/interview UX Designer</code>" if lang == 'ru'
            else "Specify a profession: <code>/interview UX Designer</code>"
        )
        return

    profession = args[1].strip()
    await message.answer("⏳ Готовлю вопросы..." if lang == 'ru' else "⏳ Preparing questions...")

    normalized = {}
    if user:
        result = await get_last_result(pool, user['id'])
        if result:
            import json as _j
            ns = result['normalized_scores']
            normalized = _j.loads(ns) if isinstance(ns, str) else (ns or {})

    from services.ai_chat import generate_interview_prep
    from config.settings import ANTHROPIC_API_KEY
    content = await generate_interview_prep(profession, normalized, lang, ANTHROPIC_API_KEY)

    if not content:
        await message.answer(
            "❌ Не удалось получить ответ. Попробуй позже." if lang == 'ru'
            else "❌ Failed to get response. Try later."
        )
        return

    await message.answer(content)


# ── /week ─────────────────────────────────────────────────────────────────────

WEEKLY_QUOTES = {
    'ru': {
        'R': '"Хорошая работа — это когда то что ты делаешь совпадает с тем что ты умеешь." — К. Роджерс',
        'I': '"Самый опасный эксперимент — тот что вы никогда не проводили." — Ф. Дайсон',
        'A': '"Творчество — это позволить себе делать ошибки. Искусство — знать какие оставить." — С. Адамс',
        'S': '"Лучший способ найти себя — потерять себя в служении другим." — М. Ганди',
        'E': '"Ваше время ограничено. Не тратьте его живя чужой жизнью." — С. Джобс',
        'C': '"Порядок — основа всего." — М. Дессолин',
    },
    'en': {
        'R': '"Good work is doing what you do best." — K. Rogers',
        'I': '"The most dangerous experiment is the one you never do." — F. Dyson',
        'A': '"Creativity is allowing yourself to make mistakes. Art is knowing which ones to keep." — S. Adams',
        'S': '"The best way to find yourself is to lose yourself in the service of others." — M. Gandhi',
        'E': '"Your time is limited. Don\'t waste it living someone else\'s life." — S. Jobs',
        'C': '"Order is the foundation of all things."',
    }
}


async def send_weekly_digest_to_user(bot, pool, tg_id: int):
    user = await get_user(pool, tg_id)
    if not user:
        return
    lang = user.get('lang', 'ru')

    result = await get_last_result(pool, user['id'])
    if not result:
        return

    import json as _j
    riasec_raw = result['riasec_profile']
    riasec = _j.loads(riasec_raw) if isinstance(riasec_raw, str) else (riasec_raw or {})
    dom = max(riasec, key=riasec.get) if riasec else 'I'

    quote = WEEKLY_QUOTES.get(lang, WEEKLY_QUOTES['en']).get(dom, '')

    if lang == 'ru':
        text = (
            f"📊 <b>Итог недели</b>\n\n"
            f"Твой тип: <b>{_riasec_label(dom, lang)}</b>\n\n"
            f"💬 {quote}\n\n"
            f"<b>На следующей неделе:</b>\n"
            f"• Пройди одно задание /challenges\n"
            f"• Посмотри каталог профессий в приложении\n"
            f"• Запроси совет дня: /advice\n\n"
            f"<i>Удачной недели!</i>"
        )
    else:
        text = (
            f"📊 <b>Weekly digest</b>\n\n"
            f"Your type: <b>{_riasec_label(dom, lang)}</b>\n\n"
            f"💬 {quote}\n\n"
            f"<b>Next week:</b>\n"
            f"• Complete a challenge /challenges\n"
            f"• Browse the profession catalog\n"
            f"• Get today's advice: /advice\n\n"
            f"<i>Have a great week!</i>"
        )

    try:
        await bot.send_message(tg_id, text)
    except Exception as e:
        logger.warning(f"Weekly digest send error for {tg_id}: {e}")


@router.message(Command('week'))
async def cmd_week(message: Message, pool: asyncpg.Pool):
    await send_weekly_digest_to_user(message.bot, pool, message.from_user.id)


async def weekly_digest_scheduler(bot, pool) -> None:
    """Рассылает дайджест каждое воскресенье в 10:00."""
    import asyncio
    from datetime import datetime, timedelta
    while True:
        try:
            now = datetime.now()
            days_ahead = (6 - now.weekday()) % 7
            if days_ahead == 0 and now.hour >= 10:
                days_ahead = 7
            target = now.replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=days_ahead)
            wait = (target - now).total_seconds()
            logger.info(f"Next weekly digest in {wait/3600:.1f}h ({target.strftime('%a %d.%m %H:%M')})")
            await asyncio.sleep(wait)

            rows = await pool.fetch("SELECT telegram_id FROM users WHERE test_completed=true")
            for row in rows:
                await send_weekly_digest_to_user(bot, pool, row['telegram_id'])
                await asyncio.sleep(0.05)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Weekly scheduler error: {e}")
            await asyncio.sleep(300)


# ── /compare ──────────────────────────────────────────────────────────────────

@router.message(Command('compare'))
async def cmd_compare(message: Message, pool: asyncpg.Pool):
    user = await get_user(pool, message.from_user.id)
    lang = user['lang'] if user and user.get('lang') else 'ru'

    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        await message.answer(
            "Укажи username: <code>/compare @друг</code>" if lang == 'ru'
            else "Specify username: <code>/compare @friend</code>"
        )
        return

    target_username = args[1].strip().lstrip('@')

    target = await pool.fetchrow(
        "SELECT u.id, u.telegram_id, u.lang FROM users u WHERE u.username=$1",
        target_username
    )

    if not target:
        await message.answer(
            f"Пользователь @{target_username} не найден в CareerCheck. "
            f"Пригласи его пройти тест!"
            if lang == 'ru' else
            f"User @{target_username} not found in CareerCheck. "
            f"Invite them to take the test!"
        )
        return

    my_result = await get_last_result(pool, user['id']) if user else None
    their_result = await get_last_result(pool, target['id'])

    if not my_result:
        await message.answer("Сначала пройди тест: /start" if lang == 'ru' else "Take the test first: /start")
        return
    if not their_result:
        await message.answer(
            f"@{target_username} ещё не прошёл тест." if lang == 'ru'
            else f"@{target_username} hasn't taken the test yet."
        )
        return

    import json as _j
    def _p(v): return _j.loads(v) if isinstance(v, str) else v

    my_n  = _p(my_result['normalized_scores'])
    his_n = _p(their_result['normalized_scores'])
    my_r  = _p(my_result['riasec_profile'])
    his_r = _p(their_result['riasec_profile'])

    my_dom  = max(my_r, key=my_r.get) if my_r else 'I'
    his_dom = max(his_r, key=his_r.get) if his_r else 'I'

    diffs = [abs((my_n.get(t, 50) or 50) - (his_n.get(t, 50) or 50)) for t in 'OCEAS']
    compat = max(0, round(100 - sum(diffs) / 5))

    my_label  = _riasec_label(my_dom, lang)
    his_label = _riasec_label(his_dom, lang)

    TRAIT_EMOJI = {'O': '🎨', 'C': '⚡', 'E': '🌟', 'A': '🤝', 'S': '🧘'}
    trait_names_ru = {'O': 'Открытость', 'C': 'Сознательность', 'E': 'Экстраверсия', 'A': 'Доброжелательность', 'S': 'Стабильность'}
    trait_names_en = {'O': 'Openness', 'C': 'Conscientiousness', 'E': 'Extraversion', 'A': 'Agreeableness', 'S': 'Stability'}
    tnames = trait_names_ru if lang == 'ru' else trait_names_en

    trait_lines = ""
    for t in 'OCEAS':
        mv = my_n.get(t, 50) or 50
        hv = his_n.get(t, 50) or 50
        diff = mv - hv
        arrow = '↑' if diff > 10 else '↓' if diff < -10 else '≈'
        trait_lines += f"{TRAIT_EMOJI.get(t, '')} {tnames[t]}: {mv} {arrow} {hv}\n"

    if lang == 'ru':
        text = (
            f"🔄 <b>Сравнение профилей</b>\n\n"
            f"Ты: <b>{my_label}</b>\n"
            f"@{target_username}: <b>{his_label}</b>\n\n"
            f"<b>Big Five:</b>\n{trait_lines}\n"
            f"<b>Совместимость: {compat}%</b>\n\n"
        )
        if my_dom == his_dom:
            text += "Вы одного типа — хорошо понимаете друг друга, но может не хватать разнообразия взглядов."
        elif compat >= 70:
            text += "Высокая совместимость. Схожие ценности при разных сильных сторонах — отличная база для команды."
        elif compat >= 50:
            text += "Средняя совместимость. Есть точки пересечения и точки роста. Можете дополнять друг друга."
        else:
            text += "Разные типы. Это не плохо — противоположности часто создают сильные команды, если есть уважение."
    else:
        text = (
            f"🔄 <b>Profile comparison</b>\n\n"
            f"You: <b>{my_label}</b>\n"
            f"@{target_username}: <b>{his_label}</b>\n\n"
            f"<b>Big Five:</b>\n{trait_lines}\n"
            f"<b>Compatibility: {compat}%</b>\n\n"
        )
        if compat >= 70:
            text += "High compatibility. Similar values with different strengths — great foundation for a team."
        elif compat >= 50:
            text += "Medium compatibility. Common ground and growth areas. You can complement each other."
        else:
            text += "Different types. Not bad — opposites often make strong teams when there's mutual respect."

    await message.answer(text)
