"""
challenge_service.py — ежедневные карьерные челленджи (N3).
"""

import asyncio
import logging
from datetime import datetime, timedelta

from db.database import get_challenge_subscribers, get_daily_challenge, mark_challenge_sent

logger = logging.getLogger(__name__)

TRAIT_EMOJI = {'O': '🎨', 'C': '⚡', 'E': '🌟', 'A': '🤝', 'S': '🧘'}


async def send_daily_challenges(bot, pool) -> None:
    """Отправляет дневной челлендж всем подписчикам."""
    subscribers = await get_challenge_subscribers(pool)
    logger.info(f"Sending challenges to {len(subscribers)} subscribers")

    for sub in subscribers:
        tg_id = sub['user_telegram_id']
        lang  = sub.get('lang') or 'ru'
        try:
            challenge = await get_daily_challenge(pool, tg_id, lang)
            if not challenge:
                continue

            text_field = 'text_ru' if lang == 'ru' else 'text_en'
            text   = challenge[text_field]
            emoji  = TRAIT_EMOJI.get(challenge['trait_target'], '💡')

            if lang == 'ru':
                msg = f"{emoji} <b>Карьерный челлендж дня</b>\n\n{text}\n\n<i>Выполни сегодня — и твоя карьера ближе на один шаг</i>"
            else:
                msg = f"{emoji} <b>Daily Career Challenge</b>\n\n{text}\n\n<i>Complete today — your career is one step closer</i>"

            await bot.send_message(tg_id, msg, parse_mode="HTML")
            await mark_challenge_sent(pool, tg_id, challenge['id'])

        except Exception as e:
            logger.warning(f"Challenge send error for {tg_id}: {e}")

        await asyncio.sleep(0.05)  # не спамим Telegram API


async def challenge_scheduler(bot, pool) -> None:
    """Asyncio-планировщик: запускает send_daily_challenges каждый день в 09:00."""
    while True:
        try:
            now    = datetime.now()
            target = now.replace(hour=9, minute=0, second=0, microsecond=0)
            if now >= target:
                target += timedelta(days=1)
            wait   = (target - now).total_seconds()
            logger.info(f"Next challenge batch in {wait/3600:.1f} hours ({target.strftime('%H:%M %d.%m')})")
            await asyncio.sleep(wait)
            await send_daily_challenges(bot, pool)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Challenge scheduler error: {e}")
            await asyncio.sleep(60)
