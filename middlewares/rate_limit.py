"""
Middleware: rate limiting через Redis.

Логика:
- MESSAGE  : не чаще 1 сообщения в 1 сек (фиксированное окно)
- CALLBACK : не чаще 3 кликов в 2 сек
- FLOOD    : 5 нарушений → cooldown 60 сек

Redis-based: корректно работает при любом количестве воркеров.
При недоступности Redis — пропускает запросы (fail open), не блокирует пользователей.
"""

import time
import logging
from typing import Callable, Any, Awaitable

import redis.asyncio as aioredis
from aiogram import BaseMiddleware
from aiogram.types import Message, CallbackQuery, TelegramObject

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseMiddleware):
    """
    Redis-backed rate limiter.

    Параметры:
        redis_client — aioredis.Redis клиент (передаётся из main.py)
        msg_limit    — макс. сообщений за msg_window секунд
        cb_limit     — макс. нажатий за cb_window секунд
        flood_limit  — сколько превышений до жёсткого cooldown
        cooldown     — cooldown в секундах
    """

    def __init__(
        self,
        redis_client: aioredis.Redis,
        msg_limit: int = 1,
        msg_window: float = 1.0,
        cb_limit: int = 3,
        cb_window: float = 2.0,
        flood_limit: int = 5,
        cooldown: float = 60.0,
    ):
        self.redis = redis_client
        self.msg_limit = msg_limit
        self.msg_window = max(1, int(msg_window))
        self.cb_limit = cb_limit
        self.cb_window = max(1, int(cb_window))
        self.flood_limit = flood_limit
        self.cooldown = max(1, int(cooldown))

    async def _get_block_remaining(self, user_id: int) -> int:
        ttl = await self.redis.ttl(f"rl:blocked:{user_id}")
        return max(0, ttl)

    async def _check_window(self, key: str, limit: int, window: int) -> bool:
        """Возвращает True если запрос разрешён. Фиксированное окно через INCR."""
        count = await self.redis.incr(key)
        if count == 1:
            await self.redis.expire(key, window + 1)
        return count <= limit

    async def _record_violation(self, user_id: int) -> None:
        flood_key = f"rl:flood:{user_id}"
        count = await self.redis.incr(flood_key)
        if count == 1:
            await self.redis.expire(flood_key, 120)
        if count >= self.flood_limit:
            await self.redis.setex(f"rl:blocked:{user_id}", self.cooldown, "1")
            await self.redis.delete(flood_key)
            logger.warning(
                f"RateLimit: user {user_id} hit flood limit → cooldown {self.cooldown}s"
            )

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        if isinstance(event, Message):
            user_id = event.from_user.id if event.from_user else None
            event_type = "message"
        elif isinstance(event, CallbackQuery):
            user_id = event.from_user.id if event.from_user else None
            event_type = "callback"
        else:
            return await handler(event, data)

        if user_id is None:
            return await handler(event, data)

        try:
            remaining = await self._get_block_remaining(user_id)
            if remaining > 0:
                if event_type == "message":
                    await event.answer(
                        f"🚫 Слишком много запросов. Подождите <b>{remaining} сек</b>.",
                        parse_mode="HTML",
                    )
                else:
                    await event.answer(f"🚫 Подождите {remaining} сек.", show_alert=True)
                return

            now_bucket = int(time.time())
            if event_type == "message":
                key = f"rl:msg:{user_id}:{now_bucket // self.msg_window}"
                allowed = await self._check_window(key, self.msg_limit, self.msg_window)
            else:
                key = f"rl:cb:{user_id}:{now_bucket // self.cb_window}"
                allowed = await self._check_window(key, self.cb_limit, self.cb_window)

            if not allowed:
                await self._record_violation(user_id)
                if event_type == "message":
                    await event.answer("⏳ Не так быстро. Чуть помедленнее.")
                else:
                    await event.answer("⏳ Не так быстро.", show_alert=False)
                return

        except Exception as e:
            logger.warning(f"RateLimit Redis error: {e} — allowing request")

        return await handler(event, data)
