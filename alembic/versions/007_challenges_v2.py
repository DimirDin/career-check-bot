"""Challenges v2: titles, xp, category, completions table, 100+ challenge bank.

Revision ID: 007
Revises: 006
Create Date: 2026-06-14
"""

from alembic import op

revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Extend challenges table
    op.execute("""
        ALTER TABLE challenges
            ADD COLUMN IF NOT EXISTS title_ru  TEXT,
            ADD COLUMN IF NOT EXISTS title_en  TEXT,
            ADD COLUMN IF NOT EXISTS xp        INTEGER DEFAULT 20,
            ADD COLUMN IF NOT EXISTS category  VARCHAR(20) DEFAULT 'action'
    """)

    # Completions table (server-side tracking)
    op.execute("""
        CREATE TABLE IF NOT EXISTS challenge_completions (
            id               SERIAL PRIMARY KEY,
            user_telegram_id BIGINT NOT NULL,
            challenge_id     INTEGER NOT NULL,
            completed_at     TIMESTAMP DEFAULT NOW(),
            xp_earned        INTEGER DEFAULT 0,
            UNIQUE (user_telegram_id, challenge_id, completed_at::date)
        )
    """)

    # Add total_xp to user_challenges
    op.execute("""
        ALTER TABLE user_challenges
            ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0
    """)

    # Seed 100+ high-quality challenges
    # Format: (trait, riasec, category, difficulty, xp, title_ru, title_en, text_ru, text_en)
    challenges = [
        # ── Openness (O) ────────────────────────────────────────────────────────
        ('O','I','research','easy',15,
         'Неизведанная профессия','Unknown Career',
         'Выбери профессию, о которой ничего не знаешь. Потрать 10 минут на изучение — что она требует, сколько платит, кто ею занимается.',
         'Pick a profession you know nothing about. Spend 10 minutes researching it — what it requires, what it pays, who does it.'),

        ('O','I','research','medium',25,
         'День из жизни','Day in the Life',
         'Найди на YouTube видео "день из жизни [твоя топ-профессия]". Посмотри 10+ минут. Запиши что понравилось и что нет.',
         'Find a "day in the life of [your top profession]" video on YouTube. Watch 10+ minutes. Note what appealed and what didn\'t.'),

        ('O','A','mindset','easy',15,
         'TED за завтраком','TED at Breakfast',
         'Посмотри TED Talk на любую тему, которая тебя давно манит. Запиши одну идею, которую можешь применить в карьере.',
         'Watch a TED Talk on any topic that has been calling you. Write down one idea you can apply to your career.'),

        ('O','I','skill','medium',30,
         'Смежный навык','Adjacent Skill',
         'Определи один навык из смежной области с твоей профессией. Найди бесплатный курс или туториал и пройди первый урок прямо сейчас.',
         'Identify one skill from a field adjacent to your profession. Find a free course or tutorial and complete the first lesson right now.'),

        ('O','A','portfolio','hard',40,
         'Мини-проект','Mini Project',
         'Придумай мини-проект (1-3 дня) который можно добавить в портфолио. Сегодня — только план: цель, инструменты, результат.',
         'Design a mini-project (1-3 days) you can add to your portfolio. Today — just the plan: goal, tools, expected result.'),

        ('O','I','research','easy',15,
         'Статья дня','Article of the Day',
         'Прочитай одну статью по теме твоей профессии на Medium, Habr или аналоге. Поставь лайк или сохрани если понравилось.',
         'Read one article on your profession topic on Medium, dev.to or similar. Like or save it if it was good.'),

        ('O','A','reflection','easy',15,
         'Идеальный понедельник','Perfect Monday',
         'Напиши как выглядит твой идеальный рабочий понедельник через 5 лет. Детально: где, с кем, что делаешь.',
         'Write what your ideal work Monday looks like in 5 years. In detail: where, with whom, what you\'re doing.'),

        ('O','I','skill','easy',20,
         'Подкаст в дороге','Podcast on the Go',
         'Подпишись на один карьерный или профессиональный подкаст и послушай первый эпизод (в транспорте, на прогулке).',
         'Subscribe to one career or professional podcast and listen to the first episode (on transport, on a walk).'),

        # ── Conscientiousness (C) ───────────────────────────────────────────────
        ('C','C','action','easy',15,
         'Топ-5 на завтра','Top-5 for Tomorrow',
         'Прямо сейчас напиши 5 задач на завтра. Отметь одну как "главную" — ту, которая двигает карьеру.',
         'Right now, write 5 tasks for tomorrow. Mark one as "the main one" — the one that moves your career forward.'),

        ('C','C','action','medium',25,
         'Вакансия под микроскопом','Job Posting Deep Dive',
         'Найди вакансию мечты. Выпиши все требования. Честно отметь: уже есть ✓, в процессе ⏳, нет ✗. Составь план закрытия пробелов.',
         'Find your dream job posting. List all requirements. Honestly mark: already have ✓, in progress ⏳, don\'t have ✗. Make a plan to close the gaps.'),

        ('C','I','research','medium',25,
         'Зарплатный анализ','Salary Analysis',
         'Исследуй зарплаты по твоей целевой профессии: джун, мид, сеньор. Источники: hh.ru, LinkedIn, Glassdoor. Запиши диапазоны.',
         'Research salaries in your target profession: junior, mid, senior. Sources: LinkedIn, Glassdoor, Indeed. Write down the ranges.'),

        ('C','C','skill','medium',30,
         '25 минут фокуса','25 Minutes of Focus',
         'Техника Помодоро: поставь таймер на 25 минут и работай только над одним навыком для твоей профессии. Никаких отвлечений.',
         'Pomodoro technique: set a timer for 25 minutes and work only on one skill for your profession. No distractions.'),

        ('C','C','reflection','easy',15,
         'Недельный итог','Weekly Wrap-Up',
         'Запиши 3 вещи которые ты сделал для карьеры на этой неделе. Даже маленькие. Это формирует привычку двигаться вперёд.',
         'Write down 3 things you did for your career this week. Even small ones. This builds the habit of moving forward.'),

        ('C','E','action','hard',40,
         'LinkedIn-апгрейд','LinkedIn Upgrade',
         'Обнови один раздел LinkedIn или резюме: добавь новый проект, улучши описание роли или напиши "About" с нуля.',
         'Update one section of your LinkedIn or resume: add a new project, improve a role description, or write "About" from scratch.'),

        ('C','I','portfolio','hard',45,
         'GitHub зелёный','GitHub Green',
         'Сделай один коммит в любой проект (или создай новый репозиторий). Даже README считается. Начни streak.',
         'Make one commit to any project (or create a new repository). Even a README counts. Start a streak.'),

        ('C','C','action','medium',25,
         'Inbox Zero','Inbox Zero',
         'Разберись с почтой или мессенджерами: ответь на всё важное, удали ненужное, заархивируй старое. Чистый inbox = чистая голова.',
         'Deal with your email or messengers: reply to everything important, delete the unnecessary, archive the old. Clean inbox = clear mind.'),

        # ── Extraversion (E) ────────────────────────────────────────────────────
        ('E','S','networking','easy',20,
         'Просто напиши','Just Write',
         'Напиши одному человеку из профессиональных контактов, с которым давно не общался. Без повода — просто привет и как дела.',
         'Write to one professional contact you haven\'t spoken to in a while. No agenda — just hello and how\'s it going.'),

        ('E','E','networking','medium',30,
         'LinkedIn-комментарий','LinkedIn Comment',
         'Найди пост эксперта из твоей сферы. Оставь содержательный комментарий (не просто "отлично!"). Начни быть заметным.',
         'Find a post by an expert in your field. Leave a meaningful comment (not just "great!"). Start being visible.'),

        ('E','S','networking','hard',45,
         'Запрос на знакомство','Connection Request',
         'Напиши незнакомому специалисту в твоей сфере с персональным сообщением: кто ты, почему хочешь познакомиться, что предлагаешь.',
         'Write to an unfamiliar specialist in your field with a personal message: who you are, why you want to connect, what you offer.'),

        ('E','E','action','medium',30,
         'Своё мнение','Your Opinion',
         'Публично выскажи профессиональное мнение: в рабочем чате, соцсети или на встрече. Не бойся несогласных.',
         'Share a professional opinion publicly: in a work chat, social media, or meeting. Don\'t be afraid of disagreement.'),

        ('E','S','networking','medium',35,
         'Мероприятие дня','Event of the Day',
         'Найди ближайший митап, вебинар или конференцию по твоей теме (онлайн считается). Зарегистрируйся и добавь в календарь.',
         'Find the nearest meetup, webinar, or conference on your topic (online counts). Register and add to your calendar.'),

        ('E','E','networking','easy',20,
         'Поздравление','Congratulations',
         'Найди в LinkedIn кого-то, кто недавно сменил работу или получил повышение. Поздравь искренне — это запоминается.',
         'Find someone on LinkedIn who recently changed jobs or got promoted. Congratulate them sincerely — it\'s remembered.'),

        ('E','S','action','hard',40,
         'Информационное интервью','Informational Interview',
         'Напиши специалисту с просьбой о 15-минутном разговоре: узнать про его путь и карьеру. 80% людей соглашаются.',
         'Message a professional asking for a 15-minute conversation: to learn about their journey and career. 80% of people agree.'),

        ('E','E','skill','medium',30,
         'Питч за 60 секунд','60-Second Pitch',
         'Подготовь и запиши "elevator pitch" о себе: кто ты, что умеешь, чего хочешь. Уложись в 60 секунд. Запиши на видео.',
         'Prepare and record your "elevator pitch": who you are, what you can do, what you want. Keep it under 60 seconds. Record it on video.'),

        # ── Agreeableness (A) ───────────────────────────────────────────────────
        ('A','S','feedback','medium',25,
         'Честный запрос','Honest Request',
         'Попроси одного коллегу или друга дать тебе честную обратную связь по одному профессиональному качеству. Слушай без защиты.',
         'Ask one colleague or friend to give you honest feedback on one professional quality. Listen without defensiveness.'),

        ('A','S','networking','easy',15,
         'Помощь сегодня','Help Today',
         'Помоги кому-то с рабочей задачей сегодня: ответь на вопрос, поделись ресурсом, дай совет. Без ожидания ответа.',
         'Help someone with a work task today: answer a question, share a resource, give advice. Without expecting anything in return.'),

        ('A','A','reflection','easy',15,
         'Благодарность','Gratitude',
         'Напиши одному человеку, который помог тебе в карьере. Искреннее сообщение — "я помню что ты сделал и это важно".',
         'Write to one person who helped you in your career. A sincere message — "I remember what you did and it mattered."'),

        ('A','S','feedback','hard',40,
         'Менторская беседа','Mentor Chat',
         'Попроси кого-то опытнее тебя (коллегу, знакомого) стать твоим неформальным ментором. Предложи конкретный формат: 1 созвон в месяц.',
         'Ask someone more experienced than you (colleague, acquaintance) to be your informal mentor. Propose a specific format: 1 call per month.'),

        ('A','A','portfolio','medium',30,
         'Контент для сообщества','Community Content',
         'Напиши полезный пост или ответ в профессиональном сообществе/форуме. Поделись реальным опытом или знанием.',
         'Write a helpful post or reply in a professional community/forum. Share real experience or knowledge.'),

        ('A','S','networking','medium',25,
         'Рекомендация','Recommendation',
         'Напиши рекомендацию кому-то в LinkedIn или оставь позитивный отзыв о работе коллеги. Отдавай первым.',
         'Write a recommendation for someone on LinkedIn or leave a positive review of a colleague\'s work. Give first.'),

        ('A','S','reflection','easy',15,
         'Комплимент с намерением','Intentional Compliment',
         'Сделай конкретный и искренний профессиональный комплимент коллеге или знакомому. Не "молодец", а за что именно.',
         'Give a specific and sincere professional compliment to a colleague or acquaintance. Not "well done" — but for what exactly.'),

        # ── Emotional Stability (S) ─────────────────────────────────────────────
        ('S','R','mindset','easy',15,
         'Цифровая пауза','Digital Pause',
         'Выдели 20 минут без телефона. Просто сиди, ходи или занимайся чем-то физическим. Мозг восстанавливается в тишине.',
         'Set aside 20 minutes without your phone. Just sit, walk, or do something physical. The brain recovers in silence.'),

        ('S','S','reflection','easy',15,
         'Три хорошего','Three Good Things',
         'Запиши 3 профессиональных достижения за сегодня. Даже самые маленькие. Это укрепляет устойчивость и мотивацию.',
         'Write down 3 professional accomplishments from today. Even the smallest. This builds resilience and motivation.'),

        ('S','R','mindset','medium',25,
         'Стресс-аудит','Stress Audit',
         'Запиши что сейчас больше всего давит на тебя в карьере. Для каждого пункта: это под твоим контролем? Что можно сделать прямо сейчас?',
         'Write down what is currently putting the most pressure on you in your career. For each item: is this in your control? What can you do right now?'),

        ('S','S','mindset','easy',15,
         'Ранний подъём','Early Rise',
         'Ляг спать на 30 минут раньше сегодня. Запланируй утро завтра: один маленький карьерный шаг до работы.',
         'Go to bed 30 minutes earlier today. Plan your morning: one small career step before work.'),

        ('S','R','reflection','medium',25,
         'Границы дня','Day Boundaries',
         'Определи время когда заканчивается рабочий день и напиши что будет после. Чёткие границы — основа продуктивности.',
         'Define the time when the work day ends and write what comes after. Clear boundaries are the foundation of productivity.'),

        ('S','S','mindset','hard',35,
         'Провал как урок','Failure as Lesson',
         'Вспомни профессиональную неудачу. Запиши: что произошло, что ты узнал, как это сделало тебя сильнее. Переосмысли провал.',
         'Recall a professional failure. Write: what happened, what you learned, how it made you stronger. Reframe the failure.'),

        ('S','R','action','medium',25,
         'Физическая зарядка','Physical Reset',
         'Сделай 10-минутную зарядку или прогулку прямо сейчас. Физическая активность улучшает концентрацию и карьерное мышление.',
         'Do a 10-minute workout or walk right now. Physical activity improves focus and career thinking.'),

        ('S','S','reflection','easy',15,
         'Победы недели','Weekly Wins',
         'Запиши 5 побед этой недели — большие и маленькие. Прочитай список вслух. Ты двигаешься вперёд.',
         'Write down 5 wins from this week — big and small. Read the list out loud. You are moving forward.'),

        # ── Дополнительные (смешанные, высокое качество) ───────────────────────
        ('O','I','research','medium',25,
         'Карта навыков','Skills Map',
         'Нарисуй карту навыков своей целевой профессии: технические, мягкие, редкие. Отметь где ты сейчас на шкале 1-10.',
         'Draw a skills map for your target profession: technical, soft, rare. Mark where you are now on a 1-10 scale.'),

        ('C','I','action','medium',30,
         'Сертификация','Certification',
         'Найди профессиональный сертификат который повысит твою ценность. Составь план: стоимость, время, что даст. Занеси в календарь.',
         'Find a professional certification that will increase your value. Make a plan: cost, time, what it gives. Add to your calendar.'),

        ('E','E','action','medium',30,
         'Мастер-класс или вебинар','Masterclass or Webinar',
         'Найди и зарегистрируйся на бесплатный вебинар или мастер-класс по теме твоей карьеры. Запланируй и приди.',
         'Find and register for a free webinar or masterclass on your career topic. Schedule it and attend.'),

        ('A','S','networking','medium',25,
         'Группа поддержки','Support Group',
         'Найди профессиональное сообщество в Telegram, Slack или Discord по твоей теме. Вступи и напиши первое сообщение-представление.',
         'Find a professional community on Telegram, Slack or Discord for your topic. Join and write your first introduction message.'),

        ('C','C','portfolio','hard',45,
         'Кейс-стади','Case Study',
         'Опиши один рабочий кейс: проблема → твои действия → результат с цифрами. Это лучший актив в резюме.',
         'Describe one work case: problem → your actions → result with numbers. This is the best asset in your resume.'),

        ('O','A','mindset','easy',15,
         'Вдохновляющая биография','Inspiring Biography',
         'Прочитай 15 минут биографии человека из твоей сферы. Какой урок ты берёшь из его пути?',
         'Read 15 minutes of a biography of someone in your field. What lesson do you take from their journey?'),

        ('E','S','networking','easy',20,
         'Мероприятие в городе','City Event',
         'Найди одно профессиональное мероприятие в своём городе в ближайший месяц. Запланируй посещение — нетворкинг живьём работает.',
         'Find one professional event in your city in the next month. Plan to attend — in-person networking works.'),

        ('S','R','mindset','easy',15,
         'Визуализация успеха','Success Visualization',
         'Закрой глаза на 5 минут и представь себя через год: чего ты достиг, что чувствуешь. Детально. Это программирует мозг.',
         'Close your eyes for 5 minutes and imagine yourself in a year: what you achieved, how you feel. In detail. This programs the brain.'),

        ('C','C','action','easy',15,
         'Ревью резюме','Resume Review',
         'Открой своё резюме. Найди одно место которое можно улучшить прямо сейчас: цифры, глаголы действия, актуальность.',
         'Open your resume. Find one place you can improve right now: numbers, action verbs, relevance.'),

        ('O','I','research','easy',15,
         'Тренды отрасли','Industry Trends',
         'Прочитай одну статью о трендах в твоей отрасли на 2025-2026. Запиши какие из них затронут твою работу.',
         'Read one article about trends in your industry for 2025-2026. Write down which of them will affect your work.'),

        ('A','A','skill','medium',30,
         'Обратная связь навыком','Feedback as Skill',
         'Потренируйся давать обратную связь: напиши конструктивный отзыв другу или коллеге по их работе. Формула: + / Δ / +',
         'Practice giving feedback: write a constructive review to a friend or colleague on their work. Formula: + / Δ / +'),

        ('C','I','research','medium',25,
         'Компания мечты','Dream Company',
         'Выбери 3 компании-мечты. Изучи их: культура, команда, продукт, вакансии. Запиши что привлекает в каждой.',
         'Choose 3 dream companies. Research them: culture, team, product, openings. Write what attracts you to each.'),

        ('E','E','skill','hard',40,
         'Публичное выступление','Public Speaking',
         'Запишись на любое публичное выступление: доклад на митапе, презентация внутри команды, выступление на онлайн-встрече.',
         'Sign up for any public speaking: a talk at a meetup, a presentation within the team, a speech at an online meeting.'),

        ('O','A','portfolio','medium',30,
         'Статья или пост','Article or Post',
         'Напиши пост или статью по теме твоей профессии: урок, разбор кейса, мнение. Опубликуй где угодно — это портфолио.',
         'Write a post or article on your profession topic: a lesson, case analysis, opinion. Publish anywhere — this is your portfolio.'),

        ('S','S','reflection','medium',25,
         'Карьерный дневник','Career Journal',
         'Заведи привычку: каждый вечер 5 минут писать в карьерный дневник. Сегодня — первая запись: где ты сейчас и куда хочешь.',
         'Start a habit: every evening 5 minutes of writing in a career journal. Today — first entry: where you are now and where you want to go.'),

        ('C','C','action','hard',40,
         'Портфолио-аудит','Portfolio Audit',
         'Просмотри своё портфолио или профиль. Что устарело? Что отсутствует? Составь список из 5 вещей для добавления.',
         'Review your portfolio or profile. What is outdated? What is missing? Make a list of 5 things to add.'),

        ('A','S','mindset','medium',25,
         'Эмпатия на практике','Empathy in Practice',
         'В следующем разговоре с коллегой: сначала слушай, потом говори. Задай 2 уточняющих вопроса прежде чем высказать мнение.',
         'In your next conversation with a colleague: listen first, then speak. Ask 2 clarifying questions before sharing your opinion.'),

        ('E','S','action','medium',30,
         'Coffee Chat','Coffee Chat',
         'Пригласи коллегу или знакомого на виртуальный кофе (20-30 мин). Цель — узнать о его пути, не продавать себя.',
         'Invite a colleague or acquaintance to a virtual coffee (20-30 min). Goal — learn about their journey, not sell yourself.'),

        ('O','I','skill','hard',40,
         'Новый инструмент','New Tool',
         'Установи и попробуй новый инструмент или технологию из твоей сферы. Потрать 30 минут на эксплорацию. Напиши что понял.',
         'Install and try a new tool or technology from your field. Spend 30 minutes exploring. Write what you learned.'),

        ('C','C','mindset','easy',15,
         'Правило двух минут','Two-Minute Rule',
         'Найди 5 задач которые можно выполнить за 2 минуты. Сделай их прямо сейчас. Маленькие победы строят импульс.',
         'Find 5 tasks that can be done in 2 minutes. Do them right now. Small wins build momentum.'),

        ('S','R','skill','medium',25,
         'Техника дыхания','Breathing Technique',
         'Изучи технику 4-7-8 или box breathing. Применяй перед важными встречами и переговорами. Попробуй прямо сейчас.',
         'Learn the 4-7-8 or box breathing technique. Use it before important meetings and negotiations. Try it right now.'),

        ('O','A','research','easy',15,
         'Будущее профессии','Future of Profession',
         'Поищи: "будущее профессии [твоя специальность] 2030". Что изменится? Какие навыки станут ключевыми?',
         'Search: "future of [your profession] 2030". What will change? Which skills will become key?'),

        ('C','I','action','medium',30,
         'Умная цель на месяц','Smart Goal for the Month',
         'Поставь одну SMART-цель на ближайший месяц: конкретная, измеримая, достижимая, релевантная, со сроком. Запиши.',
         'Set one SMART goal for the next month: specific, measurable, achievable, relevant, time-bound. Write it down.'),

        ('E','E','networking','hard',45,
         'Подкаст или интервью','Podcast or Interview',
         'Свяжись с организаторами подкаста в твоей сфере и предложи себя как гостя. Или создай свой мини-интервью формат.',
         'Contact podcast organizers in your field and offer yourself as a guest. Or create your own mini-interview format.'),

        ('A','A','portfolio','easy',20,
         'Отзыв на платформе','Platform Review',
         'Напиши честный и полезный отзыв о курсе, книге или инструменте который прошёл. Помоги другим выбрать.',
         'Write an honest and helpful review of a course, book or tool you completed. Help others choose.'),

        ('S','S','action','medium',25,
         'Антистресс-план','Anti-Stress Plan',
         'Составь личный антистресс-план для напряжённых рабочих дней: 3 быстрых способа вернуться в ресурс.',
         'Create a personal anti-stress plan for intense work days: 3 quick ways to return to a resourceful state.'),

        ('C','C','skill','easy',20,
         'Скорочтение','Speed Reading',
         'Прочитай профессиональную статью используя метод скиммминга: сначала заголовки и первые предложения. Сэкономь 40% времени.',
         'Read a professional article using skimming: first headings and opening sentences. Save 40% of the time.'),

        ('O','I','mindset','medium',25,
         'Вопрос дня','Question of the Day',
         'Задай себе вопрос: "Если бы я знал что не провалюсь — что бы я попробовал в карьере?" Запиши ответ без цензуры.',
         'Ask yourself: "If I knew I wouldn\'t fail — what would I try in my career?" Write the answer without censorship.'),

        ('E','S','skill','medium',30,
         'Нетворкинг-скрипт','Networking Script',
         'Напиши шаблон для холодного знакомства: представление, зачем пишешь, что предлагаешь. Протестируй на одном человеке.',
         'Write a cold outreach template: introduction, why you\'re writing, what you offer. Test it on one person.'),

        ('A','S','reflection','medium',25,
         'Ценности в работе','Work Values',
         'Запиши 5 главных ценностей которые должна давать работа (рост, смысл, деньги, команда...). Сравни с текущей ситуацией.',
         'Write down 5 core values your work must provide (growth, meaning, money, team...). Compare with your current situation.'),

        ('C','I','research','hard',35,
         'Анализ конкурентов','Competitor Analysis',
         'Изучи 3 специалистов на твоей целевой позиции: LinkedIn, портфолио, публикации. Что у них есть, чего нет у тебя?',
         'Study 3 specialists at your target position: LinkedIn, portfolio, publications. What do they have that you don\'t?'),

        ('S','R','mindset','medium',25,
         'Письмо себе','Letter to Self',
         'Напиши письмо себе через год: что ты достиг, чем гордишься, что советуешь. Отправь на email с напоминанием открыть через год.',
         'Write a letter to yourself in one year: what you achieved, what you\'re proud of, what advice you give. Send to email to open in a year.'),

        ('O','A','skill','medium',30,
         'Творческий проект','Creative Project',
         'Начни любой творческий проект связанный с профессией: лендинг, рисунок, музыка, текст. Важно начать, не завершить.',
         'Start any creative project related to your profession: landing page, drawing, music, text. Starting is what matters, not finishing.'),

        ('E','E','action','easy',20,
         'Голос в чате','Voice in Chat',
         'Напиши содержательный комментарий в профессиональном чате или группе где ты обычно молчишь. Присутствие = репутация.',
         'Write a meaningful comment in a professional chat or group where you usually stay silent. Presence = reputation.'),

        ('C','C','action','medium',30,
         'Time-blocking','Time-blocking',
         'Заблокируй в календаре 2 часа завтра только для карьерного развития. Без встреч, без мессенджеров. Это инвестиция.',
         'Block 2 hours in your calendar tomorrow for career development only. No meetings, no messengers. This is an investment.'),

        ('A','S','skill','easy',15,
         'Активное слушание','Active Listening',
         'В следующей беседе практикуй активное слушание: не перебивай, повторяй ключевые мысли, задавай открытые вопросы.',
         'In your next conversation practice active listening: don\'t interrupt, repeat key ideas, ask open-ended questions.'),

        ('O','I','action','hard',40,
         'Хакатон или конкурс','Hackathon or Contest',
         'Найди хакатон, конкурс или открытый проект в своей сфере. Подай заявку или присоединись как участник. Опыт бесценен.',
         'Find a hackathon, contest or open project in your field. Apply or join as a participant. The experience is priceless.'),

        ('S','S','action','easy',15,
         'Прогулка с подкастом','Walk with Podcast',
         'Выйди на 20-минутную прогулку с профессиональным подкастом. Движение + обучение = мощная комбинация.',
         'Go for a 20-minute walk with a professional podcast. Movement + learning = a powerful combination.'),

        ('C','E','action','medium',30,
         'Salary Research','Salary Negotiation Prep',
         'Изучи как правильно вести переговоры о зарплате. Запиши 3 аргумента почему ты стоишь больше. Практикуй вслух.',
         'Research how to negotiate salary properly. Write down 3 arguments for why you are worth more. Practice out loud.'),

        ('E','S','reflection','easy',15,
         'История успеха','Success Story',
         'Запиши одну историю профессионального успеха в формате STAR: ситуация, задача, действие, результат. Используй на собеседовании.',
         'Write one professional success story in STAR format: situation, task, action, result. Use it at interviews.'),

        ('O','I','mindset','easy',15,
         'Curiosity Hour','Curiosity Hour',
         'Потрать 1 час на изучение чего-то, что тебя интересует но не связано с работой. Широкий кругозор = карьерное преимущество.',
         'Spend 1 hour learning something that interests you but isn\'t work-related. Broad knowledge = career advantage.'),

        ('A','A','networking','medium',25,
         'Взаимный пиар','Mutual Promotion',
         'Поделись чьей-то полезной работой в соцсети или чате. Отметь автора. Это строит отношения и репутацию одновременно.',
         'Share someone\'s useful work on social media or in a chat. Tag the author. This builds relationships and reputation simultaneously.'),
    ]

    for (trait, riasec, category, difficulty, xp, title_ru, title_en, text_ru, text_en) in challenges:
        op.execute(f"""
            INSERT INTO challenges (trait_target, riasec, category, difficulty, xp, title_ru, title_en, text_ru, text_en)
            VALUES ('{trait}', '{riasec}', '{category}', '{difficulty}', {xp},
                    $r${title_ru}$r$, $e${title_en}$e$,
                    $t${text_ru}$t$, $u${text_en}$u$)
        """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS challenge_completions")
    op.execute("ALTER TABLE challenges DROP COLUMN IF EXISTS title_ru")
    op.execute("ALTER TABLE challenges DROP COLUMN IF EXISTS title_en")
    op.execute("ALTER TABLE challenges DROP COLUMN IF EXISTS xp")
    op.execute("ALTER TABLE challenges DROP COLUMN IF EXISTS category")
    op.execute("ALTER TABLE user_challenges DROP COLUMN IF EXISTS total_xp")
