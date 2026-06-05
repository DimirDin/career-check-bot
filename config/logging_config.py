"""
logging_config.py — B9: структурированное логирование через structlog.

Конфигурирует structlog поверх stdlib logging — все существующие
logging.getLogger(__name__) вызовы продолжают работать, но теперь
выводят JSON-строки в production и читаемый формат в dev.

Пример JSON-лога:
  {"event":"premium_pdf_sent","user_id":123,"stars":99,"lang":"ru","level":"info","timestamp":"..."}
"""

import logging
import os
import sys

import structlog


def configure_logging(level: str = "INFO") -> None:
    """Вызывать один раз при старте приложения."""

    is_dev = os.getenv("ENV", "production").lower() in ("dev", "development", "local")

    shared_processors = [
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if is_dev:
        renderer = structlog.dev.ConsoleRenderer(colors=True)
    else:
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=shared_processors + [renderer],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Stdlib logging → structlog
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, level.upper(), logging.INFO),
    )

    # Глушим шумные библиотеки
    for noisy in ("aiogram", "aiohttp", "uvicorn.access", "asyncio"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
