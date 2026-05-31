import logging
from aiogram import Router, F, types
from aiogram.types import Message, CallbackQuery
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from db.database import create_user, get_user, get_questions, save_result, get_professions, get_profession_details
from services.calculator import calculate_scores, calculate_riasec, match_professions
from services.pdf_generator import generate_pdf

router = Router()
logger = logging.getLogger(__name__)

class TestStates(StatesGroup):
    in_progress = State()
    finished = State()

WELCOME_TEXT = (
    "\n"
    "           <b>CAREERCHECK — ТЕСТ ПРОФПРИГОДНОСТИ</b>          \n"
    "                                                              \n"
    "  🧠 Основан на научной модели <b>Big Five + RIASEC</b>       \n"
    "  📋 60 вопросов • 5 черт личности • 6 типов профессий        \n"
    "  🏆 30 детальных профессий • Персонализированный разбор      \n"
    "\n\n"
    "<b>ЧТО МЫ ИЗМЕРЯЕМ</b>\n\n"
    "Вашу уникальную комбинацию из 5 фундаментальных черт личности, "
    "которые определяют — где вы будете счастливы, а где выгорите.\n\n"
    "• <b>Открытость опыту (O)</b> — креативность, любопытство, абстрактное мышление\n"
    "• <b>Добросовестность (C)</b> — организованность, дисциплина, надёжность\n"
    "• <b>Экстраверсия (E)</b> — энергия от людей, убеждение, лидерство\n"
    "• <b>Привязанность (A)</b> — эмпатия, гармония, забота о других\n"
    "• <b>Эмоц. стабильность (S)</b> — стрессоустойчивость, уверенность, спокойствие\n\n"
    "<b>🎯 ЧТО ВЫ ПОЛУЧИТЕ</b>\n\n"
    "Не просто «вам подходит менеджер».\n"
    "А детальный разбор: почему, насколько, что будет сложно, "
    "как прокачать, реальность профессии без прикрас.\n\n"
    "<b>🏆 30 ПРОФЕССИЙ — ОТ СЛЕСАРЯ ДО ПРЕДПРИНИМАТЕЛЯ</b>\n\n"
    "Мы не про IT. Мы про всех.\n"
    "Реалистичные. Исследователи. Артисты. Социальные. "
    "Предприимчивые. Конвенциональные.\n\n"
    "Каждый найдёт своё.\n\n"
    "⚡ <b>15 МИНУТ — И ВЫ ЗНАЕТЕ СЕБЯ ЛУЧШЕ, ЧЕМ 90% ЛЮДЕЙ</b>"
)

RIASEC_DESCRIPTIONS = {
    'R': (
        "🔧 <b>Реалистичный (Realistic)</b>\n\n"
        "Вы получаете удовольствие от работы руками, с техникой, с природой. "
        "Вам важен конкретный результат — увидеть, потрогать, починить.\n\n"
        "<b>Ваша суперсила:</b> делать то, что работает. Не обсуждать, а делать.\n"
        "<b>Ваша слепая зона:</b> абстрактные дискуссии, офисная политика, «визионерство».\n\n"
        "<b>Лучшие среды:</b> мастерские, кухни, поля, дороги, стройки\n"
        "<b>Худшие среды:</b> переговорные, лаборатории, open-space с брейнштормами"
    ),
    'I': (
        "🔬 <b>Исследовательский (Investigative)</b>\n\n"
        "Вам нужно понять, как устроен мир. Вы задаёте вопросы, которые другие не задают. "
        "Данные, паттерны, гипотезы — это ваш язык.\n\n"
        "<b>Ваша суперсила:</b> видеть связи там, где другие видят хаос.\n"
        "<b>Ваша слепая зона:</b> мелочи, рутина, эмоциональные драмы.\n\n"
        "<b>Лучшие среды:</b> лаборатории, R&D, аналитические центры, стартапы с deep tech\n"
        "<b>Худшие среды:</b> продажи, customer support, работа «по шаблону»"
    ),
    'A': (
        "🎨 <b>Артистический (Artistic)</b>\n\n"
        "Вы не терпите шаблонов. Ваша ценность — уникальность взгляда, стиля, подхода. "
        "Вы создаёте то, чего раньше не было.\n\n"
        "<b>Ваша суперсила:</b> видеть красоту и смысл там, где другие видят ничего.\n"
        "<b>Ваша слепая зона:</b> дедлайны, бюрократия, «сделай как у всех».\n\n"
        "<b>Лучшие среды:</b> студии, агентства, фриланс, сцена, галереи\n"
        "<b>Худшие среды:</b> банки, корпорации с жёсткими регламентами, конвейер"
    ),
    'S': (
        "🤝 <b>Социальный (Social)</b>\n\n"
        "Вы заряжаетесь от людей. Не просто «любите людей» — вы их понимаете, "
        "чувствуете, помогаете расти. Для вас важно — человек рядом стал лучше.\n\n"
        "<b>Ваша суперсила:</b> создавать доверие за минуты, а не месяцы.\n"
        "<b>Ваша слепая зона:</b> конфликты без разрешения, работа в изоляции, цифры ради цифр.\n\n"
        "<b>Лучшие среды:</b> школы, клиники, HR, коучинг, социальные проекты\n"
        "<b>Худшие среды:</b> одиночная работа, конкурирующие коллективы, «каждый сам за себя»"
    ),
    'E': (
        "💼 <b>Предприимчивый (Enterprising)</b>\n\n"
        "Вы получаете энергию от убеждения, переговоров, влияния. "
        "Вам скучно выполнять — вы хотите командовать, создавать, рисковать.\n\n"
        "<b>Ваша суперсила:</b> видеть возможности там, где другие видят проблемы.\n"
        "<b>Ваша слепая зона:</b> детали, рутина, долгосрочное планирование без быстрой отдачи.\n\n"
        "<b>Лучшие среды:</b> стартапы, продажи, политика, консалтинг, переговоры\n"
        "<b>Худшие среды:</b> библиотеки, лаборатории, одиночная работа, строгая иерархия"
    ),
    'C': (
        "📋 <b>Конвенциональный (Conventional)</b>\n\n"
        "Вы — опора. В мире хаоса вы создаёте порядок. "
        "Вам важна ясность: кто, что, когда, сколько. И чтобы всё было правильно.\n\n"
        "<b>Ваша суперсила:</b> делать сложное простым через системы и процессы.\n"
        "<b>Ваша слепая зона:</b> неопределённость, «придумай сам», постоянные изменения.\n\n"
        "<b>Лучшие среды:</b> бухгалтерия, администрация, аудит, логистика, госучреждения\n"
        "<b>Худшие среды:</b> стартапы без процессов, творческие хаосы, «каждый день новое»"
    )
}

def make_bar(value: int, max_val: int = 100, width: int = 10) -> str:
    filled = round(value / max_val * width)
    return '▓' * filled + '░' * (width - filled)

def get_trait_comment(trait: str, user_val: int, req_val: int) -> str:
    diff = user_val - req_val
    if abs(diff) <= 10:
        return "✅ Идеально"
    elif diff > 20:
        return "💪 Даже лучше, чем нужно"
    elif diff > 0:
        return "👍 Немного выше нормы"
    elif diff > -20:
        return "⚠️ Ниже оптимума, но не критично"
    else:
        return "🚨 Нужно прокачать"

@router.message(Command('start'))
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()
    try:
        user = await get_user(message.from_user.id)
        if not user:
            await create_user(message.from_user.id, message.from_user.username, message.from_user.full_name)
    except Exception as e:
        logger.error(f"DB: {e}")
    
    builder = InlineKeyboardBuilder()
    builder.button(text='🚀 Начать тест', callback_data='start_test')
    builder.button(text='📖 Подробнее о тесте', callback_data='about_test')
    builder.adjust(1)
    
    await message.answer(WELCOME_TEXT, reply_markup=builder.as_markup())

@router.callback_query(F.data == 'about_test')
async def about_test(callback: CallbackQuery):
    builder = InlineKeyboardBuilder()
    builder.button(text='🚀 Начать тест', callback_data='start_test')
    builder.button(text='🔙 Назад', callback_data='back_to_start')
    builder.adjust(1)
    
    about_text = (
        "<b>📚 КАК РАБОТАЕТ ТЕСТ</b>\n\n"
        "<b>Шаг 1:</b> 60 вопросов, шкала «категорически нет → полностью согласен»\n"
        "<b>Шаг 2:</b> Алгоритм рассчитывает 5 черт личности (Big Five)\n"
        "<b>Шаг 3:</b> Маппинг на 6 типов профессий (RIASEC)\n"
        "<b>Шаг 4:</b> Сопоставление с 30 реальными профессиями\n"
        "<b>Шаг 5:</b> Персонализированный разбор с рекомендациями\n\n"
        "<b>🔬 Научная база:</b>\n"
        "• Big Five — самая проверенная модель личности (тысячи исследований)\n"
        "• RIASEC — теория Джона Холланда, 50+ лет практики в карьерном консультировании\n"
        "• Совместимость рассчитывается через косинусное сходство + штрафы за критические провалы\n\n"
        "<b>⚠️ Важно:</b>\n"
        "• Нет «правильных» ответов — отвечайте честно\n"
        "• Результат — не приговор, а отправная точка\n"
        "• Черты меняются со временем, можно прокачивать\n\n"
        "<b>🎯 Что делать с результатом:</b>\n"
        "1. Изучите топ-3 профессии — детальный разбор\n"
        "2. Обратите внимание на зоны роста — конкретные шаги\n"
        "3. Поговорите с людьми из этих профессий — реальность vs ожидания\n"
        "4. Пройдите стажировку или волонтёрство — проверьте на практике"
    )
    
    await callback.message.edit_text(about_text, reply_markup=builder.as_markup())

@router.callback_query(F.data == 'back_to_start')
async def back_to_start(callback: CallbackQuery):
    builder = InlineKeyboardBuilder()
    builder.button(text='🚀 Начать тест', callback_data='start_test')
    builder.button(text='📖 Подробнее о тесте', callback_data='about_test')
    builder.adjust(1)
    await callback.message.edit_text(WELCOME_TEXT, reply_markup=builder.as_markup())

@router.callback_query(F.data == 'start_test')
async def start_test(callback: CallbackQuery, state: FSMContext):
    try:
        questions = await get_questions()
        if not questions:
            await callback.message.edit_text('❌ Вопросы не загружены.')
            return
        await state.set_state(TestStates.in_progress)
        await state.update_data(answers=[], current_question=0, questions=questions)
        await callback.message.edit_text('✅ Тест начался! Отвечайте честно — от этого зависит точность.')
        await send_question(callback.message, state)
    except Exception as e:
        logger.error(f"Start: {e}")
        await callback.message.edit_text('❌ Ошибка. /start')

async def send_question(message: Message, state: FSMContext):
    try:
        data = await state.get_data()
        questions = data.get('questions', [])
        current = data.get('current_question', 0)
        if current >= len(questions):
            await finish_test(message, state)
            return
        q = questions[current]
        progress = f'📊 {current + 1}/{len(questions)}'
        builder = InlineKeyboardBuilder()
        builder.button(text='❌ Нет', callback_data='score_1')
        builder.button(text='🤔 Скорее нет', callback_data='score_2')
        builder.button(text='✅ Скорее да', callback_data='score_4')
        builder.button(text='💯 Да', callback_data='score_5')
        builder.adjust(2, 2)
        await message.answer(
            f'{progress}\n\n📝 {q["question_text"]}\n\nВыбери:',
            reply_markup=builder.as_markup()
        )
    except Exception as e:
        logger.error(f"Send: {e}")
        await message.answer('❌ Ошибка. /cancel и /start')

@router.callback_query(F.data.startswith('score_'))
async def process_answer(callback: CallbackQuery, state: FSMContext):
    try:
        score = int(callback.data.split('_')[1])
        data = await state.get_data()
        questions = data.get('questions', [])
        current = data.get('current_question', 0)
        answers = data.get('answers', [])
        if current >= len(questions):
            return
        q = questions[current]
        answers.append({
            'question_id': q['id'],
            'trait': q['trait'],
            'is_inverted': q['is_inverted'],
            'score': score
        })
        await state.update_data(answers=answers, current_question=current + 1)
        pass  # message.delete() disabled
        await send_question(callback.message, state)
    except Exception as e:
        logger.error(f"Answer: {e}")
        await callback.message.answer('❌ Ошибка. /cancel')

async def finish_test(message: Message, state: FSMContext):
    try:
        data = await state.get_data()
        answers = data.get('answers', [])
        if len(answers) < 60:
            await message.answer(f'⚠️ Не завершён ({len(answers)}/60).')
            return
        
        raw, normalized = calculate_scores(answers)
        riasec = calculate_riasec(normalized)
        professions = await get_professions()
        top_professions = match_professions(normalized, riasec, professions)
        
        user = await get_user(message.from_user.id)
        if user:
            await save_result(user['id'], raw, normalized, riasec, top_professions)
        
        dom_riasec = max(riasec, key=riasec.get)
        riasec_desc = RIASEC_DESCRIPTIONS.get(dom_riasec, '')
        
        main_text = (
            f'🎉 <b>Тест завершён!</b>\n\n'
            f'{riasec_desc}\n\n'
            f'📊 <b>Ваш профиль (0-100):</b>\n'
            f'Открытость: {make_bar(normalized["O"])} {normalized["O"]}\n'
            f'Организованность: {make_bar(normalized["C"])} {normalized["C"]}\n'
            f'Коммуникация: {make_bar(normalized["E"])} {normalized["E"]}\n'
            f'Эмпатия: {make_bar(normalized["A"])} {normalized["A"]}\n'
            f'Стрессоустойчивость: {make_bar(normalized["S"])} {normalized["S"]}\n\n'
            f'🎯 <b>RIASEC:</b> R:{riasec["R"]} I:{riasec["I"]} A:{riasec["A"]} '
            f'S:{riasec["S"]} E:{riasec["E"]} C:{riasec["C"]}\n\n'
            f'<b>Сейчас покажу ваш топ-3 профессии с детальным разбором...</b>'
        )
        
        await message.answer(main_text)
        
        for i, prof in enumerate(top_professions[:3], 1):
            details = await get_profession_details(prof['title'])
            req = prof.get('required_traits', {})
            if isinstance(req, str):
                import json
                req = json.loads(req)
            
            prof_text = f'<b>🏆 {i}. {prof["title"]} — {prof["match"]}%</b>\n\n'
            
            prof_text += '<b>📌 Почему ВАМ подходит:</b>\n'
            reasons = []
            traits_map = {
                'O': ('Открытость', 'генерировать идеи', 'видеть нестандартное'),
                'C': ('Организованность', 'доводить до конца', 'создавать порядок'),
                'E': ('Коммуникация', 'убеждать и вести', 'строить отношения'),
                'A': ('Эмпатия', 'понимать людей', 'создавать гармонию'),
                'S': ('Спокойствие', 'держать удар', 'принимать решения в стрессе')
            }
            
            for trait, (name, strength, _) in traits_map.items():
                u_val = normalized[trait]
                r_val = req.get(trait, 50)
                if u_val >= r_val - 15:
                    if u_val >= r_val + 20:
                        reasons.append(f'• Ваша {name.lower()} ({u_val}) — суперсила. Вы {strength} лучше 80% коллег')
                    else:
                        reasons.append(f'• Ваша {name.lower()} ({u_val}) — на уровне. Это основа профессии')
                elif u_val >= r_val - 30:
                    reasons.append(f'• {name} ({u_val}) ниже оптимума ({r_val}), но компенсируется другими чертами')
            
            if not reasons:
                reasons.append('• У вас уникальный микс — редкая комбинация для этой сферы')
            
            prof_text += '\n'.join(reasons[:3]) + '\n\n'
            
            prof_text += '<b>📊 Совместимость по чертам:</b>\n'
            for trait, name in [('O','Открытость'),('C','Организованность'),('E','Коммуникация'),('A','Эмпатия'),('S','Стрессоустойчивость')]:
                u_val = normalized[trait]
                r_val = req.get(trait, 50)
                bar = make_bar(u_val, max_val=100, width=8)
                comment = get_trait_comment(trait, u_val, r_val)
                prof_text += f'{name}: {bar} {u_val}/{r_val} {comment}\n'
            
            prof_text += f'\n📈 <b>Перспективы:</b> {prof["growth"]}\n'
            
            if details:
                prof_text += f'\n<b>⚡ Реальность профессии:</b>\n{details.get("reality", "")}\n'
                
                pros = details.get('pros', [])
                if pros:
                    prof_text += f'\n<b>✅ Плюсы:</b>\n' + '\n'.join([f'• {p}' for p in pros[:3]]) + '\n'
                
                cons = details.get('cons', [])
                if cons:
                    prof_text += f'\n<b>❌ Минусы:</b>\n' + '\n'.join([f'• {c}' for c in cons[:3]]) + '\n'
            
            prof_text += '\n<b>🚨 Зоны роста:</b>\n'
            growth_areas = []
            for trait, name in [('O','креативности'),('C','дисциплины'),('E','коммуникации'),('A','эмпатии'),('S','стрессоустойчивости')]:
                u_val = normalized[trait]
                r_val = req.get(trait, 50)
                if u_val < r_val - 20:
                    growth_areas.append(f'• {name.capitalize()}: сейчас {u_val}, нужно {r_val}. Практикуйте ежедневно.')
            
            if not growth_areas:
                # Все черты близки к идеалу — даём совет по доминантному RIASEC
                dom = max(riasec, key=riasec.get)
                advice = {
                    'R': '• Развивайте практические навыки: мастер-классы, работа руками\n• Не забывайте про физическую форму — профессия требует выносливости',
                    'I': '• Углубляйтесь в специализацию: курсы, конференции, публикации\n• Ищите ментора в научной среде — это ускорит рост',
                    'A': '• Создавайте портфолио: проекты, выставки, публикации\n• Экспериментируйте с новыми техниками и стилями',
                    'S': '• Практикуйте активное слушание и эмпатию в повседневных разговорах\n• Пройдите волонтёрство — проверьте себя на практике',
                    'E': '• Начните с малого: продажи, переговоры, организация мероприятий\n• Читайте биографии успешных предпринимателей — учитесь на чужом опыте',
                    'C': '• Автоматизируйте рутину: изучите Excel/Python/CRM\n• Развивайте внимание к деталям через головоломки и аудит'
                }
                growth_areas.append(advice.get(dom, '• Развивайте уникальность — экспертиза в редкой комбинации навыков'))
            
            prof_text += '\n'.join(growth_areas[:2])
            
            await message.answer(prof_text)
        
        # Генерируем и отправляем PDF
        try:
            from datetime import datetime
            user_data = {
                'name': message.from_user.full_name or 'Пользователь',
                'date': datetime.now().strftime('%d.%m.%Y'),
                'telegram_id': message.from_user.id
            }
            
            details_list = []
            for p in top_professions[:3]:
                det = await get_profession_details(p['title'])
                details_list.append(det or {})
            
            pdf_path = generate_pdf(
                user_data=user_data,
                normalized_scores=normalized,
                riasec=riasec,
                top_professions=top_professions,
                details_list=details_list
            )
            
            await message.answer_document(
                document=types.FSInputFile(pdf_path),
                caption='📄 Ваш персональный отчет CAREERCHECK'
            )
            
            import os
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
                
        except Exception as e:
            logger.error(f"PDF generation error: {e}")
            import traceback
            logger.error(traceback.format_exc())

        builder = InlineKeyboardBuilder()
        builder.button(text='🔄 Пройти заново', callback_data='start_test')
        builder.button(text='📊 Мой профиль', callback_data='my_profile')
        builder.adjust(1)
        await message.answer('Хотите пройти ещё раз или посмотреть профиль?', reply_markup=builder.as_markup())
        await state.set_state(TestStates.finished)
        
    except Exception as e:
        logger.error(f"Finish: {e}")
        import traceback
        logger.error(traceback.format_exc())
        await message.answer('❌ Ошибка обработки. /cancel и /start')



@router.callback_query(F.data == 'my_profile')
async def my_profile(callback: CallbackQuery):
    """Показывает последний результат пользователя"""
    try:
        user = await get_user(callback.from_user.id)
        if not user or not user['test_completed']:
            await callback.message.answer('Вы еще не проходили тест. Нажмите /start')
            return
        
        # Получаем последний результат из БД
        import asyncpg
        from config.settings import DB_CONFIG
        conn = await asyncpg.connect(**DB_CONFIG)
        row = await conn.fetchrow(
            'SELECT * FROM test_results WHERE user_id = $1 ORDER BY completed_at DESC LIMIT 1',
            user['id']
        )
        await conn.close()
        
        if not row:
            await callback.message.answer('Результатов пока нет. Пройдите тест: /start')
            return
        
        # Формируем ответ
        scores = row['normalized_scores']
        profs = row['top_professions']
        
        text = f'📊 Ваш последний результат ({row["completed_at"].strftime("%d.%m.%Y")}):\n\n'
        text += f'Big Five: O:{scores["O"]} C:{scores["C"]} E:{scores["E"]} A:{scores["A"]} S:{scores["S"]}\n\n'
        text += '🏆 Топ-3 профессии:\n'
        for i, p in enumerate(profs[:3], 1):
            text += f'{i}. {p["title"]} — {p["match"]}%\n'
        
        await callback.message.answer(text)
        
    except Exception as e:
        logger.error(f"Profile error: {e}")
        await callback.message.answer('Ошибка загрузки профиля')

@router.message(Command('help'))
async def cmd_help(message: Message):
    await message.answer(
        '<b>📖 Команды:</b>\n'
        '/start — начать тест\n'
        '/help — помощь\n'
        '/cancel — отменить тест\n\n'
        '<b>О тесте:</b>\n'
        '60 вопросов, 15 минут, научная база Big Five + RIASEC.\n'
        '30 профессий с детальным разбором.\n\n'
        'Отвечайте честно — алгоритм уловит несоответствие.'
    )

@router.message(Command('cancel'))
async def cmd_cancel(message: Message, state: FSMContext):
    await state.clear()
    await message.answer('❌ Отменено. /start для начала.')
