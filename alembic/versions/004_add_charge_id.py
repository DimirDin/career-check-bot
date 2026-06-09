"""Add telegram_payment_charge_id to purchases for idempotency.

Revision ID: 004
Revises: 003
Create Date: 2026-06-09
"""

import sqlalchemy as sa
from alembic import op

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'purchases',
        sa.Column('telegram_payment_charge_id', sa.String(), nullable=True),
    )
    op.create_index(
        'uq_purchases_charge_id',
        'purchases',
        ['telegram_payment_charge_id'],
        unique=True,
        postgresql_where=sa.text('telegram_payment_charge_id IS NOT NULL'),
    )


def downgrade() -> None:
    op.drop_index('uq_purchases_charge_id', table_name='purchases')
    op.drop_column('purchases', 'telegram_payment_charge_id')
