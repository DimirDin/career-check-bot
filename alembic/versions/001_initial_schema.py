"""Initial schema — baseline for existing production DB.

Revision ID: 001
Revises:
Create Date: 2026-06-05

На существующей prod БД запустить:
    alembic stamp 001
Это отметит текущую схему как применённую без выполнения SQL.

На чистой БД:
    alembic upgrade head
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            telegram_id BIGINT UNIQUE NOT NULL,
            username TEXT,
            full_name TEXT,
            lang VARCHAR(5) DEFAULT 'en',
            created_at TIMESTAMP DEFAULT NOW(),
            test_completed BOOLEAN DEFAULT FALSE
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS questions (
            id SERIAL PRIMARY KEY,
            trait TEXT NOT NULL,
            question_text TEXT NOT NULL,
            question_text_en TEXT,
            question_text_hi TEXT,
            question_text_es TEXT,
            question_text_pt TEXT,
            is_inverted BOOLEAN DEFAULT FALSE,
            weight INTEGER DEFAULT 1,
            active BOOLEAN DEFAULT TRUE
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS professions (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            title_en TEXT, title_hi TEXT, title_es TEXT, title_pt TEXT,
            description TEXT,
            description_en TEXT, description_hi TEXT, description_es TEXT, description_pt TEXT,
            required_traits JSONB NOT NULL,
            riasec_type TEXT,
            salary_range TEXT,
            growth_potential TEXT
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS profession_details (
            id SERIAL PRIMARY KEY,
            profession_id INTEGER REFERENCES professions(id),
            reality TEXT,
            reality_en TEXT, reality_hi TEXT, reality_es TEXT, reality_pt TEXT,
            pros JSONB,
            pros_en JSONB, pros_hi JSONB, pros_es JSONB, pros_pt JSONB,
            cons JSONB,
            cons_en JSONB, cons_hi JSONB, cons_es JSONB, cons_pt JSONB
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS test_results (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            raw_scores JSONB NOT NULL,
            normalized_scores JSONB NOT NULL,
            riasec_profile JSONB NOT NULL,
            top_professions JSONB,
            completed_at TIMESTAMP DEFAULT NOW(),
            pdf_report_url TEXT
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS test_progress (
            telegram_id BIGINT PRIMARY KEY,
            state_data JSONB,
            answers JSONB,
            question_idx INTEGER,
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS test_progress CASCADE")
    op.execute("DROP TABLE IF EXISTS test_results CASCADE")
    op.execute("DROP TABLE IF EXISTS profession_details CASCADE")
    op.execute("DROP TABLE IF EXISTS professions CASCADE")
    op.execute("DROP TABLE IF EXISTS questions CASCADE")
    op.execute("DROP TABLE IF EXISTS users CASCADE")
