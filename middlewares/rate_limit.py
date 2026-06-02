"""
Middleware: rate limiting для защиты от спама.

Логика:
- MESSAGE  : не чаще 1 сообщения в 1 сек (скользящее окно)
- CALLBACK : не чаще 3 кликов в 2 сек (защита от дабл-клика / автокликера)
- FLOOD    : если пользователь превышает лимит 5+ раз подряд → cooldown 60 сек

Хранение — in-memory dict: подходит для одного процесса.
Если понадобится несколько воркеров — заменить на Redis.
"""

import time
import logging
from collections import defaultdict, deque
from typing import Callable, Any, Awaitable

from aiogram import BaseMiddleware
from aiogram.types import Message, CallbackQuery, TelegramObject

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseMiddleware):
    """
    Конфигурируемый rate limiter.

    Параметры:
        msg_limit   – макс. сообщений за msg_window секунд
        cb_limit    – макс. нажатий за cb_window секунд
        flood_limit – сколько превышений подряд до жёсткого cooldown
        cooldown    – cooldown в секундах после flood_limit превышений
    """

    def __init__(
        self,
        msg_limit: int = 1,
        msg_window: float = 1.0,
        cb_limit: int = 3,
        cb_window: float = 2.0,
        flood_limit: int = 5,
        cooldown: float = 60.0,
    ):
        self.msg_limit = msg_limit
        self.msg_window = msg_window
        self.cb_limit = cb_limit
        self.cb_window = cb_window
        self.flood_limit = flood_limit
        self.cooldown = cooldown

        # user_id → deque of timestamps
        self._msg_history:  dict[int, deque] = defaultdict(deque)
        self._cb_history:   dict[int, deque] = defaultdict(deque)

        # user_id → количество consecutive violations
        self._violations:   dict[int, int]   = defaultdict(int)

        # user_id → время до которого заблокирован
        self._blocked_until: dict[int, float] = {}

    # ------------------------------------------------------------------ #

    def _is_blocked(self, user_id: int, now: float) -> bool:
        until = self._blocked_until.get(user_id, 0)
        return now < until

    def _check_window(
        self, history: deque, limit: int, window: float, now: float
    ) -> bool:
        """Возвращает True если запрос разрешён, False если превышен лимит."""
        # Убираем устаревшие записи
        while history and now - history[0] > window:
            history.popleft()

        if len(history) >= limit:
            return False

        history.append(now)
        return True

    def _handle_violation(self, user_id: int, now: float) -> None:
        self._violations[user_id] += 1
        if self._violations[user_id] >= self.flood_limit:
            self._blocked_until[user_id] = now + self.cooldown
            self._violations[user_id] = 0
            logger.warning(
                f"RateLimit: user {user_id} hit flood limit → "
                f"cooldown {self.cooldown}s"
            )

    # ------------------------------------------------------------------ #

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:

        # Определяем тип события и user_id
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

        now = time.monotonic()

        # ── Жёсткая блокировка (flood cooldown) ──────────────────────
        if self._is_blocked(user_id, now):
            remaining = int(self._blocked_until[user_id] - now)
            if event_type == "message":
                await event.answer(
                    f"🚫 Слишком много запросов. Подождите <b>{remaining} сек</b>.",
                    parse_mode="HTML",
                )
            else:
                await event.answer(
                    f"🚫 Подождите {remaining} сек.", show_alert=True
                )
            return  # не передаём хендлеру

        # ── Скользящее окно ───────────────────────────────────────────
        if event_type == "message":
            allowed = self._check_window(
                self._msg_history[user_id], self.msg_limit, self.msg_window, now
            )
        else:
            allowed = self._check_window(
                self._cb_history[user_id], self.cb_limit, self.cb_window, now
            )

        if not allowed:
            self._handle_violation(user_id, now)

            if event_type == "message":
                await event.answer("⏳ Не так быстро. Чуть помедленнее.")
            else:
                await event.answer("⏳ Не так быстро.", show_alert=False)
            return

        # Нарушений не было — сбрасываем счётчик
        if user_id in self._violations:
            self._violations[user_id] = 0

        return await handler(event, data)
