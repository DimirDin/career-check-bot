# CareerCheck — Полный технический контекст проекта
> **Версия:** 2.1 · **Дата обновления:** 2026-06-05  
> Этот файл — единый источник правды для нового AI-чата. Описывает всё: архитектуру, код, деплой, БД, баги, планы.

---

## 1. ЧТО ЭТО

**CareerCheck** — Telegram Mini App + Telegram Bot для карьерного психологического тестирования.

### Продукт
- **60 вопросов** по научной модели **Big Five / OCEAN** (5 черт личности)
- Пользователь получает: профиль личности, топ-5 профессий, RIASEC-тип
- **Бесплатно**: результаты теста, карточка для шаринга
- **Платно (99 Telegram Stars ≈ $1)**: Premium PDF — 6 страниц с персональным AI-анализом через Claude Sonnet

### Два входа в продукт
1. **Telegram Bot** `@CareerCheck_Bot` — классический чат-бот, тест через сообщения
2. **Telegram Mini App** `https://careercheck.app` — React SPA внутри Telegram WebApp

---

## 2. СТЕК ТЕХНОЛОГИЙ

### Backend (Python)
| Библиотека | Версия | Назначение |
|---|---|---|
| aiogram | >=3.4.0 | Telegram Bot Framework (asyncio) |
| asyncpg | >=0.29.0 | Async PostgreSQL драйвер |
| FastAPI | >=0.111.0 | REST API для Mini App |
| uvicorn[standard] | >=0.30.0 | ASGI сервер |
| httpx | >=0.27.0 | HTTP-клиент (Anthropic API) |
| anthropic | >=0.35.0 | Claude API SDK |
| reportlab | >=4.0.0 | Генерация PDF |
| matplotlib | >=3.8.0 | Графики в PDF |
| numpy | >=1.26.0 | Математика для матчинга профессий |
| pypdf | >=4.0.0 | Работа с PDF |
| redis | >=5.0.0 | Redis клиент (готов, не активен) |
| python-dotenv | >=1.0.0 | Загрузка .env |

### Frontend (JavaScript/React)
| Технология | Версия | Назначение |
|---|---|---|
| React | ^18.3.1 | UI фреймворк |
| Vite | ^5.4.1 | Сборщик |
| Telegram WebApp JS API | — | Интеграция с Telegram |
| CSS Modules | — | Стили для MenuPage |
| Обычный CSS | — | Стили остальных страниц |

> **Важно**: НЕТ react-router-dom, styled-components, Tailwind, Framer Motion. Навигация через собственный NavigationContext.

### База данных
- **PostgreSQL 16** — основная БД
- **Redis 7** — есть в docker-compose, Python-клиент установлен, но в коде пока не используется (готов для rate limiting при масштабировании)

### Инфраструктура
- **VPS**: `31.76.18.54`, Ubuntu 22.04 LTS, 2GB RAM, 30GB SSD
- **Docker + Docker Compose** — все сервисы в контейнерах
- **nginx** — reverse proxy, SSL termination
- **Certbot / Let's Encrypt** — SSL сертификат (auto-renew)
- **Watchtower** — автообновление Docker образов раз в сутки
- **Ansible** + **Terraform** — IaC (есть в репозитории, частично готово)

### AI
- **Claude Sonnet 4** (`claude-sonnet-4-20250514`) через Anthropic API
- Используется ТОЛЬКО для Premium PDF (генерация JSON с 21 полем анализа)
- Raw HTTP через httpx (не SDK, хотя SDK тоже в requirements)
- Промпт возвращает строгий JSON без markdown

---

## 3. РЕПОЗИТОРИЙ

- **GitHub**: `https://github.com/DimirDin/career-check-bot`
- **Ветка**: `main`
- **Деплой**: push в main → вручную `git pull` + `docker compose build` на сервере

---

## 4. ПОЛНАЯ ФАЙЛОВАЯ СТРУКТУРА

```
career-check-bot/
│
├── main.py                        # Точка входа Telegram-бота
├── requirements.txt               # Python зависимости
├── Dockerfile                     # Multi-stage: Node build + Python app
├── docker-compose.yml             # 5 сервисов: bot, webapp, db, redis, watchtower
├── nginx.conf                     # Reverse proxy (yourdomain.com → webapp:8000)
├── deploy.sh                      # Скрипт деплоя (setup/deploy/db-backup/db-restore)
├── cron-backup.sh                 # Ежедневный cron-бэкап PostgreSQL → /opt/backups/
├── .env                           # Секреты (не в git)
├── .env.example                   # Шаблон всех переменных
├── PROJECT_CONTEXT.md             # Этот файл
├── miniapp_preview.html           # Статический HTML-превью Mini App (открыть в браузере)
│
├── config/
│   └── settings.py                # BOT_TOKEN, DB_CONFIG, REDIS_CONFIG, ADMIN_IDS,
│                                  # ANTHROPIC_API_KEY, PREMIUM_PRICE_STARS
│
├── bot/
│   ├── handlers.py                # Все хендлеры бота (~850 строк)
│   └── premium_handlers.py        # Оплата Stars + генерация Premium PDF
│
├── services/
│   ├── calculator.py              # Big Five + RIASEC расчёт + матчинг профессий
│   ├── pdf_generator.py           # Бесплатный PDF (Aurora тема, ReportLab)
│   ├── premium_pdf_generator.py   # Premium PDF (6 страниц, async)
│   ├── ai_analyst.py              # Claude API → JSON с 21 полем анализа
│   └── card_generator.py          # PNG-карточка для шаринга (matplotlib)
│
├── db/
│   ├── database.py                # Все async функции работы с PostgreSQL
│   └── migration/
│       ├── init.sql               # Схема + 60 вопросов + 30 профессий
│       ├── 010_test_progress.sql  # Таблица незавершённых тестов
│       ├── 020_multilang.sql      # Мультиязычные колонки
│       ├── add_professions_part1-2.sql  # Дополнительные профессии (30+)
│       ├── add_details_part1-6.sql      # Детали профессий (reality/pros/cons)
│       ├── fix_all_translations.sql
│       └── fix_round2_claude.sql
│
├── locales/
│   ├── __init__.py                # get_text(), resolve_lang(), SUPPORTED_LANGS
│   ├── ru.py                      # Русский (основной)
│   ├── en.py                      # English
│   ├── hi.py                      # हिंदी
│   ├── es.py                      # Español
│   └── pt.py                      # Português
│
├── middlewares/
│   └── rate_limit.py              # Sliding window rate limiter (in-memory)
│
├── miniapp/                       # React исходники (НЕ деплоится напрямую)
│   ├── index.html
│   ├── package.json               # React 18 + Vite 5 (без лишних зависимостей)
│   ├── vite.config.js             # outDir: ../webapp/dist
│   └── src/
│       ├── App.jsx                # Главный компонент + NavigationContext.Provider
│       ├── main.jsx               # ReactDOM.createRoot
│       ├── styles.css             # Aurora тема (глобальные стили)
│       │
│       ├── context/
│       │   └── NavigationContext.jsx  # Кастомный роутер (без react-router-dom)
│       │
│       ├── hooks/
│       │   ├── useTelegram.js     # Telegram WebApp API хук
│       │   └── useUserState.js    # Загрузка UserState с /api/user/state + retry
│       │
│       ├── pages/
│       │   ├── MenuPage.jsx       # Главное меню (центральный хаб)
│       │   ├── WelcomePage.jsx    # Экран приветствия
│       │   ├── QuizPage.jsx       # 60 вопросов с анимацией
│       │   └── ResultsPage.jsx    # Результаты (один скролл, без вкладок)
│       │
│       ├── components/
│       │   ├── HeroBanner.jsx     # Адаптивный баннер под статус пользователя
│       │   ├── PrimaryCTA.jsx     # Большая карточка "Пройти тест"
│       │   ├── QuickActionsGrid.jsx  # Сетка 2×2 быстрых действий
│       │   ├── SmartRecommendation.jsx  # Рекомендация дня (топ профессия)
│       │   ├── MenuFooter.jsx     # Настройки / Помощь / версия
│       │   ├── ProgressBar.jsx    # Переиспользуемый прогресс-бар
│       │   ├── GlassCard.jsx      # Glassmorphism обёртка
│       │   ├── RadarChart.jsx     # SVG радар-чарт (без зависимостей)
│       │   └── Icon.jsx           # SVG иконки (inline)
│       │
│       ├── styles/
│       │   └── MenuPage.module.css  # Aurora CSS-модуль для MenuPage
│       │
│       └── utils/
│           ├── calculator.js      # JS-зеркало services/calculator.py
│           └── formatDate.js      # Intl.DateTimeFormat для 5 языков
│
├── webapp/
│   ├── server.py                  # FastAPI: API + раздача dist/
│   └── dist/                      # Собранный React (npm run build)
│       ├── index.html
│       └── assets/
│           ├── index-*.css
│           └── index-*.js
│
├── assets/
│   ├── welcome_ru.png             # Картинка приветствия (бот)
│   ├── welcome_en.png
│   ├── welcome_hi.png
│   ├── welcome_es.png
│   └── welcome_pt.png
│
├── ansible/                       # Ansible деплой (частично готово)
│   ├── playbook.yml
│   ├── inventory.ini.template
│   └── templates/
│       ├── .env.j2
│       └── docker-compose.prod.yml.j2
│
└── terraform/                     # Terraform provisioning (частично готово)
    ├── main.tf
    ├── variables.tf
    └── terraform.tfvars.example
```

---

## 5. БАЗА ДАННЫХ — ПОЛНАЯ СХЕМА

### Таблица `users`
```sql
id           SERIAL PRIMARY KEY
telegram_id  BIGINT UNIQUE NOT NULL
username     TEXT
full_name    TEXT
lang         VARCHAR(5) DEFAULT 'en'   -- 'ru'|'en'|'hi'|'es'|'pt'
created_at   TIMESTAMP DEFAULT NOW()
test_completed BOOLEAN DEFAULT FALSE
```

### Таблица `questions` (60 записей)
```sql
id              SERIAL PRIMARY KEY
trait           TEXT NOT NULL          -- 'O'|'C'|'E'|'A'|'S'
question_text   TEXT NOT NULL          -- русский оригинал
question_text_en TEXT                  -- переводы (добавлены 020_multilang.sql)
question_text_hi TEXT
question_text_es TEXT
question_text_pt TEXT
is_inverted     BOOLEAN DEFAULT FALSE  -- score = 6 - score
weight          INTEGER DEFAULT 1
active          BOOLEAN DEFAULT TRUE
```
По 12 вопросов на каждую из 5 черт.

### Таблица `professions` (~60 записей)
```sql
id               SERIAL PRIMARY KEY
title            TEXT                   -- русский оригинал
title_en/hi/es/pt TEXT                  -- переводы
description      TEXT
description_en/hi/es/pt TEXT
required_traits  JSONB                  -- {"O":70,"C":80,"E":50,"A":55,"S":65}
riasec_type      TEXT                   -- 'R'|'I'|'A'|'S'|'E'|'C'
salary_range     TEXT
growth_potential TEXT                   -- 'Высокий'|'Средний'|'Низкий'
```

### Таблица `profession_details`
```sql
id              SERIAL PRIMARY KEY
profession_id   INTEGER → professions(id)
reality         TEXT                   -- реальность профессии
reality_en/hi/es/pt TEXT
pros            JSONB                  -- ["плюс1","плюс2",...]
pros_en/hi/es/pt JSONB
cons            JSONB
cons_en/hi/es/pt JSONB
```

### Таблица `test_results`
```sql
id                 SERIAL PRIMARY KEY
user_id            INTEGER → users(id)
raw_scores         JSONB              -- {"O":45,"C":38,...} (12-60)
normalized_scores  JSONB              -- {"O":69,"C":54,...} (0-100%)
riasec_profile     JSONB              -- {"R":20,"I":55,"A":30,"S":42,"E":60,"C":45}
top_professions    JSONB              -- [{title,match,description,salary,growth,riasec},...]
completed_at       TIMESTAMP DEFAULT NOW()
pdf_report_url     TEXT               -- не используется пока
```

### Таблица `test_progress`
```sql
telegram_id   BIGINT
state_data    JSONB
answers       JSONB
question_idx  INTEGER
updated_at    TIMESTAMP
```
Хранит незавершённые тесты. Очищается после завершения или 7+ дней.

### Вспомогательные таблицы
- `translation_fix_log` — лог исправлений переводов
- `translation_glossary` — глоссарий терминов

---

## 6. АЛГОРИТМ ТЕСТИРОВАНИЯ

### Шаг 1: Сбор 60 ответов (оценки 1-5)
Обратные вопросы (`is_inverted=True`): `score = 6 - score`

### Шаг 2: Big Five расчёт (`services/calculator.py`)
```python
raw[trait]        = sum(scores)           # 12-60
normalized[trait] = round((raw-12)/48*100) # 0-100%
```

### Шаг 3: RIASEC (из Big Five по формулам)
```python
R = (C*0.6 + S*0.4) * max(0,(100-O)/100) * 0.8  # Реалистичный
I = (O*0.5 + C*0.3 + S*0.2) * 0.9               # Исследовательский
A = (O*0.7 + A*0.3) * max(0,(100-C)/100) * 0.8   # Артистичный
S = (E*0.5 + A*0.5) * 0.9                         # Социальный
E = (E*0.6 + (100-A)*0.2 + S*0.2) * 0.9          # Предприимчивый
C = (C*0.7 + A*0.3) * 0.9                         # Конвенциональный
```

### Шаг 4: Матчинг профессий → топ-5
1. Поэлементное отклонение пользователя от требований профессии (floor=20%)
2. Взвешенное среднее (вес черты = её доля в профиле)
3. Бонус +5 за каждую черту ≥80% у обоих
4. Штраф -10/-15 за несовпадение RIASEC-доминанты
5. Бонус +10 за совпадение RIASEC-доминанты
6. Итог: 0-100%, сортировка, топ-5

Этот же алгоритм продублирован на JS в `miniapp/src/utils/calculator.js` (для live-preview без сервера).

---

## 7. ПОТОК ПОЛЬЗОВАТЕЛЯ В БОТЕ

```
/start
  → [новый] create_user в БД → показать welcome + картинку
  → [тест не начат] кнопки: [🔄 Пройти заново] [📋 Мой результат] [ℹ️ О тесте]
  → [есть незавершённый прогресс] предложение продолжить

[🔄 Пройти заново / Начать тест]
  → start_test_fresh: clear_progress + set state=in_progress
  → 60 вопросов (кнопки 1-5, прогресс-бар)
  → сохранение прогресса каждые N вопросов в test_progress

[После 60 ответов — finish_test()]
  → calculate_scores → calculate_riasec → match_professions
  → save_result (normalized, riasec, top_professions) + clear_progress
  → Отправка результатов:
    1. PNG карточка (card_generator.py → matplotlib)
    2. Big Five профиль с барчартами (текст ASCII)
    3. RIASEC профиль
    4. Топ-3 профессии с деталями
    5. Premium PDF оффер (кнопка 99 Stars)
    6. Кнопки: [🏠 На главную] [📤 Поделиться] [🔄 Пройти заново]

[📤 Поделиться]
  → generate_share_card → отправляет PNG в чат
  → кнопка "Поделиться с друзьями" → ссылка t.me/share/url

[🌟 Premium PDF — 99 Stars]
  → answer_invoice(currency="XTR", amount=99)
  → pre_checkout_query → answer(ok=True)
  → successful_payment → generate_premium_pdf (async, Claude API) → answer_document

[/start premium] (deep link из Mini App)
  → Сразу показывает инвойс 99 Stars
```

### Graceful Shutdown
`GracefulShutdown` класс перехватывает SIGTERM/SIGINT, ждёт завершения текущих апдейтов, корректно закрывает DB pool и bot session.

### FSM States
```python
class TestStates(StatesGroup):
    in_progress = State()
    finished    = State()
```
Используется aiogram MemoryStorage. **При рестарте бота состояния теряются** — это нормально, прогресс хранится в БД (test_progress).

### Rate Limiting (middlewares/rate_limit.py)
- Сообщения: 1 / 1 сек
- Callback: 3 / 2 сек  
- Flood: 5 нарушений → cooldown 60 сек
- In-memory deque (для multi-worker — нужен Redis)

---

## 8. ПОТОК ПОЛЬЗОВАТЕЛЯ В MINI APP

```
Открыть careercheck.app (через Telegram)
  → App.jsx: tg.ready() + tg.expand()
  → GET /api/questions?lang=ru — загружаем вопросы
  → GET /api/results/{user.id}?init_data=... — есть ли результаты?

Если есть результаты → SCREEN.MENU (MenuPage)
Если нет → SCREEN.MENU (MenuPage — HeroBanner покажет "Добро пожаловать")

MenuPage:
  → useUserState: GET /api/user/state?init_data=...
  → HeroBanner: адаптируется под статус
  → PrimaryCTA: кнопка "Начать тест" / "Продолжить" / "Пройти снова"
  → QuickActionsGrid: 4 плитки (Результаты / Premium / Профессии / История)
  → SmartRecommendation: если есть результаты — топ-1 профессия
  → Telegram MainButton: "Начать тест" / "Продолжить"

[Начать тест / navigate('/test')]
  → SCREEN.QUIZ (QuizPage)
  → 60 вопросов, анимация слайда, haptic feedback
  → После 60 → POST /api/results/save {init_data, answers, lang}
  → SCREEN.RESULTS (ResultsPage)

ResultsPage (один скролл, без вкладок):
  Hero → Big Five bars → Radar charts → RIASEC → Топ профессий →
  Premium PDF → Поделиться → [← Назад в меню]

[← Назад] или Telegram BackButton → navigate('/menu') → SCREEN.MENU

[🌟 Premium PDF]
  → tg.openTelegramLink('https://t.me/CareerCheck_Bot?start=premium')
  → Открывает бота → /start premium → инвойс 99 Stars

[📤 Поделиться]
  → tg.openTelegramLink('https://t.me/share/url?url=...&text=...')
  → Открывает диалог выбора чата в Telegram

Нереализованные экраны (Coming Soon заглушки):
  /premium, /professions, /history, /settings, /support
```

### Навигация (без react-router-dom)
```jsx
// NavigationContext.jsx
const navigate = (path) => {
  const ROUTE_MAP = {
    '/menu': 'menu', '/test': 'quiz',
    '/results': 'results', ...
  }
  setScreen(ROUTE_MAP[path] || 'coming_soon')
}
```

### Pull-to-refresh
В MenuPage — отслеживание touch events. Если потянуть вниз при scrollTop=0 — вызывается `refresh()` в useUserState.

---

## 9. FASTAPI BACKEND (webapp/server.py)

### Эндпоинты
| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/api/health` | Healthcheck → `{"status":"ok"}` |
| GET | `/api/user/state` | UserState для MenuPage |
| GET | `/api/questions` | Список вопросов (параметр `lang`) |
| GET | `/api/results/{tg_id}` | Последний результат (требует `init_data`) |
| POST | `/api/results/save` | Принять ответы, посчитать, сохранить |
| GET | `/assets/*` | Статика React (кешируется 1 год) |
| GET | `/*` | SPA fallback → index.html |

### Безопасность: validate_init_data()
```python
# Правильная реализация для нового Telegram (2024+):
# 1. parse_qsl() — URL-декодирует значения
# 2. Исключаем ТОЛЬКО 'hash' (signature остаётся в check_string!)
# 3. HMAC-SHA256: secret = HMAC(b"WebAppData", bot_token)
params = dict(parse_qsl(init_data, keep_blank_values=True))
check_string = "\n".join(f"{k}={params[k]}" for k in sorted(params) if k != "hash")
secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
expected   = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()
```
**Критическое знание**: Старый Telegram исключал из check_string `hash` + `signature`. Новый (2024+) исключает ТОЛЬКО `hash` — signature включается в check_string. Без этого HMAC не совпадает → 403.

### UserState объект
```typescript
{
  hasResults:      boolean,  // есть ли завершённые результаты
  hasPremium:      boolean,  // куплен ли Premium (TODO: реализовать проверку)
  testInProgress:  boolean,  // незавершённый тест
  currentQuestion: number,   // текущий вопрос (1-60)
  lastResultDate:  string|null, // ISO дата
  lastResultId:    string|null,
  historyCount:    number,   // количество прохождений
  language:        string,   // 'ru'|'en'|'hi'|'es'|'pt'
  topProfession:   {name, match, id} | null
}
```

---

## 10. PREMIUM PDF — ДЕТАЛЬНАЯ ЛОГИКА

### Файлы
- `services/ai_analyst.py` — Claude API запрос → JSON
- `services/premium_pdf_generator.py` — ReportLab рисует 6 страниц
- `bot/premium_handlers.py` — хендлеры оплаты Stars

### Поток оплаты
1. Кнопка в боте / Mini App → `callback_data="buy_premium_pdf"`
2. **Проверка**: `get_last_result()` — если нет результатов → alert, инвойс НЕ открывается
3. `answer_invoice(currency="XTR", amount=99)` — Telegram Stars
4. `pre_checkout_query` → `answer(ok=True)` + проверка `invoice_payload`
5. `successful_payment` → проверка payload → `generate_premium_pdf()`

### AI-анализ (Claude Sonnet 4)
Промпт отправляет: имя, Big Five %, RIASEC, топ-3 профессии с деталями.
Возвращает JSON с 21 полем:
```
personality_portrait, superpower, shadow_side,
career_vision_5y, career_vision_10y,
ideal_work_environment, communication_style, stress_and_burnout,
top1_why_perfect, top1_day_in_life, top1_roadmap[5 шагов],
top1_hard_skills[4], top1_soft_skills[3], top1_resources[4],
top2_brief, top3_brief,
salary_trajectory, networking_advice, red_flags[3],
action_today, personal_message
```

### PDF: 6 страниц, Aurora тема
- **Стр 1**: Обложка + психологический портрет + суперсила + тени
- **Стр 2**: Big Five bars + RIASEC hexagon grid
- **Стр 3**: Карьерное видение 5/10 лет + среда + стресс
- **Стр 4**: Глубокий анализ профессии #1 + рабочий день + зарплата
- **Стр 5**: Роадмап (5 шагов) + hard/soft skills + ресурсы + red flags
- **Стр 6**: Профессии #2/#3 + действие сегодня + личное послание

### Цвета PDF (Aurora)
```python
BG      = (0.05, 0.06, 0.12)  # тёмно-синий
PURPLE  = (0.45, 0.31, 0.90)
CYAN    = (0.18, 0.82, 0.95)
GOLD    = (1.00, 0.85, 0.30)  # premium
GREEN   = (0.25, 0.85, 0.55)
ORANGE  = (1.00, 0.60, 0.20)
```

---

## 11. МУЛЬТИЯЗЫЧНОСТЬ

### Поддерживаемые языки: ru, en, hi, es, pt

### Python (бот + PDF)
```python
from locales import get_text, resolve_lang
lang = resolve_lang(message.from_user.language_code)
text = get_text("welcome_title", lang)
# Fallback: lang → en → ru → key
```

### БД
- Каждая переводимая колонка имеет `<col>_en`, `<col>_hi`, `<col>_es`, `<col>_pt`
- SQL: `COALESCE(<col>_<lang>, <col>)` — fallback на русский

### Mini App
- `useTelegram` → `tg.initDataUnsafe.user.language_code`
- Локализация через объекты констант в каждом компоненте
- `formatDate.js` — через `Intl.DateTimeFormat`

---

## 12. AURORA DESIGN SYSTEM (Mini App)

### CSS переменные
```css
--bg-primary:    #0d0f1a;               /* тёмно-синий фон */
--bg-secondary:  rgba(255,255,255,0.05); /* glassmorphism */
--accent-purple: #7347e6;
--accent-cyan:   #2ed1f2;
--accent-gold:   #ffd94d;               /* premium */
--accent-green:  #3fd98f;
--accent-orange: #ff9933;
--text-primary:   #ffffff;
--text-secondary: rgba(255,255,255,0.6);
--text-muted:     rgba(255,255,255,0.4);
--border-glow:    rgba(45,209,242,0.3);
```

### Анимации
- `fadeSlideDown` — Hero Banner появление
- `pulseGlow` — PrimaryCTA если тест не пройден
- `fadeInUp` — QuickGrid карточки (staggered delay)
- CSS transitions на transform + opacity (GPU-accelerated)

### Glassmorphism
```css
background: rgba(255,255,255,0.05);
backdrop-filter: blur(20px);
border: 1px solid rgba(255,255,255,0.1);
border-radius: 16px;
```

---

## 13. DOCKER И ДЕПЛОЙ

### docker-compose.yml (5 сервисов)
```yaml
bot:        python main.py                        # Telegram bot, сеть: internal
webapp:     uvicorn webapp.server:app --port 8000  # FastAPI, порт 127.0.0.1:8000, сети: internal + web
db:         postgres:16-alpine                     # container_name: career_db, сеть: internal
redis:      redis:7-alpine                         # container_name: career_redis, сеть: internal
watchtower: containrrr/watchtower                  # auto-update каждые 86400 сек
```

**Сети:**
- `internal` — закрытая: bot ↔ webapp ↔ db ↔ redis
- `web` — открытая: nginx → webapp:8000

### Dockerfile (multi-stage)
```dockerfile
# Stage 1: Node 20-alpine → npm ci → vite build → webapp/dist/
# Stage 2: Python 3.12-slim → pip install → COPY код → COPY --from=frontend dist/
# Непривилегированный пользователь appuser
# EXPOSE 8000
```

### Как задеплоить изменения
```bash
# Локально: собрать фронтенд + запушить
cd miniapp && npm run build && cd ..
git add -A && git commit -m "..." && git push origin main

# На сервере: подтянуть + пересобрать образ + перезапустить
ssh root@31.76.18.54
cd /opt/careercheck
git pull origin main
docker compose build --no-cache webapp   # или bot
docker compose up -d webapp              # или bot

# ВАЖНО: просто git pull недостаточно — dist/ встроен в Docker образ
```

### Переменные окружения (.env на сервере: /opt/careercheck/.env)
```
BOT_TOKEN=8817887782:AAFMVDn5rXvzU_slIOtp-jMIQmLu1N2q_HY
DB_HOST=db
DB_PORT=5432
DB_NAME=career_db
DB_USER=career_user
DB_PASSWORD=career_pass_2024
POSTGRES_USER=career_user
POSTGRES_PASSWORD=career_pass_2024
POSTGRES_DB=career_db
REDIS_HOST=redis
REDIS_PORT=6379
ANTHROPIC_API_KEY=<ключ от Claude API>
PREMIUM_PRICE_STARS=99
DOMAIN=careercheck.app
```

---

## 14. NGINX (nginx.conf)

```nginx
# HTTP → HTTPS редирект
server { listen 80; return 301 https://$host$request_uri; }

# HTTPS
server {
  listen 443 ssl http2;
  ssl TLS 1.2/1.3, Let's Encrypt сертификат
  gzip on; security headers (X-Frame-Options, X-Content-Type)
  
  location / {
    proxy_pass http://127.0.0.1:8000;  # FastAPI webapp
    proxy_read_timeout 30s;
  }
  
  location /assets/ {
    expires 1y; Cache-Control "public, immutable";
  }
  
  client_max_body_size 2M;
}
```
Certbot настроен на auto-renew. Сертификат истекает 2026-09-03.

---

## 15. БЭКАПЫ

### Автоматический (cron)
```bash
# /etc/cron.d/careercheck-backup
0 3 * * * root /usr/local/bin/careercheck-backup.sh

# Скрипт:
docker compose exec db pg_dump -U career_user career_db | gzip > /opt/backups/careercheck_YYYYMMDD.sql.gz
# Хранит: последние 14 файлов + удаляет старше 30 дней
```

### Ручной бэкап
```bash
./deploy.sh db-backup
# Файл: /opt/backups/careercheck_YYYYMMDD_HHMMSS.sql.gz
```

### Восстановление
```bash
./deploy.sh db-restore /opt/backups/careercheck_20260605.sql.gz
```

### deploy.sh команды
```bash
./deploy.sh setup      # Первоначальная настройка сервера (Docker, nginx, certbot)
./deploy.sh deploy     # git pull → build → up -d
./deploy.sh logs       # Следить за логами
./deploy.sh db-backup  # Ручной бэкап
./deploy.sh db-restore # Восстановление
```

---

## 16. МОНИТОРИНГ И ЛОГИ

### Просмотр логов
```bash
docker logs careercheck-bot-1 --tail=50 -f    # Бот в реальном времени
docker logs careercheck-webapp-1 --tail=50     # Webapp
docker compose logs db --tail=20               # PostgreSQL
```

### Проверить всё одной командой
```bash
docker compose ps && curl -s https://careercheck.app/api/health
```

### Логи находятся в контейнерах (json-file driver)
- max-size: 10m (bot, webapp), 5m (db, redis)
- max-file: 3 (bot, webapp), 2 (db, redis)

---

## 17. ЧТО СДЕЛАНО (история разработки)

### Этап 1: Базовый бот
- Telegram бот на aiogram 3
- PostgreSQL с 60 вопросами, 30 профессиями
- Алгоритм Big Five + RIASEC + матчинг профессий
- Бесплатный PDF (Aurora тема, ReportLab)

### Этап 2: Мультиязычность
- Русский (основной) + English + हिंदी + Español + Português
- Все строки в locales/, переводы в БД через COALESCE

### Этап 3: Premium PDF + Telegram Stars
- Claude Sonnet 4 генерирует JSON-анализ (21 поле)
- 6-страничный Premium PDF
- Оплата через Telegram Stars (XTR, без provider_token)
- Исправление 4 багов: guard (тест не пройден), payload, asyncio, цена из settings

### Этап 4: Mini App
- React 18 + Vite, кастомный роутер без react-router-dom
- Экраны: Welcome → Quiz → Results
- FastAPI бэкенд с HMAC-валидацией initData
- Фикс HMAC: новый Telegram 2024+ включает signature в check_string

### Этап 5: Деплой на VPS
- Ubuntu 22.04, Docker, nginx, Let's Encrypt SSL
- Все миграции применены вручную (корректный порядок)
- Watchtower, cron-бэкап, UFW firewall

### Этап 6: Main Menu (MenuPage)
- Полный хаб: HeroBanner + PrimaryCTA + QuickActionsGrid + SmartRecommendation + MenuFooter
- CSS Modules + Aurora design system
- Telegram MainButton/BackButton интеграция
- Pull-to-refresh, Toast уведомления
- /api/user/state эндпоинт

### Этап 7: UX-фиксы
- ResultsPage: убраны вкладки → один скролл
- Кнопка "← Назад" снизу + Telegram BackButton
- Premium + Share на странице результатов
- /start → "🔄 Пройти заново" если тест уже пройден
- Share → карточка + кнопка нативного Telegram шаринга
- Deep link `?start=premium` из Mini App в бот

---

## 18. ИЗВЕСТНЫЕ ПРОБЛЕМЫ И ОГРАНИЧЕНИЯ

### Решённые (важно помнить для новых чатов)
1. **HMAC Mini App**: `signature` включается в check_string (не исключается), исключается только `hash`
2. **Docker и git pull**: после `git pull` нужно делать `docker compose build --no-cache` — dist/ встроен в образ
3. **assets/ в .gitignore**: *.png в .gitignore → картинки-приветствия нужно копировать на сервер вручную через scp
4. **asyncio.run в executor**: `generate_premium_pdf` — async функция, вызывается через `await` напрямую
5. **pre_checkout payload**: проверять `query.invoice_payload == PAYLOAD` перед `answer(ok=True)`
6. **Порт 8000**: должен быть `ports: ["127.0.0.1:8000:8000"]` в docker-compose (nginx → localhost:8000)

### Текущие ограничения
1. **Redis не используется в Python-коде** — есть в docker-compose, клиент в requirements, но пока не применяется
2. **hasPremium всегда False** — проверка факта покупки в БД не реализована (нет таблицы payments)
3. **MemoryStorage** для FSM бота — при рестарте состояния теряются (это ок, прогресс в БД)
4. **Ansible/Terraform** — есть в репозитории, но не полностью настроены

---

## 19. ЧТО В ПЛАНАХ (TODO)

### Приоритет: Высокий
- [ ] **Таблица purchases** в БД — хранить факт покупки Premium (telegram_id, stars, date)
- [ ] **hasPremium** в /api/user/state — читать из purchases
- [ ] **Экран /premium** в Mini App — описание, кнопка "Купить за 99 Stars" (через бота)
- [ ] **Экран /history** — история всех прохождений пользователя
- [ ] **Экран /professions** — каталог 30+ профессий с поиском

### Приоритет: Средний
- [ ] **Redis** для rate limiting и сессий (при масштабировании)
- [ ] **Redis** для хранения FSM состояний (persistent across restarts)
- [ ] **Webhook** вместо polling (при высокой нагрузке)
- [ ] **/stats admin** — статистика для админа (уже есть `/stats`, расширить)
- [ ] **Inline режим** бота — поделиться результатом в другом чате
- [ ] **Push уведомления** через бот — напомнить о незавершённом тесте

### Приоритет: Низкий
- [ ] **Экран /settings** — сменить язык, уведомления
- [ ] **Экран /support** — FAQ, ссылка на @CareerCheckSupport
- [ ] **Ansible автодеплой** — CI/CD через GitHub Actions
- [ ] **Мониторинг** — Grafana / Sentry / uptime-monitor
- [ ] **A/B тестирование** — разные версии вопросов

---

## 20. БЫСТРЫЙ СТАРТ ДЛЯ РАЗРАБОТКИ

### Локально (Python)
```bash
git clone https://github.com/DimirDin/career-check-bot
cd career-check-bot
cp .env.example .env  # заполнить BOT_TOKEN и ANTHROPIC_API_KEY
pip install -r requirements.txt
# Нужна локальная PostgreSQL или docker-compose up db redis
python main.py
```

### Локально (Mini App)
```bash
cd miniapp
npm install
npm run dev  # vite dev server на localhost:5173
# Но /api/* не будет работать без бэкенда
```

### Полный стек через Docker
```bash
cp .env.example .env  # заполнить токены
cd miniapp && npm run build && cd ..
docker compose up -d
# Применить миграции (первый раз):
docker compose exec db psql -U career_user -d career_db < db/migration/init.sql
docker compose exec db psql -U career_user -d career_db < db/migration/010_test_progress.sql
# ... остальные миграции по порядку
```

### Деплой новой версии на сервер
```bash
# Локально:
cd miniapp && npm run build && cd ..  # если менялся фронтенд
git add -A && git commit -m "feat: ..." && git push origin main

# На сервере (через sshpass или ssh):
cd /opt/careercheck
git pull origin main
docker compose build --no-cache webapp  # или bot
docker compose up -d webapp bot
```

---

## 21. КОНФИГУРАЦИЯ СЕРВЕРА

### Сервер
- **IP**: `31.76.18.54`
- **Пользователь**: `root`
- **ОС**: Ubuntu 22.04.5 LTS
- **RAM**: 2GB, **Диск**: 30GB

### Важные пути на сервере
```
/opt/careercheck/          # Корень проекта
/opt/careercheck/.env      # Секреты (не трогать без необходимости)
/opt/backups/              # SQL-дампы
/etc/nginx/sites-available/careercheck  # nginx конфиг
/etc/letsencrypt/live/careercheck.app/  # SSL сертификаты
/etc/cron.d/careercheck-backup          # cron задача
/usr/local/bin/careercheck-backup.sh    # скрипт бэкапа
```

### Docker ресурсы
```
Образ careercheck-bot    # ~600MB
Образ careercheck-webapp # ~600MB (тот же образ, разная команда)
Volume careercheck_pgdata # данные PostgreSQL
```

### Домен и SSL
- **Домен**: `careercheck.app`
- **DNS**: A-запись → `31.76.18.54`
- **SSL**: Let's Encrypt, истекает 2026-09-03 (auto-renew настроен certbot)
- **Mini App URL**: `https://careercheck.app`
- **API health**: `https://careercheck.app/api/health`
- **Bot**: `@CareerCheck_Bot` (id: 8817887782)

---

## 22. ПОЛЕЗНЫЕ КОМАНДЫ

```bash
# SSH на сервер
sshpass -p 'PASSWORD' ssh root@31.76.18.54

# Статус всех сервисов
docker compose -f /opt/careercheck/docker-compose.yml ps

# Перезапустить бота
docker compose restart bot

# Посмотреть логи в реальном времени
docker logs -f careercheck-bot-1

# Войти в PostgreSQL
docker compose exec db psql -U career_user -d career_db

# Выполнить SQL
docker compose exec -T db psql -U career_user -d career_db < migration.sql

# Проверить API
curl -s https://careercheck.app/api/health
curl -s https://careercheck.app/api/questions?lang=ru | python3 -m json.tool | head -20

# Ручной бэкап прямо сейчас
docker exec career_db pg_dump -U career_user career_db | gzip > /opt/backups/manual_$(date +%Y%m%d).sql.gz
```
