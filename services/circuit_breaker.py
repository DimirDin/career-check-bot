"""
circuit_breaker.py — простой in-memory circuit breaker для Anthropic API (B10).

Состояния:
  CLOSED  — работаем нормально
  OPEN    — слишком много ошибок, отказываем быстро
  HALF-OPEN — прошёл таймаут, пробуем один запрос

При OPEN возвращаем None вместо вызова API — graceful degradation.
"""

import time
import logging

logger = logging.getLogger(__name__)

_CLOSED    = "closed"
_OPEN      = "open"
_HALF_OPEN = "half-open"


class CircuitBreaker:
    def __init__(self, fail_max: int = 5, reset_timeout: float = 60.0, name: str = "api"):
        self.fail_max      = fail_max
        self.reset_timeout = reset_timeout
        self.name          = name
        self._failures     = 0
        self._state        = _CLOSED
        self._opened_at    = None

    @property
    def state(self) -> str:
        if self._state == _OPEN:
            if time.time() - self._opened_at >= self.reset_timeout:
                self._state = _HALF_OPEN
                logger.info(f"[CB:{self.name}] HALF-OPEN — trying next request")
        return self._state

    @property
    def is_open(self) -> bool:
        return self.state == _OPEN

    def record_success(self) -> None:
        if self._state != _CLOSED:
            logger.info(f"[CB:{self.name}] → CLOSED after success")
        self._failures  = 0
        self._state     = _CLOSED
        self._opened_at = None

    def record_failure(self) -> None:
        self._failures += 1
        if self._state == _HALF_OPEN or self._failures >= self.fail_max:
            self._state     = _OPEN
            self._opened_at = time.time()
            logger.warning(
                f"[CB:{self.name}] OPEN — {self._failures} failures. "
                f"Reset in {self.reset_timeout}s"
            )

    def stats(self) -> dict:
        return {
            "state":     self.state,
            "failures":  self._failures,
            "opened_at": self._opened_at,
        }


# Singleton для Anthropic API
anthropic_breaker = CircuitBreaker(fail_max=5, reset_timeout=60, name="anthropic")
