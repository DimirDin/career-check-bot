"""Add purchases table for tracking Premium payments + A/B group.

Revision ID: 002
Revises: 001
Create Date: 2026-06-05
"""

from alembic import op

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS purchases (
            id           SERIAL PRIMARY KEY,
            telegram_id  BIGINT NOT NULL,
            stars        INTEGER NOT NULL,
            ab_group     INTEGER,           -- 0/1/2 (A/B/C price group)
            payload      TEXT,
            created_at   TIMESTAMP DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_purchases_telegram ON purchases(telegram_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS purchases CASCADE")
