# CareerCheck Bot — Полный технический контекст проекта

> Этот файл создан для передачи контекста в новый чат.
> Описывает всю архитектуру, технологии, логику и файловую структуру проекта.

---

## 1. ЧТО ЭТО ТАКОЕ

**CareerCheck** — Telegram-бот для карьерного тестирования. Пользователь проходит научный психологический тест (60 вопросов, Big Five / OCEAN), получает профиль личности, список подходящих профессий и карьерные рекомендации. За 99 Telegram Stars — 6-страничный Premium PDF с персональным AI-анализом (Claude Sonnet).

Дополнительно: **Telegram Mini App** — тот же тест в виде React-приложения прямо внутри Telegram (без бота, через WebApp).

---

## 2. ТЕХНОЛОГИЧЕСКИЙ СТЕК

### Backend (Python)
- **aiogram 3.x** — Telegram Bot Framework (asyncio)
- **asyncpg** — async PostgreSQL драйвер
- **FastAPI** — REST API для Mini App (webapp/server.py)
- **uvicorn** — ASGI сервер для FastAPI
- **ReportLab** — генерация PDF (бесплатный + premium)
- **matplotlib / numpy** — графики и расчёты
- **httpx** — HTTP-клиент для Anthropic API
- **anthropic** — официальный SDK (добавлен в requirements)
- **python-dotenv** — загрузка .env

### Frontend (JavaScript/React)
- **React 18** + **Vite 5** — SPA для Mini App
- **Telegram WebApp JS API** — интеграция с Telegram
- Сборка: `miniapp/` → `webapp/dist/` (через vite.config.js)

### База данных
- **PostgreSQL 16** — основная БД
- **Redis 7** — есть в docker-compose, готов для rate limiting / кеширования

### Инфраструктура
- **Docker** + **docker-compose** (multi-service)
- **nginx** — reverse proxy, SSL termination
- **Certbot / Let's Encrypt** — SSL сертификаты
- **Watchtower** — автообновление Docker-образов
- **Ansible** — IaC для деплоя на VPS
- **Terraform** — provisioning облачного сервера

### AI
- **Claude Sonnet 4** (`claude-sonnet-4-20250514`) через Anthropic API
- Используется только для Premium PDF (генерация JSON с анализом)
- Raw HTTP через httpx (не SDK, но anthropic SDK добавлен в requirements)

---

## 3. ФАЙЛОВАЯ СТРУКТУРА

```
career-check-bot/
├── main.py                          # Точка входа бота
├── requirements.txt                 # Python зависимости
├── Dockerfile                       # Multi-stage: Node build + Python app
├── docker-compose.yml               # bot + webapp + db + redis + watchtower
├── nginx.conf                       # Reverse proxy конфиг
├── deploy.sh                        # Скрипт деплоя (setup/deploy/backup/restore)
├── cron-backup.sh                   # Ежедневный бэкап PostgreSQL
├── .env                             # Секреты (не в git)
├── .env.example                     # Шаблон переменных окружения
│
├── config/
│   └── settings.py                  # Все конфиги из env: BOT_TOKEN, DB_CONFIG,
│                                    # ANTHROPIC_API_KEY, PREMIUM_PRICE_STARS
│
├── bot/
│   ├── handlers.py                  # Все хендлеры бота (основной файл ~800 строк)
│   └── premium_handlers.py          # Хендлеры оплаты Stars + выдача Premium PDF
│
├── services/
│   ├── calculator.py                # Big Five расчёт + RIASEC + match профессий
│   ├── pdf_generator.py             # Бесплатный PDF (Aurora тема, ReportLab)
│   ├── premium_pdf_generator.py     # Premium PDF (6 страниц, использует ai_analyst)
│   ├── ai_analyst.py                # Запросы к Claude API, генерация JSON-анализа
│   └── card_generator.py            # Генерация PNG-карточки для шаринга
│
├── db/
│   ├── database.py                  # Все async функции работы с БД
│   └── migration/
│       ├── init.sql                 # Схема БД + 60 вопросов + 30 профессий
│       ├── 010_test_progress.sql    # Таблица для сохранения прогресса
│       ├── 020_multilang.sql        # Мультиязычные колонки
│       └── add_details_part1-6.sql  # Детали профессий (reality/pros/cons)
│
├── locales/
│   ├── __init__.py                  # get_text(), resolve_lang(), SUPPORTED_LANGS
│   ├── ru.py                        # Русские строки
│   ├── en.py                        # English strings
│   ├── hi.py                        # हिंदी
│   ├── es.py                        # Español
│   └── pt.py                        # Português
│
├── middlewares/
│   └── rate_limit.py                # RateLimitMiddleware (скользящее окно)
│
├── miniapp/                         # React Mini App (исходники)
│   ├── index.html
│   ├── package.json                 # React 18, Vite 5
│   ├── vite.config.js               # outDir: ../webapp/dist
│   └── src/
│       ├── App.jsx                  # Главный компонент, роутинг экранов
│       ├── main.jsx                 # ReactDOM.createRoot
│       ├── styles.css               # Aurora тема
│       ├── hooks/
│       │   └── useTelegram.js       # Хук Telegram WebApp API
│       ├── pages/
│       │   ├── WelcomePage.jsx      # Экран приветствия
│       │   ├── QuizPage.jsx         # Экран теста (вопросы)
│       │   └── ResultsPage.jsx      # Экран результатов
│       ├── components/
│       │   └── RadarChart.jsx       # SVG radar chart для RIASEC
│       └── utils/
│           └── calculator.js        # JS-зеркало services/calculator.py
│
├── webapp/
│   ├── server.py                    # FastAPI: API для Mini App + раздача dist/
│   └── dist/                        # Собранный React (npm run build)
│       ├── index.html
│       └── assets/
│           ├── index-*.js
│           └── index-*.css
│
├── assets/
│   └── welcome_*.png                # Картинки приветствия (ru/en/hi/es/pt)
│
├── ansible/                         # Ansible playbook для деплоя
├── terraform/                       # Terraform для provisioning VPS
└── files/                           # Исходные файлы для деплоя (рабочая папка)
```

---

## 4. БАЗА ДАННЫХ — СХЕМА

### Таблица `users`
```sql
id SERIAL PRIMARY KEY
telegram_id BIGINT UNIQUE      -- Telegram user ID
username TEXT
full_name TEXT
lang TEXT                       -- 'ru'|'en'|'hi'|'es'|'pt'
created_at TIMESTAMP
test_completed BOOLEAN
```

### Таблица `questions`
```sql
id SERIAL PRIMARY KEY
trait TEXT                      -- 'O'|'C'|'E'|'A'|'S' (Big Five)
question_text TEXT              -- русский оригинал
question_text_en TEXT           -- переводы (добавлены миграцией)
question_text_hi TEXT
question_text_es TEXT
question_text_pt TEXT
is_inverted BOOLEAN             -- обратные вопросы (score = 6 - score)
active BOOLEAN
```
**60 вопросов**, по 12 на каждый из 5 трейтов.

### Таблица `professions`
```sql
id SERIAL PRIMARY KEY
title TEXT                      -- русский оригинал
title_en / title_hi / ...       -- переводы
description TEXT
description_en / ...
required_traits JSONB           -- {"O":70,"C":80,"E":50,"A":55,"S":65}
riasec_type TEXT                -- 'R'|'I'|'A'|'S'|'E'|'C'
salary_range TEXT
growth_potential TEXT
```
**30 профессий** от Слесаря до Предпринимателя.

### Таблица `profession_details`
```sql
profession_id INTEGER → professions(id)
reality TEXT                    -- реальность профессии
reality_en / reality_hi / ...
pros JSONB                      -- ["плюс1", "плюс2", ...]
pros_en / ...
cons JSONB
cons_en / ...
```

### Таблица `test_results`
```sql
id SERIAL PRIMARY KEY
user_id INTEGER → users(id)
raw_scores JSONB                -- {"O":45,"C":38,...}
normalized_scores JSONB         -- {"O":69,"C":54,...} (0-100%)
riasec_profile JSONB            -- {"R":20,"I":55,"A":30,"S":42,"E":60,"C":45}
top_professions JSONB           -- [{"title":"...","match":87,"riasec":"I",...}, ...]
completed_at TIMESTAMP
```

### Таблица `test_progress`
```sql
telegram_id BIGINT
state_data JSONB                -- FSM state для resume теста
answers JSONB
question_idx INTEGER
updated_at TIMESTAMP
```

---

## 5. АЛГОРИТМ ТЕСТИРОВАНИЯ

### Шаг 1: Сбор ответов
Пользователь отвечает на 60 вопросов по шкале 1-5 (в боте — кнопки, в Mini App — тапы).
Каждый вопрос привязан к одному трейту (O/C/E/A/S).
Обратные вопросы (`is_inverted=True`): `score = 6 - score`.

### Шаг 2: Big Five расчёт (`services/calculator.py`)
```python
raw[trait]        = sum(scores_for_trait)         # 12-60
normalized[trait] = round((raw - 12) / 48 * 100)  # 0-100%
```

### Шаг 3: RIASEC расчёт
RIASEC выводится из Big Five по формулам взвешивания:
```python
R = (C*0.6 + S*0.4) * max(0, (100-O)/100) * 0.8  # Реалистичный
I = (O*0.5 + C*0.3 + S*0.2) * 0.9                 # Исследовательский
A = (O*0.7 + A*0.3) * max(0, (100-C)/100) * 0.8   # Артистичный
S = (E*0.5 + A*0.5) * 0.9                          # Социальный
E = (E*0.6 + (100-A)*0.2 + S*0.2) * 0.9           # Предприимчивый
C = (C*0.7 + A*0.3) * 0.9                          # Конвенциональный
```

### Шаг 4: Матчинг профессий
Алгоритм взвешенного сравнения с бонусами/штрафами:
1. Поэлементное отклонение пользователя от требований профессии (floor=20%)
2. Веса черт = доля черты в профиле профессии
3. Бонус +5 за каждую черту ≥80% у обоих
4. Штраф -10/-15 за несовпадение RIASEC-доминанты
5. Бонус +10 за совпадение доминирующего RIASEC-типа
6. Итог: 0-100%, топ-5 профессий

---

## 6. ПОТОК ПОЛЬЗОВАТЕЛЯ В БОТЕ

```
/start
  → Проверка пользователя в БД (create если нет)
  → Определение языка (resolve_lang из Telegram language_code)
  → Картинка-приветствие (welcome_<lang>.png)
  → Кнопки: [Начать тест] [Мои результаты] [Статистика]

[Начать тест]
  → Проверка незавершённого прогресса → предложение продолжить
  → 60 вопросов с инлайн-кнопками 1-5
  → Прогресс-бар в сообщении
  → Сохранение прогресса в БД каждые N вопросов
  → save_progress() → asyncpg

[После 60 вопросов — finish_test()]
  → calculate_scores() → normalize → calculate_riasec()
  → match_professions() → топ-5 профессий
  → save_result() в БД
  → Отправка результатов:
      1. Карточка-картинка (card_generator.py)
      2. Big Five профиль (текст с барами ▓░)
      3. RIASEC профиль
      4. Топ-3 профессии с описанием
      5. Кнопка Premium PDF (99 Stars)
      6. Кнопки: [На главную] [Поделиться] [Пройти снова]

[Кнопка Premium PDF]
  → premium_handlers.py → cb_buy_premium()
  → answer_invoice() с currency="XTR" (Telegram Stars)
  → pre_checkout_query → answer(ok=True)
  → successful_payment → generate_premium_pdf()
      → generate_ai_analysis() → Claude API → JSON
      → Рисуем 6 страниц PDF (ReportLab)
      → answer_document() — PDF файл
```

---

## 7. PREMIUM PDF — ДЕТАЛЬНАЯ ЛОГИКА

### Файлы: `services/ai_analyst.py` + `services/premium_pdf_generator.py`

### AI-анализ (ai_analyst.py)
1. Строим prompt с данными: имя, Big Five %, RIASEC, топ-3 профессии с деталями
2. POST на `https://api.anthropic.com/v1/messages`
   - Модель: `claude-sonnet-4-20250514`
   - max_tokens: 3000
   - Ответ: строгий JSON без markdown
3. Парсим JSON с 21 полем:
   - `personality_portrait`, `superpower`, `shadow_side`
   - `career_vision_5y`, `career_vision_10y`
   - `ideal_work_environment`, `communication_style`, `stress_and_burnout`
   - `top1_why_perfect`, `top1_day_in_life`, `top1_roadmap` (список шагов)
   - `top1_hard_skills`, `top1_soft_skills`, `top1_resources`
   - `top2_brief`, `top3_brief`
   - `salary_trajectory`, `networking_advice`, `red_flags`
   - `action_today`, `personal_message`

### PDF структура (6 страниц, Aurora тема)
- **Страница 1**: Обложка + психологический портрет + суперсила + тени
- **Страница 2**: Big Five bars (с цветами и лейблами) + RIASEC grid (6 ячеек)
- **Страница 3**: Карьерное видение 5/10 лет + идеальная среда + коммуникация + стресс
- **Страница 4**: Глубокий анализ профессии #1 + рабочий день + зарплатная траектория
- **Страница 5**: Роадмап (5 шагов) + hard/soft skills + ресурсы + red flags
- **Страница 6**: Профессии #2 и #3 + действие сегодня + личное послание

### Цветовая схема (Aurora)
```python
BG      = (0.05, 0.06, 0.12)   # тёмно-синий фон
PURPLE  = (0.45, 0.31, 0.90)   # фиолетовый акцент
CYAN    = (0.18, 0.82, 0.95)   # голубой
GOLD    = (1.00, 0.85, 0.30)   # золотой (premium)
GREEN   = (0.25, 0.85, 0.55)   # зелёный
ORANGE  = (1.00, 0.60, 0.20)   # оранжевый
```

---

## 8. MINI APP — TELEGRAM WEBAPPP

### Технология
React 18 SPA, собирается Vite в `webapp/dist/`, раздаётся FastAPI.
Открывается через Telegram кнопку — внутри Telegram без перехода в браузер.

### Экраны
1. **WelcomePage** — объяснение теста, кнопка "Начать"
2. **QuizPage** — 60 вопросов, кнопки 1-5, прогресс-бар
3. **ResultsPage** — Big Five bars + RadarChart для RIASEC + топ профессий

### Поток данных
```
useTelegram() → получаем initData (подписанные данные от Telegram)
initApp() → GET /api/questions?lang=ru
         → GET /api/results/{user_id}?init_data=... (если уже проходил)
handleFinish(answers) → POST /api/results/save {init_data, answers, lang}
                      → сервер считает + сохраняет + возвращает результаты
```

### Безопасность
`webapp/server.py` → `validate_init_data()`:
- HMAC-SHA256 подпись initData с BOT_TOKEN
- Проверяет что данные не подделаны
- Только тогда разрешает сохранить результат

### useTelegram.js хук
Предоставляет: `user`, `initData`, `haptic`, `showMainButton`, `showBackButton`,
`themeParams` (следит за тёмной/светлой темой Telegram), `close`.

---

## 9. BACKEND API (webapp/server.py)

```
GET  /api/health                     → {"status": "ok"}
GET  /api/questions?lang=ru          → список вопросов
GET  /api/results/{tg_id}            → последний результат (требует init_data)
POST /api/results/save               → принять ответы, посчитать, сохранить
GET  /assets/*                       → статика React (кешируется)
GET  /{any}                          → index.html (SPA fallback)
```

CORS разрешён для всех (`allow_origins=["*"]`) — только за nginx-ом, нормально.

---

## 10. МУЛЬТИЯЗЫЧНОСТЬ

### Поддерживаемые языки: ru, en, hi (हिंदी), es (Español), pt (Português)

### Архитектура
- `locales/<lang>.py` — Python dict со всеми строками
- `get_text(key, lang)` — fallback: lang → en → ru → key
- `resolve_lang(tg_lang_code)` — маппинг Telegram language_code
- БД: для каждой переводимой колонки добавлены `<col>_en`, `<col>_hi`, `<col>_es`, `<col>_pt`
- `COALESCE(<col>_<lang>, <col>)` — SQL fallback на русский

---

## 11. RATE LIMITING (middlewares/rate_limit.py)

Конфигурация в main.py:
- **Сообщения**: 1 сообщение / 1 сек (скользящее окно)
- **Callback**: 3 нажатия / 2 сек
- **Flood**: 5 нарушений подряд → cooldown 60 сек

Реализация: in-memory deque с временными метками. При масштабировании — заменить на Redis.

---

## 12. DOCKER И ИНФРАСТРУКТУРА

### docker-compose.yml (5 сервисов)

```yaml
bot:      python main.py               # Telegram bot
webapp:   uvicorn webapp.server:app    # FastAPI Mini App, порт 8000
db:       postgres:16-alpine           # PostgreSQL
redis:    redis:7-alpine               # Redis (готов к использованию)
watchtower: containrrr/watchtower      # Авто-обновление образов
```

Сети:
- `internal` — бот + webapp + db + redis (закрытая)
- `web` — webapp (nginx → webapp:8000)

### Dockerfile (multi-stage)
```
Stage 1 (node:20-alpine): npm ci && npm run build → webapp/dist/
Stage 2 (python:3.12-slim): pip install → COPY код → COPY --from=frontend webapp/dist
```

### Переменные окружения (.env / .env.example)
```
BOT_TOKEN=                    # Telegram Bot Token
DB_HOST=db / DB_PORT=5432
DB_NAME=career_db / DB_USER=career_user / DB_PASSWORD=career_pass
POSTGRES_USER=career_user     # Для docker-compose healthcheck
POSTGRES_PASSWORD=career_pass
POSTGRES_DB=career_db
REDIS_HOST=redis / REDIS_PORT=6379
ANTHROPIC_API_KEY=            # Claude API ключ
PREMIUM_PRICE_STARS=99        # Цена Premium PDF в Stars
DOMAIN=careercheck.app        # Домен для nginx
```

---

## 13. ДЕПЛОЙ

### deploy.sh — команды
```bash
./deploy.sh setup      # Установка Docker, nginx, certbot, создание папок
./deploy.sh deploy     # git pull → docker compose build → up -d
./deploy.sh logs       # Следить за логами
./deploy.sh db-backup  # Ручной бэкап PostgreSQL
./deploy.sh db-restore # Восстановление из бэкапа
```

### cron-backup.sh
Запускается по cron ежедневно:
- `docker compose exec db pg_dump | gzip > /opt/backups/careercheck_YYYYMMDD.sql.gz`
- Хранит последние 14 бэкапов + удаляет старше 30 дней

### nginx.conf
- HTTP → HTTPS редирект
- SSL TLS 1.2/1.3, HSTS-готов
- Proxy на localhost:8000 (FastAPI)
- Aggressive caching для `/assets/` (Vite ставит хеши в имена файлов)
- Gzip, security headers

---

## 14. ЗАВИСИМОСТИ (requirements.txt)

```
aiogram>=3.4.0          # Telegram bot framework
asyncpg>=0.29.0         # PostgreSQL async
redis>=5.0.0            # Redis клиент
python-dotenv>=1.0.0    # .env
matplotlib>=3.8.0       # Графики для PDF
reportlab>=4.0.0        # Генерация PDF
numpy>=1.26.0           # Математика для матчинга
httpx>=0.27.0           # HTTP клиент (Anthropic API)
pypdf>=4.0.0            # Работа с PDF
fastapi>=0.111.0        # Mini App API
uvicorn[standard]>=0.30.0  # ASGI сервер
anthropic>=0.35.0       # Claude API SDK
```

---

## 15. ВАЖНЫЕ ДЕТАЛИ И ОСОБЕННОСТИ

### Graceful Shutdown (main.py)
`GracefulShutdown` класс перехватывает SIGTERM/SIGINT, корректно завершает polling,
закрывает DB pool и bot session. Важно для Docker stop.

### Сохранение прогресса
`save_progress()` / `get_progress()` — пользователь может прервать тест и продолжить.
При старте `/start` бот проверяет незавершённый прогресс и предлагает продолжить или начать заново.
Старый прогресс (>7 дней) чистится при запуске: `cleanup_old_progress(pool, days=7)`.

### Блокировка двойного нажатия
`_processing_users: set[int]` — флаг в памяти предотвращает повторную обработку
пока предыдущий ответ ещё обрабатывается.

### Циклические импорты
`handlers.py` импортирует `premium_keyboard` из `premium_handlers.py`.
`premium_handlers.py` НЕ импортирует ничего из `handlers.py`. Циклов нет.

### Pool injection
`dp["pool"] = pool` в main.py → aiogram автоматически инжектирует `pool` в хендлеры
через аргумент `pool: asyncpg.Pool`.

### Premium PDF — asyncio.run внутри executor
В `premium_handlers.py` используется `loop.run_in_executor(None, lambda: asyncio.run(generate_premium_pdf(...)))`.
Это костыль: `generate_premium_pdf` — async функция, но запускается из sync executor.
Это работает, но не идеально. Лучше: `await generate_premium_pdf(...)` напрямую.

### Миграции БД
Файлы в `db/migration/` монтируются в `docker-entrypoint-initdb.d/` PostgreSQL-контейнера.
Выполняются автоматически при первом старте. При повторных стартах — игнорируются.

---

## 16. ИЗВЕСТНЫЕ ПРОБЛЕМЫ И ЧТО НУЖНО СДЕЛАТЬ

1. **BOT_TOKEN** — требует замены в BotFather (старый мог утечь в git history)
2. **asyncio.run в executor** — в premium_handlers.py лучше переделать на прямой await
3. **redis** — есть в docker-compose, но не используется в коде. Можно подключить
   для хранения `_processing_users` и rate limit состояния (для multi-worker деплоя)
4. **ai_analyst.py** — использует raw httpx вместо официального anthropic SDK.
   SDK уже добавлен в requirements, можно переписать на `anthropic.AsyncAnthropic`
5. **CORS** — `allow_origins=["*"]` в FastAPI. Можно сузить до `DOMAIN` из .env

---

## 17. СТРУКТУРА КОДА В handlers.py (основные хендлеры)

```python
cmd_start()         # /start — приветствие, проверка прогресса
cmd_stats()         # /stats — статистика бота (только ADMIN_IDS)
cb_lang_*()         # Выбор языка
cb_start_test()     # Начало теста / продолжение
process_answer()    # Обработка ответа (State: in_progress)
finish_test()       # После 60 ответов — результаты + Premium оффер
cb_back_to_start()  # Назад на главную
cb_share_result()   # Поделиться результатами
cb_start_fresh()    # Начать тест заново
cb_my_results()     # Показать последние результаты
```

---

## 18. СТРУКТУРА КОДА В premium_handlers.py

```python
cb_buy_premium()    # callback "buy_premium_pdf" → answer_invoice(currency="XTR")
pre_checkout()      # @pre_checkout_query → answer(ok=True)
payment_success()   # @F.successful_payment → generate_premium_pdf → answer_document
_get_lang()         # хелпер: получить язык пользователя из БД
premium_keyboard()  # утилита: InlineKeyboardMarkup с кнопкой 99 Stars
```

---

## 19. GIT И РЕПОЗИТОРИЙ

- Репозиторий: https://github.com/DimirDin/career-check-bot
- Ветка: `main`
- Последние коммиты:
  - `feat: Mini App + Premium PDF + Aurora theme + deploy scripts`
  - `fix: merge docker-compose improvements, add anthropic SDK, unify backup cleanup`
  - `chore: remove leftover SQL backup files`

---

## 20. БЫСТРЫЙ СТАРТ ДЛЯ НОВОГО РАЗРАБОТЧИКА

```bash
# 1. Клонировать
git clone https://github.com/DimirDin/career-check-bot
cd career-check-bot

# 2. Настроить переменные
cp .env.example .env
# Заполнить BOT_TOKEN, ANTHROPIC_API_KEY, остальное — дефолты

# 3. Собрать фронтенд
cd miniapp && npm install && npm run build && cd ..

# 4. Запустить
docker compose up -d

# 5. Применить миграции (автоматически при первом старте db)
# Если нужно вручную:
docker compose exec db psql -U career_user -d career_db -f /docker-entrypoint-initdb.d/init.sql

# 6. Проверить
docker compose ps
docker compose logs bot
```
