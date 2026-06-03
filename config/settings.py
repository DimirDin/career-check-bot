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
