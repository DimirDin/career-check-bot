import json
import logging
import numpy as np
import asyncpg

logger = logging.getLogger(__name__)

# -------------------------------------------------------
# Все функции принимают pool: asyncpg.Pool как первый аргумент.
# Соединение берётся из пула через async with pool.acquire()
# и автоматически возвращается обратно после блока.
# -------------------------------------------------------

async def get_user(pool: asyncpg.Pool, telegram_id: int):
    async with pool.acquire() as conn:
        return await conn.fetchrow('SELECT * FROM users WHERE telegram_id = $1', telegram_id)


async def create_user(pool: asyncpg.Pool, telegram_id: int, username: str, full_name: str):
    async with pool.acquire() as conn:
        await conn.execute(
            '''INSERT INTO users (telegram_id, username, full_name)
               VALUES ($1, $2, $3) ON CONFLICT (telegram_id) DO NOTHING''',
            telegram_id, username, full_name
        )


async def get_questions(pool: asyncpg.Pool):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT id, trait, question_text, is_inverted FROM questions WHERE active = TRUE ORDER BY id'
        )
        return [dict(row) for row in rows]


async def save_result(pool: asyncpg.Pool, user_id: int, raw_scores: dict,
                      normalized_scores: dict, riasec_profile: dict, top_professions: list):
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
        return [
            {k: clean_val(v) for k, v in item.items()} if isinstance(item, dict) else clean_val(item)
            for item in lst
        ]

    raw_json    = json.dumps(clean_dict(raw_scores),       ensure_ascii=False)
    norm_json   = json.dumps(clean_dict(normalized_scores),ensure_ascii=False)
    riasec_json = json.dumps(clean_dict(riasec_profile),   ensure_ascii=False)
    top_json    = json.dumps(clean_list(top_professions),  ensure_ascii=False)

    logger.info(f"SAVE_RESULT: user_id={user_id}")

    async with pool.acquire() as conn:
        # Используем транзакцию — insert + update атомарно
        async with conn.transaction():
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


async def get_professions(pool: asyncpg.Pool):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT id, title, description, required_traits, riasec_type, growth_potential FROM professions'
        )
        result = []
        for row in rows:
            d = dict(row)
            if isinstance(d.get('required_traits'), str):
                d['required_traits'] = json.loads(d['required_traits'])
            result.append(d)
        return result


async def get_profession_details(pool: asyncpg.Pool, title: str):
    async with pool.acquire() as conn:
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


async def get_last_result(pool: asyncpg.Pool, user_id: int):
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            '''SELECT raw_scores, normalized_scores, riasec_profile, top_professions, completed_at
               FROM test_results
               WHERE user_id = $1
               ORDER BY completed_at DESC
               LIMIT 1''',
            user_id
        )


async def get_stats(pool: asyncpg.Pool):
    async with pool.acquire() as conn:
        total_users = await conn.fetchval('SELECT COUNT(*) FROM users')
        tested      = await conn.fetchval("SELECT COUNT(*) FROM users WHERE test_completed = TRUE")
        last_24h    = await conn.fetchval(
            "SELECT COUNT(*) FROM test_results WHERE completed_at > NOW() - INTERVAL '24 hours'"
        )
        last_7d     = await conn.fetchval(
            "SELECT COUNT(*) FROM test_results WHERE completed_at > NOW() - INTERVAL '7 days'"
        )
        avg_scores  = await conn.fetchrow(
            '''SELECT
                AVG((normalized_scores->>'O')::int) as avg_o,
                AVG((normalized_scores->>'C')::int) as avg_c,
                AVG((normalized_scores->>'E')::int) as avg_e,
                AVG((normalized_scores->>'A')::int) as avg_a,
                AVG((normalized_scores->>'S')::int) as avg_s
               FROM test_results'''
        )
        top_profs   = await conn.fetch(
            '''SELECT p.title, COUNT(*) as cnt
               FROM test_results tr
               JOIN professions p ON p.id = (tr.top_professions->0->>'id')::int
               GROUP BY p.title
               ORDER BY cnt DESC
               LIMIT 3'''
        )

    return {
        'total_users': total_users or 0,
        'tested':      tested      or 0,
        'last_24h':    last_24h    or 0,
        'last_7d':     last_7d     or 0,
        'avg_scores':  dict(avg_scores) if avg_scores else {},
        'top_profs':   [dict(r) for r in top_profs] if top_profs else [],
    }
