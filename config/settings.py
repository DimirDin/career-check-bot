import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv('BOT_TOKEN')

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'career_db'),
    'user': os.getenv('DB_USER', 'career_user'),
    'password': os.getenv('DB_PASSWORD', 'career_pass')
}

REDIS_CONFIG = {
    'host': os.getenv('REDIS_HOST', 'localhost'),
    'port': int(os.getenv('REDIS_PORT', 6379)),
    'decode_responses': True
}

# Админы бота (telegram_id)
ADMIN_IDS = [756303]  # замени на свои ID

BOT_USERNAME        = os.getenv("BOT_USERNAME", "CareerCheck_Bot")
ANTHROPIC_API_KEY   = os.getenv("ANTHROPIC_API_KEY", "")
PREMIUM_PRICE_STARS = int(os.getenv("PREMIUM_PRICE_STARS", "99"))

# Promptra — OpenAI-compatible агрегатор (PDF + чат)
PROMPTRA_API_KEY      = os.getenv("PROMPTRA_API_KEY", "")       # для Premium PDF
PROMPTRA_CHAT_API_KEY = os.getenv("PROMPTRA_CHAT_API_KEY", "")  # отдельный токен для AI-чата
PROMPTRA_BASE_URL     = os.getenv("PROMPTRA_BASE_URL", "https://api.promptra.ru/v1")
PROMPTRA_MODEL        = os.getenv("PROMPTRA_MODEL", "anthropic/claude-sonnet-4.6")
PROMPTRA_CHAT_MODEL   = os.getenv("PROMPTRA_CHAT_MODEL", "deepseek/deepseek-v4-flash")

# M2: A/B тест цены — пока все платят 99. Для включения A/B задай env-переменные:
# PREMIUM_PRICE_A=49  PREMIUM_PRICE_B=99  PREMIUM_PRICE_C=149
PREMIUM_PRICES_AB = [
    int(os.getenv("PREMIUM_PRICE_A", "99")),
    int(os.getenv("PREMIUM_PRICE_B", "99")),
    int(os.getenv("PREMIUM_PRICE_C", "99")),
]

def get_ab_price(telegram_id: int) -> int:
    """Возвращает цену для пользователя. По умолчанию все в группе B (99 Stars)."""
    return PREMIUM_PRICES_AB[int(telegram_id) % 3]
