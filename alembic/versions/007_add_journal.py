"""add journal_entries table

Revision ID: 007_add_journal
Revises: 006_add_ai_reports
Create Date: 2025-01-01
"""
from alembic import op
import sqlalchemy as sa

revision = '007_add_journal'
down_revision = '006_add_ai_reports'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'journal_entries',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('trait_tag', sa.String(1), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_journal_user_id', 'journal_entries', ['user_id'])


def downgrade():
    op.drop_index('ix_journal_user_id', table_name='journal_entries')
    op.drop_table('journal_entries')
