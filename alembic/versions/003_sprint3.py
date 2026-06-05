"""Sprint 3: referrals, challenges, user_challenges tables.

Revision ID: 003
Revises: 002
Create Date: 2026-06-05
"""

from alembic import op

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # M3: реферальная программа
    op.execute("""
        CREATE TABLE IF NOT EXISTS referrals (
            id           SERIAL PRIMARY KEY,
            referrer_id  BIGINT NOT NULL,
            referred_id  BIGINT NOT NULL UNIQUE,
            bonus_granted BOOLEAN DEFAULT FALSE,
            created_at   TIMESTAMP DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id)")

    # N3: челленджи
    op.execute("""
        CREATE TABLE IF NOT EXISTS challenges (
            id           SERIAL PRIMARY KEY,
            trait_target VARCHAR(2) NOT NULL,
            riasec       VARCHAR(1),
            text_ru      TEXT NOT NULL,
            text_en      TEXT NOT NULL,
            difficulty   VARCHAR(10) DEFAULT 'easy'
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS user_challenges (
            user_telegram_id BIGINT PRIMARY KEY,
            subscribed       BOOLEAN DEFAULT TRUE,
            streak           INTEGER DEFAULT 0,
            last_sent_date   DATE,
            last_challenge_id INTEGER
        )
    """)

    # Seed 20 challenges
    challenges = [
        ('O','I',"Изучи незнакомую профессию. Запиши 3 навыка, которые тебя удивили",
                  "Research an unfamiliar career. Write down 3 skills that surprised you"),
        ('C','C',"Выпиши топ-5 задач на завтра прямо сейчас и оцени каждую по важности 1-5",
                  "Write down your top-5 tasks for tomorrow right now, rate each 1-5"),
        ('E','S',"Напиши одному своему контакту. Без повода — просто спроси как дела",
                  "Message one of your contacts. No reason — just ask how they're doing"),
        ('A','S',"Помоги коллеге или другу с чем-то сегодня. Маленькое дело считается",
                  "Help a colleague or friend with something today. Small things count"),
        ('S','R',"Найди 10 минут для тишины или медитации. Без телефона",
                  "Find 10 minutes for silence or meditation. No phone"),
        ('O','I',"Послушай подкаст об интересующей тебя профессии (30 мин)",
                  "Listen to a podcast about a career that interests you (30 min)"),
        ('C','E',"Изучи вакансию, которая тебя пугает. Подсчитай сколько требований уже закрыто",
                  "Look up a job posting that intimidates you. Count how many requirements you already meet"),
        ('O','A',"Посмотри TED Talk на любую тему. Запиши главную идею одним предложением",
                  "Watch a TED Talk on any topic. Write the main idea in one sentence"),
        ('C','R',"Сделай физическое действие, связанное с твоей целевой профессией, сегодня",
                  "Do one physical action related to your target profession today"),
        ('E','S',"Поговори с человеком из другой сферы. Узнай что им нравится в их работе",
                  "Talk to someone from a different field. Learn what they enjoy about their work"),
        ('O','I',"Прочитай одну статью в Википедии по теме, которая тебя давно интересует",
                  "Read one Wikipedia article on a topic that has long interested you"),
        ('C','C',"Разбери почту/мессенджер: ответь на все ждущие сообщения",
                  "Clear your inbox: reply to all pending messages"),
        ('E','E',"Публично выскажи мнение: в рабочем чате, соцсети или на встрече",
                  "Share your opinion publicly: in a work chat, social media, or meeting"),
        ('A','S',"Сделай кому-то искренний комплимент сегодня",
                  "Give someone a sincere compliment today"),
        ('S','R',"Ляг спать на 30 минут раньше обычного. Качество сна = качество карьеры",
                  "Go to bed 30 minutes earlier than usual. Sleep quality = career quality"),
        ('O','A',"Нарисуй или запиши свою идеальную карьеру через 10 лет (5 мин)",
                  "Draw or write your ideal career in 10 years (5 min)"),
        ('C','I',"Найди 1 онлайн-курс по навыку, который поможет в твоей целевой профессии",
                  "Find 1 online course for a skill that will help in your target profession"),
        ('E','E',"Предложи коллеге или другу совместный проект или активность",
                  "Propose a joint project or activity to a colleague or friend"),
        ('A','A',"Сделай что-то творческое: нарисуй, напиши, сфотографируй — что угодно",
                  "Do something creative: draw, write, photograph — anything"),
        ('S','S',"Запиши 3 вещи, за которые ты благодарен сегодня. Карьерная устойчивость = эмоциональная",
                  "Write 3 things you are grateful for today. Career resilience = emotional resilience"),
    ]

    for (trait, riasec, text_ru, text_en) in challenges:
        op.execute(
            f"INSERT INTO challenges (trait_target, riasec, text_ru, text_en) "
            f"VALUES ('{trait}', '{riasec}', $${text_ru}$$, $${text_en}$$)"
        )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS user_challenges CASCADE")
    op.execute("DROP TABLE IF EXISTS challenges CASCADE")
    op.execute("DROP TABLE IF EXISTS referrals CASCADE")
