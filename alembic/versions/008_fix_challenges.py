"""Fix challenges: replace dev-specific GitHub task with universal profile update.

Revision ID: 008
Revises: 007
Create Date: 2026-06-14
"""

from alembic import op

revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        UPDATE challenges
        SET title_ru = 'Профессиональный профиль',
            title_en = 'Professional Profile',
            text_ru  = 'Обнови свой профиль на любой профессиональной платформе (LinkedIn, hh.ru, портфолио-сайт): добавь последний проект, улучши описание или фото.',
            text_en  = 'Update your profile on any professional platform (LinkedIn, portfolio site): add your latest project, improve your description or photo.'
        WHERE title_ru = 'GitHub зелёный'
    """)


def downgrade() -> None:
    pass
