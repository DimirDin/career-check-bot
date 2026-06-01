import asyncpg
import json
import numpy as np
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
    import logging
    logger = logging.getLogger(__name__)
    
    conn = await get_db()
    try:
        # Конвертируем numpy-типы в чистые Python-типы
        def clean_val(v):
            if isinstance(v, (np.integer, np.int64, np.int32)):
                return int(v)
            if isinstance(v, (np.floating, np.float64, np.float32)):
                return float(v)
            if isinstance(v, np.ndarray):
                return v.tolist()
            return v
        
        def clean_dict(d):
            return {k: clean_val(v) for k, v in d.items()}
        
        def clean_list(lst):
            result = []
            for item in lst:
                if isinstance(item, dict):
                    result.append({k: clean_val(v) for k, v in item.items()})
                else:
                    result.append(clean_val(item))
            return result
        
        raw_clean = clean_dict(raw_scores)
        norm_clean = clean_dict(normalized_scores)
        riasec_clean = clean_dict(riasec_profile)
        top_clean = clean_list(top_professions)
        
        # СЕРИАЛИЗУЕМ В JSON-СТРОКИ для asyncpg
        raw_json = json.dumps(raw_clean, ensure_ascii=False)
        norm_json = json.dumps(norm_clean, ensure_ascii=False)
        riasec_json = json.dumps(riasec_clean, ensure_ascii=False)
        top_json = json.dumps(top_clean, ensure_ascii=False)
        
        logger.info(f"SAVE_RESULT: user_id={user_id}")
        
        await conn.execute(
            '''INSERT INTO test_results 
               (user_id, raw_scores, normalized_scores, riasec_profile, top_professions)
               VALUES ($1, $2, $3, $4, $5)''',
            user_id, raw_json, norm_json, riasec_json, top_json
        )
        await conn.execute(
            'UPDATE users SET test_completed = TRUE WHERE id = $1', user_id
        )
        logger.info(f"SAVE_RESULT: SUCCESS for user_id={user_id}")
    except Exception as e:
        logger.error(f"SAVE_RESULT ERROR: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise
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

async def get_stats():
    """Статистика бота для админ-панели"""
    conn = await get_db()
    try:
        # Всего пользователей
        total_users = await conn.fetchval('SELECT COUNT(*) FROM users')
        
        # Прошли тест
        tested = await conn.fetchval("SELECT COUNT(*) FROM users WHERE test_completed = TRUE")
        
        # За 24 часа
        last_24h = await conn.fetchval(
            "SELECT COUNT(*) FROM test_results WHERE completed_at > NOW() - INTERVAL '24 hours'"
        )
        
        # За 7 дней
        last_7d = await conn.fetchval(
            "SELECT COUNT(*) FROM test_results WHERE completed_at > NOW() - INTERVAL '7 days'"
        )
        
        # Средние баллы Big Five
        avg_scores = await conn.fetchrow(
            '''SELECT 
                AVG((normalized_scores->>'O')::int) as avg_o,
                AVG((normalized_scores->>'C')::int) as avg_c,
                AVG((normalized_scores->>'E')::int) as avg_e,
                AVG((normalized_scores->>'A')::int) as avg_a,
                AVG((normalized_scores->>'S')::int) as avg_s
               FROM test_results'''
        )
        
        # Топ-3 профессии
        top_profs = await conn.fetch(
            '''SELECT 
                p.title,
                COUNT(*) as cnt
               FROM test_results tr
               JOIN professions p ON p.id = (tr.top_professions->0->>'id')::int
               GROUP BY p.title
               ORDER BY cnt DESC
               LIMIT 3'''
        )
        
        return {
            'total_users': total_users or 0,
            'tested': tested or 0,
            'last_24h': last_24h or 0,
            'last_7d': last_7d or 0,
            'avg_scores': dict(avg_scores) if avg_scores else {},
            'top_profs': [dict(row) for row in top_profs] if top_profs else []
        }
    finally:
        await conn.close()
