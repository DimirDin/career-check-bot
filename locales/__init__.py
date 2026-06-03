"""
locales/__init__.py

Использование:
    from locales import get_text, SUPPORTED_LANGS, resolve_lang

    lang = resolve_lang(message.from_user.language_code)
    text = get_text("welcome_title", lang)
"""

from locales.ru import STRINGS as RU
from locales.en import STRINGS as EN
from locales.hi import STRINGS as HI
from locales.es import STRINGS as ES
from locales.pt import STRINGS as PT

SUPPORTED_LANGS = {"ru", "en", "hi", "es", "pt"}
DEFAULT_LANG    = "en"

_LOCALE_MAP: dict[str, dict] = {
    "ru": RU,
    "en": EN,
    "hi": HI,
    "es": ES,
    "pt": PT,
}

# Telegram language_code → наш код
_TG_MAP: dict[str, str] = {
    "ru": "ru",
    "en": "en",
    "hi": "hi",
    "es": "es",
    "pt": "pt",
    "pt-br": "pt",
    "pt-BR": "pt",
}


def resolve_lang(tg_lang_code: str | None) -> str:
    """Определяет наш код языка из Telegram language_code. Фолбэк — en."""
    if not tg_lang_code:
        return DEFAULT_LANG
    # Пробуем точное совпадение, затем префикс до дефиса
    code = _TG_MAP.get(tg_lang_code)
    if code:
        return code
    prefix = tg_lang_code.split("-")[0].split("_")[0].lower()
    return _TG_MAP.get(prefix, DEFAULT_LANG)


def get_text(key: str, lang: str, **kwargs) -> str:
    """
    Возвращает строку по ключу для языка.
    Фолбэк: en → ru (на случай неполного перевода).
    kwargs подставляются через str.format().
    """
    strings = _LOCALE_MAP.get(lang, EN)
    value   = strings.get(key) or EN.get(key) or RU.get(key) or key
    if kwargs:
        try:
            value = value.format(**kwargs)
        except (KeyError, ValueError):
            pass
    return value
