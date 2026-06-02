import asyncio
import logging

import asyncpg
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from config.settings import BOT_TOKEN, DB_CONFIG
from bot.handlers import router
from db.database import cleanup_old_progress

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    # Один пул на весь процесс: min 2 соединения, max 10
    pool = await asyncpg.create_pool(**DB_CONFIG, min_size=2, max_size=10)
    logger.info("DB pool created")

    # TTL cleanup при старте
    try:
        deleted = await cleanup_old_progress(pool, days=7)
        logger.info(f"Startup cleanup: {deleted} old progress records removed")
    except Exception as e:
        logger.warning(f"Startup cleanup error: {e}")

    bot = Bot(
        token=BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML)
    )
    dp = Dispatcher()
    dp.include_router(router)

    # Пул доступен во всех хендлерах через аргумент pool=
    dp['pool'] = pool

    try:
        await dp.start_polling(bot)
    finally:
        await pool.close()
        logger.info("DB pool closed")

if __name__ == '__main__':
    asyncio.run(main())
