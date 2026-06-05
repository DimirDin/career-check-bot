import asyncio
import logging
import signal
import sys
import time

from config.logging_config import configure_logging
configure_logging()

import asyncpg
import redis.asyncio as aioredis
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from config.settings import BOT_TOKEN, DB_CONFIG, REDIS_CONFIG
from bot.handlers import router
from bot.premium_handlers import premium_router
from db.database import cleanup_old_progress
from middlewares.rate_limit import RateLimitMiddleware
from services.challenge_service import challenge_scheduler

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────
# Graceful shutdown
# ────────────────────────────────────────────────────────────────

class GracefulShutdown:
    """
    Перехватывает SIGTERM и SIGINT.
    При получении сигнала ставит флаг и отменяет главную задачу,
    давая aiogram завершить текущие апдейты и закрыть соединения.
    """

    def __init__(self):
        self._shutdown_event = asyncio.Event()
        self._main_task: asyncio.Task | None = None

    def register(self, loop: asyncio.AbstractEventLoop) -> None:
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, self._handle_signal, sig)
        logger.info("Signal handlers registered (SIGTERM, SIGINT)")

    def _handle_signal(self, sig: signal.Signals) -> None:
        logger.info(f"Received signal {sig.name} — initiating graceful shutdown")
        self._shutdown_event.set()
        if self._main_task and not self._main_task.done():
            self._main_task.cancel()

    def set_main_task(self, task: asyncio.Task) -> None:
        self._main_task = task

    @property
    def shutdown_event(self) -> asyncio.Event:
        return self._shutdown_event


_shutdown = GracefulShutdown()


async def heartbeat_loop(redis_client: aioredis.Redis) -> None:
    """Пишет timestamp в Redis каждые 30 сек. /api/health/bot проверяет актуальность."""
    while True:
        try:
            await redis_client.set("bot:heartbeat", str(time.time()), ex=90)
        except Exception as e:
            logger.warning(f"Heartbeat Redis error: {e}")
        await asyncio.sleep(30)


# ────────────────────────────────────────────────────────────────
# Main
# ────────────────────────────────────────────────────────────────

async def main() -> None:
    loop = asyncio.get_running_loop()
    _shutdown.register(loop)

    # ── DB pool ──────────────────────────────────────────────────
    pool = await asyncpg.create_pool(**DB_CONFIG, min_size=2, max_size=10)
    logger.info("DB pool created")

    # ── Redis client ─────────────────────────────────────────────
    redis_url = f"redis://{REDIS_CONFIG['host']}:{REDIS_CONFIG['port']}"
    redis_client = aioredis.from_url(redis_url, decode_responses=True)
    logger.info("Redis client created")

    # TTL cleanup при старте — удаляем брошенные прогрессы старше 7 дней
    try:
        deleted = await cleanup_old_progress(pool, days=7)
        logger.info(f"Startup cleanup: {deleted} old progress records removed")
    except Exception as e:
        logger.warning(f"Startup cleanup error: {e}")

    # ── Bot & Dispatcher ─────────────────────────────────────────
    bot = Bot(
        token=BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher()

    # ── Rate limiting middleware ──────────────────────────────────
    #   Message:  1 сообщение / 1 сек
    #   Callback: 3 клика / 2 сек
    #   Flood:    5 нарушений → cooldown 60 сек
    rate_limiter = RateLimitMiddleware(
        redis_client=redis_client,
        msg_limit=1,
        msg_window=1.0,
        cb_limit=3,
        cb_window=2.0,
        flood_limit=5,
        cooldown=60.0,
    )
    dp.message.middleware(rate_limiter)
    dp.callback_query.middleware(rate_limiter)
    logger.info("Rate limit middleware registered")

    dp.include_router(router)
    dp.include_router(premium_router)

    # Пул + Redis доступны во всех хендлерах
    dp["pool"]  = pool
    dp["redis"] = redis_client

    # ── Heartbeat ────────────────────────────────────────────────
    heartbeat_task = asyncio.create_task(heartbeat_loop(redis_client))
    logger.info("Heartbeat task started")

    # ── Daily challenges scheduler (N3) ──────────────────────────
    challenges_task = asyncio.create_task(challenge_scheduler(bot, pool))
    logger.info("Challenge scheduler started")

    # ── Polling c graceful stop ───────────────────────────────────
    logger.info("Bot started, polling…")
    try:
        # cancel_on_shutdown=True: при отмене задачи polling корректно завершается
        polling_task = asyncio.create_task(
            dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
        )
        _shutdown.set_main_task(polling_task)
        await polling_task

    except asyncio.CancelledError:
        logger.info("Polling task cancelled — shutting down")

    finally:
        # ── Teardown ──────────────────────────────────────────────
        logger.info("Closing bot session…")
        await bot.session.close()

        logger.info("Closing DB pool…")
        await pool.close()

        heartbeat_task.cancel()
        challenges_task.cancel()

        logger.info("Closing Redis client…")
        await redis_client.aclose()

        logger.info("Shutdown complete ✓")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        # asyncio.run() сам обрабатывает KeyboardInterrupt через CancelledError,
        # но на Windows он иногда пробрасывается — просто глушим.
        sys.exit(0)
