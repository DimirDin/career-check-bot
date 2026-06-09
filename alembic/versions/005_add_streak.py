"""Add streak_days and last_completed_date to challenge_subscriptions.

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
        'challenge_subscriptions',
        sa.Column('streak_days', sa.Integer(), nullable=False, server_default='0'),
    )
    op.add_column(
        'challenge_subscriptions',
        sa.Column('last_completed_date', sa.Date(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('challenge_subscriptions', 'last_completed_date')
    op.drop_column('challenge_subscriptions', 'streak_days')
