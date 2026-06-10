"""add ai_reports table

Revision ID: 006_add_ai_reports
Revises: 005_add_streak
Create Date: 2025-01-01
"""
from alembic import op
import sqlalchemy as sa

revision = '006_add_ai_reports'
down_revision = '005_add_streak'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'ai_reports',
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), primary_key=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )


def downgrade():
    op.drop_table('ai_reports')
