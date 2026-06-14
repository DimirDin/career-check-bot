"""Add pdf_sent_at to purchases — marks PDF as already delivered.

Revision ID: 006
Revises: 005
Create Date: 2026-06-14
"""

from alembic import op

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE purchases
        ADD COLUMN IF NOT EXISTS pdf_sent_at TIMESTAMP DEFAULT NULL
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE purchases DROP COLUMN IF EXISTS pdf_sent_at")
