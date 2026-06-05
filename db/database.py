import json
import logging
import numpy as np
import asyncpg

logger = logging.getLogger(__name__)

# ── Вспомогательная функция для выбора поля по языку ─────────────────────────

def _lang_col(base: str, lang: str) -> str:
    """
    Возвращает имя колонки с учётом языка.
    Если lang == 'ru' или колонка не переведена — фолбэк на base.
    """
    if lang and lang != "ru":
        return f"{base}_{lang}"
    return base


# ── Пользователи ──────────────────────────────────────────────────────────────

async def get_user(pool: asyncpg.Pool, telegram_id: int):
    async with pool.acquire() as conn:
        return await conn.fetchrow('SELECT * FROM users WHERE telegram_id = $1', telegram_id)


async def create_user(
    pool: asyncpg.Pool,
    telegram_id: int,
    username: str,
    full_name: str,
    lang: str = "en",
):
    async with pool.acquire() as conn:
        await conn.execute(
            '''INSERT INTO users (telegram_id, username, full_name, lang)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (telegram_id) DO NOTHING''',
            telegram_id, username, full_name, lang
        )


async def update_user_lang(pool: asyncpg.Pool, telegram_id: int, lang: str):
    """Обновляет язык пользователя (на случай смены языка в Telegram)."""
    async with pool.acquire() as conn:
        await conn.execute(
            'UPDATE users SET lang = $1 WHERE telegram_id = $2',
            lang, telegram_id
        )


# ── Вопросы ───────────────────────────────────────────────────────────────────

async def get_questions(pool: asyncpg.Pool, lang: str = "ru"):
    """
    Возвращает вопросы с текстом на нужном языке.
    Если перевод отсутствует (NULL) — фолбэк на русский.
    """
    lang_col = _lang_col("question_text", lang)

    async with pool.acquire() as conn:
        if lang == "ru":
            rows = await conn.fetch(
                '''SELECT id, trait, question_text, is_inverted
                   FROM questions WHERE active = TRUE ORDER BY id'''
            )
        else:
            rows = await conn.fetch(
                f'''SELECT id, trait,
                       COALESCE({lang_col}, question_text) AS question_text,
                       is_inverted
                   FROM questions WHERE active = TRUE ORDER BY id'''
            )
        return [dict(row) for row in rows]


# ── Профессии ─────────────────────────────────────────────────────────────────

async def get_professions(pool: asyncpg.Pool, lang: str = "ru"):
    """Профессии с переведёнными title и description."""
    async with pool.acquire() as conn:
        if lang == "ru":
            rows = await conn.fetch(
                'SELECT id, title, description, required_traits, riasec_type, growth_potential FROM professions'
            )
        else:
            t_col = _lang_col("title", lang)
            d_col = _lang_col("description", lang)
            rows = await conn.fetch(
                f'''SELECT id,
                       COALESCE({t_col}, title) AS title,
                       COALESCE({d_col}, description) AS description,
                       required_traits, riasec_type, growth_potential
                   FROM professions'''
            )
        result = []
        for row in rows:
            d = dict(row)
            if isinstance(d.get('required_traits'), str):
                d['required_traits'] = json.loads(d['required_traits'])
            result.append(d)
        return result


async def get_profession_details(pool: asyncpg.Pool, title: str, lang: str = "ru"):
    """
    Детали профессии по title (RU-оригинал).
    Ищем всегда по русскому title — он является ключом в БД.
    """
    async with pool.acquire() as conn:
        if lang == "ru":
            row = await conn.fetchrow(
                '''SELECT pd.profession_id, pd.reality, pd.pros, pd.cons FROM profession_details pd
                   JOIN professions p ON p.id = pd.profession_id
                   WHERE p.title = $1''', title
            )
        else:
            r_col   = _lang_col("reality", lang)
            pros_col= _lang_col("pros",    lang)
            cons_col= _lang_col("cons",    lang)
            row = await conn.fetchrow(
                f'''SELECT pd.profession_id,
                       COALESCE(pd.{r_col}, pd.reality) AS reality,
                       COALESCE(pd.{pros_col}, pd.pros) AS pros,
                       COALESCE(pd.{cons_col}, pd.cons) AS cons
                   FROM profession_details pd
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


async def get_profession_details_by_title_lang(
    pool: asyncpg.Pool,
    title_localized: str,
    lang: str,
):
    """
    Ищем детали по переведённому title (для finish_test где title уже локализован).
    Fallback: ищем по оригинальному RU title.
    """
    async with pool.acquire() as conn:
        if lang == "ru":
            col = "p.title"
        else:
            t_col = _lang_col("title", lang)
            col = f"COALESCE(p.{t_col}, p.title)"

        if lang == "ru":
            row = await conn.fetchrow(
                f'''SELECT pd.profession_id, pd.reality, pd.pros, pd.cons FROM profession_details pd
                   JOIN professions p ON p.id = pd.profession_id
                   WHERE p.title = $1''', title_localized
            )
        else:
            r_col    = _lang_col("reality", lang)
            pros_col = _lang_col("pros", lang)
            cons_col = _lang_col("cons", lang)
            row = await conn.fetchrow(
                f'''SELECT pd.profession_id,
                       COALESCE(pd.{r_col}, pd.reality) AS reality,
                       COALESCE(pd.{pros_col}, pd.pros) AS pros,
                       COALESCE(pd.{cons_col}, pd.cons) AS cons
                   FROM profession_details pd
                   JOIN professions p ON p.id = pd.profession_id
                   WHERE COALESCE(p.{_lang_col("title", lang)}, p.title) = $1''',
                title_localized
            )
        if row:
            d = dict(row)
            for key in ['pros', 'cons']:
                if isinstance(d.get(key), str):
                    d[key] = json.loads(d[key])
            return d
        return None


# ── Результаты ────────────────────────────────────────────────────────────────

async def save_result(
    pool: asyncpg.Pool,
    user_id: int,
    raw_scores: dict,
    normalized_scores: dict,
    riasec_profile: dict,
    top_professions: list,
):
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

    raw_json    = json.dumps(clean_dict(raw_scores),        ensure_ascii=False)
    norm_json   = json.dumps(clean_dict(normalized_scores), ensure_ascii=False)
    riasec_json = json.dumps(clean_dict(riasec_profile),    ensure_ascii=False)
    top_json    = json.dumps(clean_list(top_professions),   ensure_ascii=False)

    logger.info(f"SAVE_RESULT: user_id={user_id}")

    async with pool.acquire() as conn:
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


# ── Статистика ────────────────────────────────────────────────────────────────

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
        # Распределение по языкам
        lang_stats  = await conn.fetch(
            'SELECT lang, COUNT(*) as cnt FROM users GROUP BY lang ORDER BY cnt DESC'
        )

    return {
        'total_users': total_users or 0,
        'tested':      tested      or 0,
        'last_24h':    last_24h    or 0,
        'last_7d':     last_7d     or 0,
        'avg_scores':  dict(avg_scores) if avg_scores else {},
        'top_profs':   [dict(r) for r in top_profs]   if top_profs   else [],
        'lang_stats':  [dict(r) for r in lang_stats]  if lang_stats  else [],
    }


# ── Прогресс теста ────────────────────────────────────────────────────────────

async def save_progress(pool: asyncpg.Pool, user_id: int, answers: list, current_question: int):
    async with pool.acquire() as conn:
        await conn.execute(
            '''INSERT INTO test_progress (user_id, answers, current_question)
               VALUES ($1, $2, $3)
               ON CONFLICT (user_id) DO UPDATE SET
                   answers = EXCLUDED.answers,
                   current_question = EXCLUDED.current_question,
                   updated_at = NOW()''',
            user_id, json.dumps(answers), current_question
        )
    logger.info(f"PROGRESS SAVED: user_id={user_id}, question {current_question}/60")


async def get_progress(pool: asyncpg.Pool, user_id: int):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT answers, current_question FROM test_progress WHERE user_id = $1',
            user_id
        )
        if not row:
            return None
        answers = row['answers']
        if isinstance(answers, str):
            answers = json.loads(answers)
        return {
            'answers': answers,
            'current_question': row['current_question']
        }


async def clear_progress(pool: asyncpg.Pool, user_id: int):
    async with pool.acquire() as conn:
        result = await conn.execute(
            'DELETE FROM test_progress WHERE user_id = $1',
            user_id
        )
        if result != "DELETE 0":
            logger.info(f"PROGRESS CLEARED: user_id={user_id}")


# ── Рефералы (M3) ─────────────────────────────────────────────────────────────

async def save_referral(pool: asyncpg.Pool, referrer_telegram_id: int, referred_telegram_id: int):
    """Сохраняет реферальную связь если ещё не существует."""
    async with pool.acquire() as conn:
        await conn.execute(
            '''INSERT INTO referrals (referrer_id, referred_id)
               VALUES ($1, $2)
               ON CONFLICT (referred_id) DO NOTHING''',
            referrer_telegram_id, referred_telegram_id
        )

async def get_referral_count(pool: asyncpg.Pool, referrer_telegram_id: int) -> int:
    async with pool.acquire() as conn:
        return await conn.fetchval(
            'SELECT COUNT(*) FROM referrals WHERE referrer_id = $1',
            referrer_telegram_id
        ) or 0

async def mark_referral_bonus(pool: asyncpg.Pool, referred_telegram_id: int):
    """Помечает что бонус рефереру выдан."""
    async with pool.acquire() as conn:
        await conn.execute(
            'UPDATE referrals SET bonus_granted = TRUE WHERE referred_id = $1',
            referred_telegram_id
        )

async def get_referrer(pool: asyncpg.Pool, referred_telegram_id: int):
    """Возвращает telegram_id реферера или None."""
    async with pool.acquire() as conn:
        return await conn.fetchval(
            'SELECT referrer_id FROM referrals WHERE referred_id = $1',
            referred_telegram_id
        )


# ── Челленджи (N3) ────────────────────────────────────────────────────────────

async def get_daily_challenge(pool: asyncpg.Pool, user_telegram_id: int, lang: str = "ru"):
    """Выбирает следующий челлендж для пользователя (циклически)."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT last_challenge_id FROM user_challenges WHERE user_telegram_id = $1',
            user_telegram_id
        )
        last_id = row['last_challenge_id'] if row else 0

        challenge = await conn.fetchrow(
            'SELECT id, trait_target, text_ru, text_en FROM challenges WHERE id > $1 ORDER BY id LIMIT 1',
            last_id or 0
        )
        if not challenge:
            challenge = await conn.fetchrow(
                'SELECT id, trait_target, text_ru, text_en FROM challenges ORDER BY id LIMIT 1'
            )

        return dict(challenge) if challenge else None

async def get_challenge_subscribers(pool: asyncpg.Pool):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            '''SELECT uc.user_telegram_id, u.lang FROM user_challenges uc
               LEFT JOIN users u ON u.telegram_id = uc.user_telegram_id
               WHERE uc.subscribed = TRUE
                 AND (uc.last_sent_date IS NULL OR uc.last_sent_date < CURRENT_DATE)'''
        )
        return [dict(r) for r in rows]

async def subscribe_challenges(pool: asyncpg.Pool, user_telegram_id: int):
    async with pool.acquire() as conn:
        await conn.execute(
            '''INSERT INTO user_challenges (user_telegram_id, subscribed)
               VALUES ($1, TRUE)
               ON CONFLICT (user_telegram_id) DO UPDATE SET subscribed = TRUE''',
            user_telegram_id
        )

async def unsubscribe_challenges(pool: asyncpg.Pool, user_telegram_id: int):
    async with pool.acquire() as conn:
        await conn.execute(
            'UPDATE user_challenges SET subscribed = FALSE WHERE user_telegram_id = $1',
            user_telegram_id
        )

async def mark_challenge_sent(pool: asyncpg.Pool, user_telegram_id: int, challenge_id: int):
    async with pool.acquire() as conn:
        await conn.execute(
            '''INSERT INTO user_challenges (user_telegram_id, last_sent_date, last_challenge_id)
               VALUES ($1, CURRENT_DATE, $2)
               ON CONFLICT (user_telegram_id) DO UPDATE SET
                   last_sent_date = CURRENT_DATE,
                   last_challenge_id = $2,
                   streak = COALESCE(user_challenges.streak, 0) + 1''',
            user_telegram_id, challenge_id
        )


async def cleanup_old_progress(pool: asyncpg.Pool, days: int = 7):
    async with pool.acquire() as conn:
        result = await conn.execute(
            'DELETE FROM test_progress WHERE updated_at < NOW() - make_interval(days => $1)',
            days
        )
        deleted = int(result.split()[-1]) if result.split()[-1].isdigit() else 0
        if deleted > 0:
            logger.info(f"TTL CLEANUP: deleted {deleted} old progress records")
        return deleted
