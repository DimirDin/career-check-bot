"""Add last_completed_date to user_challenges.

Revision ID: 005
Revises: 004
Create Date: 2026-06-09
"""

import sqlalchemy as sa
from alembic import op

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'user_challenges',
        sa.Column('last_completed_date', sa.Date(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('user_challenges', 'last_completed_date')
