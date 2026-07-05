"""
Гейт по подписке на канал/бота (см. GATE_CHANNEL_USERNAME) — тест доступен только подписчикам.
Паттерн зеркалит botyard-baza/backend/app/gate.py:

1. Redis-кэш gate:sub:{tg_id}
   - hit subscribed     → пускаем (TTL GATE_TTL_SUBSCRIBED)
   - hit not_subscribed  → гейт (TTL GATE_TTL_NOT_SUBSCRIBED — короткий, чтобы не ждать после подписки)
   - miss                → getChatMember → записать в кэш
2. Деградация: сбой Telegram API → не блокируем (fail-open), логируем предупреждение
"""

import logging

import httpx

from config.settings import BOT_TOKEN, GATE_CHANNEL_USERNAME, GATE_TTL_SUBSCRIBED, GATE_TTL_NOT_SUBSCRIBED

logger = logging.getLogger(__name__)

TELEGRAM_API = f"https://api.telegram.org/bot{{token}}/getChatMember"


async def check_subscription(redis, tg_id: int, force: bool = False) -> bool:
    """Возвращает True если пользователь подписан на GATE_CHANNEL_USERNAME. Кэширует в Redis."""
    cache_key = f"gate:sub:{tg_id}"

    if not force:
        cached = await redis.get(cache_key)
        if cached is not None:
            return cached == "1"

    is_subscribed = await _fetch_subscription_status(tg_id)
    ttl = GATE_TTL_SUBSCRIBED if is_subscribed else GATE_TTL_NOT_SUBSCRIBED
    await redis.set(cache_key, "1" if is_subscribed else "0", ex=ttl)
    return is_subscribed


async def _fetch_subscription_status(tg_id: int) -> bool:
    """Дёргает getChatMember. При сбое Telegram API — fail-open (не блокируем)."""
    url = TELEGRAM_API.format(token=BOT_TOKEN)
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params={"chat_id": GATE_CHANNEL_USERNAME, "user_id": tg_id})
            data = resp.json()
        if not data.get("ok"):
            logger.warning(f"Gate getChatMember not ok: {data}")
            return True
        status = data["result"]["status"]
        return status in ("member", "administrator", "creator")
    except (httpx.HTTPError, KeyError, ValueError) as e:
        logger.warning(f"Gate check failed, fail-open: {e}")
        return True
