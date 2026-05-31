import asyncpg
import json
from config.settings import DB_CONFIG

async def get_db():
    return await asyncpg.connect(**DB_CONFIG)

async def get_user(telegram_id: int):
    conn = await get_db()
    try:
        row = await conn.fetchrow('SELECT * FROM users WHERE telegram_id = $1', telegram_id)
        return row
    finally:
        await conn.close()

async def create_user(telegram_id: int, username: str, full_name: str):
    conn = await get_db()
    try:
        await conn.execute(
            '''INSERT INTO users (telegram_id, username, full_name) 
               VALUES ($1, $2, $3) ON CONFLICT (telegram_id) DO NOTHING''',
            telegram_id, username, full_name
        )
    finally:
        await conn.close()

async def get_questions():
    conn = await get_db()
    try:
        rows = await conn.fetch(
            'SELECT id, trait, question_text, is_inverted FROM questions WHERE active = TRUE ORDER BY id'
        )
        return [dict(row) for row in rows]
    finally:
        await conn.close()

async def save_result(user_id: int, raw_scores: dict, normalized_scores: dict, 
                      riasec_profile: dict, top_professions: list):
    conn = await get_db()
    try:
        await conn.execute(
            '''INSERT INTO test_results 
               (user_id, raw_scores, normalized_scores, riasec_profile, top_professions)
               VALUES ($1, $2, $3, $4, $5)''',
            user_id, raw_scores, normalized_scores, riasec_profile, top_professions
        )
        await conn.execute(
            'UPDATE users SET test_completed = TRUE WHERE id = $1', user_id
        )
    finally:
        await conn.close()

async def get_professions():
    conn = await get_db()
    try:
        rows = await conn.fetch('SELECT id, title, description, required_traits, riasec_type, growth_potential FROM professions')
        result = []
        for row in rows:
            d = dict(row)
            if isinstance(d.get('required_traits'), str):
                d['required_traits'] = json.loads(d['required_traits'])
            result.append(d)
        return result
    finally:
        await conn.close()

async def get_profession_details(title: str):
    conn = await get_db()
    try:
        row = await conn.fetchrow(
            '''SELECT pd.* FROM profession_details pd
               JOIN professions p ON p.id = pd.profession_id
               WHERE p.title = $1''', title
        )
        if row:
            d = dict(row)
            for key in ['pros', 'cons']:
                if isinstance(d.get(key), str):
                    d[key] = json.loads(d[key])
            return d
        return None
    finally:
        await conn.close()

async def get_last_result(user_id: int):
    """Получает последний результат теста пользователя"""
    conn = await get_db()
    try:
        row = await conn.fetchrow(
            '''SELECT raw_scores, normalized_scores, riasec_profile, top_professions, completed_at
               FROM test_results 
               WHERE user_id = $1 
               ORDER BY completed_at DESC 
               LIMIT 1''',
            user_id
        )
        return row
    finally:
        await conn.close()
