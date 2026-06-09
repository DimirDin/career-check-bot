# CareerCheck — Полный контекст проекта (v7.0, 2026-06-09)

> Этот файл — единственный источник правды о проекте. Передавай его другому ИИ целиком.
> PROJECT_CONTEXT.md скомпрометирован (токен), PROJECT_CONTEXT2.md — устарел.

---

## 1. Что такое CareerCheck

**CareerCheck** — Telegram Mini App + Bot для карьерного тестирования на основе научной модели **Big Five (OCEAN)**. Пользователь проходит тест прямо в Telegram (60 вопросов, ~15 минут), получает:

- Психологический профиль по 5 чертам (OCEAN)
- RIASEC-тип карьеры (6 типов по Holland)
- Топ совпадающих профессий из каталога 160+
- Premium: 6-страничный PDF-отчёт с AI-анализом (Claude Sonnet 4)

**Бот:** @CareerCheck_Bot  
**Домен:** https://careercheck.app  
**Репо:** github.com/DimirDin/career-check-bot (ветка `main`)

---

## 2. Технологический стек

### Backend (Python)
| Компонент | Технология | Версия/детали |
|---|---|---|
| Telegram Bot | aiogram | 3.x, polling mode |
| Web API | FastAPI | + uvicorn |
| БД | PostgreSQL | 16, asyncpg |
| Кеш / FSM | Redis | 7, RedisStorage для FSM |
| AI Premium PDF | Anthropic Claude | `claude-sonnet-4-20250514` |
| AI Чат (скрыт) | Anthropic Claude | `claude-3-5-haiku` |
| Миграции | Alembic + raw SQL | в `alembic/versions/` + `db/migration/` |
| Circuit Breaker | `services/circuit_breaker.py` | обёртка над Anthropic API |

### Frontend (React)
| Компонент | Технология |
|---|---|
| Фреймворк | React 18 + Vite 5 |
| Стили | CSS Modules (MenuPage) + нативный CSS везде |
| Роутинг | Кастомный `NavigationContext` — NO react-router |
| No-go зависимости | Tailwind, Framer Motion, react-router |

### Инфраструктура
| Сервис | Детали |
|---|---|
| VPS | Ubuntu 22.04, IP: 31.76.18.54 |
| Оркестрация | Docker Compose, 5 сервисов |
| Reverse proxy | nginx |
| TLS | Let's Encrypt, истекает 2026-09-03 |
| CI/CD | `.github/workflows/deploy.yml` (GitHub Actions) |
| IaC | Terraform (`terraform/`) + Ansible (`ansible/`) |
| Деплой сейчас | `git push` → `git pull` + `docker compose build --no-cache` на сервере вручную |

---

## 3. Структура репозитория

```
career-check-bot/
├── main.py                    # Точка входа бота (polling, graceful shutdown)
├── webapp/server.py           # FastAPI сервер (REST API + раздача SPA)
├── bot/
│   ├── handlers.py            # Все хендлеры бота (2000+ строк)
│   └── premium_handlers.py    # Telegram Stars оплата
├── services/
│   ├── ai_analyst.py          # Claude API → Premium PDF контент
│   ├── ai_chat.py             # Claude API → AI чат (скрыт)
│   ├── calculator.py          # Big Five + RIASEC расчёт
│   ├── card_generator.py      # PNG карточка для Share
│   ├── challenge_service.py   # Планировщик ежедневных заданий
│   ├── circuit_breaker.py     # Circuit breaker для Anthropic API
│   ├── pdf_generator.py       # Базовый PDF
│   └── premium_pdf_generator.py # Premium 6-страничный PDF
├── db/
│   ├── database.py            # Все SQL-запросы (asyncpg)
│   └── migration/             # Raw SQL миграции
├── alembic/versions/          # Alembic миграции (001–003)
├── config/
│   ├── settings.py            # Все env переменные
│   └── logging_config.py
├── locales/                   # Переводы: ru, en, hi, es, pt
│   ├── ru.py, en.py, hi.py, es.py, pt.py
│   └── __init__.py            # get_text(), resolve_lang()
├── middlewares/rate_limit.py  # Rate limiting через Redis
├── miniapp/                   # React SPA
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── pages/             # Все страницы
│   │   ├── components/        # Переиспользуемые компоненты
│   │   ├── hooks/             # useTelegram.js, useUserState.js, useAnalytics.js
│   │   ├── context/NavigationContext.jsx
│   │   ├── utils/calculator.js # Big Five расчёт на фронте
│   │   └── styles/            # CSS, CSS Modules
│   ├── public/
│   │   ├── manifest.json      # display:fullscreen, PWA
│   │   └── icons/logo.svg
│   └── vite.config.js
├── docker-compose.yml
├── nginx.conf
├── Dockerfile
├── requirements.txt
└── .env.example
```

---

## 4. Docker Compose сервисы

```yaml
# 5 сервисов:
bot:       python main.py (polling)
webapp:    uvicorn webapp.server:app
miniapp:   nginx раздаёт dist/ (React build встроен в образ)
postgres:  PostgreSQL 16
redis:     Redis 7
```

> **Важно:** После `git pull` обязателен `docker compose build --no-cache` — `dist/` встроен в образ nginx.

---

## 5. База данных (PostgreSQL)

### Основные таблицы

| Таблица | Назначение |
|---|---|
| `users` | tg_id, username, full_name, lang, test_completed, has_premium, created_at |
| `questions` | Big Five вопросы (60 шт × 5 языков), trait, is_inverted |
| `results` | raw_scores, normalized_scores (JSON), riasec_profile (JSON), top_professions (JSON) |
| `professions` | 160+ профессий, required_traits (JSON), riasec_type, growth_percent, multilang |
| `profession_details` | pros/cons/reality/description по профессии + lang |
| `test_progress` | Сохранённый прогресс незавершённого теста (answers JSON, current_question) |
| `purchases` | Telegram Stars покупки, user_id, product, amount, created_at |
| `referrals` | referrer_tg_id, referred_tg_id, created_at |
| `challenge_subscriptions` | tg_id, subscribed_at, last_sent_day |

### Миграции
- Alembic: `001_initial_schema.py`, `002_add_purchases.py`, `003_sprint3.py`
- Raw SQL: `db/migration/` (доп. поля, переводы, профессии)
- **TODO:** `alembic stamp head` на prod БД не выполнен

---

## 6. Telegram Bot (handlers.py)

### Команды
| Команда | Действие |
|---|---|
| `/start` | Умный старт: онбординг (новые) или хаб с топ-профессией (вернувшиеся). Deep links: `ref_ID`, `premium` |
| `/myresult` | Последний результат (Big Five + топ-5 профессий) |
| `/about` | О создателе |
| `/admin` | Статистика (только ADMIN_IDS) |
| `/help` | FAQ |
| `/refer` | Реферальная ссылка |
| `/challenges` | Подписка на ежедневные задания |
| `/stop_challenges` | Отписка |
| `/cancel` | Прервать тест (с сохранением или очисткой прогресса) |

### Callback handlers
- `start_test_fresh` — сброс прогресса + начало нового теста
- `resume_test` — продолжить с сохранённого вопроса
- `score_1..5` — ответ на вопрос (5-точечная шкала Ликерта)
- `my_result`, `share_result`, `about_test`, `back_to_start`, `main_menu`
- `show_challenges`, `show_referral`
- `save_and_exit`, `clear_and_exit`
- Premium: `buy_premium`, `check_premium` (в premium_handlers.py)

### Inline mode
`@CareerCheck_Bot` в любом чате → карточка с результатом пользователя (или промо, если теста нет). Активировать в BotFather: `/setinline` → placeholder "Поделиться результатом...".

### FSM (конечные автоматы)
```python
class TestStates(StatesGroup):
    in_progress = State()   # Пользователь отвечает на вопросы
    finished    = State()   # Тест завершён
```
FSM хранится в Redis (`DefaultKeyBuilder(prefix="fsm")`).

### Rate Limiting
- Message: 1 / 1 сек
- Callback: 3 / 2 сек
- Flood: 5 нарушений → cooldown 60 сек

### Динамическая кнопка меню
`update_menu_button_for_user()` меняет текст кнопки под статус:
- Нет теста → "🚀 Открыть CareerCheck"
- Тест в процессе → "▶️ Продолжить тест"
- Тест пройден → "🚀 Открыть CareerCheck"

---

## 7. REST API (webapp/server.py — FastAPI)

### Эндпоинты

| Метод | Путь | Описание |
|---|---|---|
| GET | `/` | SPA index.html |
| GET | `/api/health` | Healthcheck API |
| GET | `/api/health/bot` | Проверка heartbeat бота (Redis `bot:heartbeat`) |
| POST | `/api/init` | Валидация initData, создание/получение юзера |
| GET | `/api/user/state` | Статус (has_results, has_premium, has_progress) |
| GET | `/api/results/{tg_id}` | Последний результат |
| POST | `/api/results/save` | Сохранение результата из Mini App |
| GET | `/api/professions` | Список профессий (с фильтрацией) |
| GET | `/api/professions/{id}` | Детали профессии |
| POST | `/api/premium/buy` | Инициировать покупку Stars |
| POST | `/api/premium/check` | Проверить статус покупки |
| POST | `/api/chat` | AI чат (скрыт, только для premium) |

### HMAC валидация initData (Telegram 2024+)
```python
# Правильная реализация:
# - parse_qsl декодирует URL-encoded значения
# - из check_string исключается ТОЛЬКО 'hash' (signature включается!)
# - HMAC-SHA256 с ключом HMAC(b"WebAppData", bot_token)
```

---

## 8. Алгоритм расчёта (services/calculator.py + miniapp/src/utils/calculator.js)

### Big Five (OCEAN)
1. 60 вопросов по 12 на каждую черту (некоторые инвертированы)
2. Сырые баллы → нормализация 0–100
3. Черты: O (Openness), C (Conscientiousness), E (Extraversion), A (Agreeableness), S (Stability)

### RIASEC (Holland)
Из нормализованных OCEAN-баллов выводятся 6 типов: R (Realistic), I (Investigative), A (Artistic), S (Social), E (Enterprising), C (Conventional).

### Матчинг профессий
- Евклидово расстояние между профилем пользователя и `required_traits` профессии
- Учитывается `riasec_type` профессии
- Результат: топ-N профессий с `match` в %

---

## 9. Frontend (React SPA)

### Страницы (`miniapp/src/pages/`)
| Файл | Назначение |
|---|---|
| `WelcomePage.jsx` | Стартовый экран |
| `QuizPage.jsx` | Полный тест (60 вопросов) |
| `QuickTestPage.jsx` | Быстрый тест (10 вопросов) |
| `QuickResultsPage.jsx` | Результаты быстрого теста |
| `ResultsPage.jsx` | Полные результаты + RadarChart |
| `MenuPage.jsx` | Главная страница (хаб) |
| `ProfessionsPage.jsx` | Каталог 160+ профессий |
| `ProfessionDetailPage.jsx` | Детали профессии |
| `HistoryPage.jsx` | История тестов |
| `ComparisonPage.jsx` | Сравнение двух результатов |
| `ChallengesPage.jsx` | Ежедневные задания |
| `AIChatPage.jsx` | **СКРЫТ** — AI чат готов, включить: убрать `{null}` в ResultsPage |
| `PremiumPromoPage.jsx` | Промо Premium |
| `SettingsPage.jsx` | Настройки |

### Компоненты (ключевые)
- `BottomNav` — 4 таба: Главная / Тест / История / Профиль
- `RadarChart` — SVG пентагон Big Five
- `DualRadarChart` — сравнение двух профилей
- `ShareCard` — карточка результата для шаринга (LinkedIn скрыт: `{false && ...}` → `{true && ...}`)
- `SplashScreen` — экран загрузки
- `Logo`, `GlassCard`, `NeuralNet`, `StarField`, `AuroraStreak` — UI-компоненты

### Навигация
```jsx
// Кастомный контекст, без react-router
<NavigationContext> — navigate(page, params), history stack
```

### Telegram SDK интеграция (`useTelegram.js`)
```js
// Fullscreen
tg.requestFullscreen()       // manifest.json: display:fullscreen
tg.disableVerticalSwipes()   // убирает свайп-вниз для закрытия
tg.expand()

// Safe area (Sprint 7):
// CSS: --safe-top: env(safe-area-inset-top, 44px)
// JS: Math.max(contentSafeAreaInsets.top, safeAreaInsets.top)
// Паттерн: padding-top: calc(var(--app-top, 0px) + Npx) — на каждом header отдельно
```

### Дизайн-система (Deep Navy)
```css
--color-bg: #0B0E1A        /* Deep Navy фон */
--color-accent: #6C5CE7    /* Фиолетовый акцент */
/* CSS Modules: MenuPage.module.css */
/* Глобальные стили: cards.css, styles.css */
```

---

## 10. Локализация (5 языков)

`locales/` → `ru.py`, `en.py`, `hi.py`, `es.py`, `pt.py`

```python
from locales import get_text, resolve_lang
t = lambda key, **kw: get_text(key, lang, **kw)

# resolve_lang определяет язык из tg.language_code
# Поддерживаемые: ru, en, hi, es, pt (иначе → en)
```

---

## 11. Premium (Telegram Stars)

- Цена: **99 Stars** (~$1), A/B тест: `get_ab_price(user_id)` → 99 или 149
- Оплата через `tg.openInvoice()` (важно: вызывать через 80мс после `setPremiumLoading(false)`)
- После оплаты: генерируется PDF через `services/premium_pdf_generator.py`
- AI-контент: `services/ai_analyst.py` → Claude `claude-sonnet-4-20250514`
- **TODO:** `hasPremium` в `/api/user/state` всегда `false` — нужно читать из таблицы `purchases`

---

## 12. AI-сервисы

### Premium PDF (`services/ai_analyst.py`)
- Модель: `claude-sonnet-4-20250514`
- 6 секций: психологический портрет, карьерное видение 5 лет, 10 лет, роадмап, шаги, резюме
- Circuit breaker: `anthropic_breaker` (3 ошибки → open, 30 сек cooldown)
- Многоязычность: промпты на языке пользователя

### AI Чат (`services/ai_chat.py`) — СКРЫТ
- Модель: `claude-3-5-haiku`
- `ask_career_ai(scores, riasec, lang, message)` → ответ по карьерным вопросам
- Включить: в `ResultsPage.jsx` убрать `{null}` заглушку

---

## 13. Планировщик заданий (`services/challenge_service.py`)

- Запускается в `main.py` как asyncio-таск
- Каждый день в 9:00 (UTC) рассылает карьерное задание подписчикам
- 30 уникальных заданий на основе Big Five профиля
- Хранит прогресс в `challenge_subscriptions.last_sent_day`

---

## 14. Реферальная программа

- Deep link: `t.me/CareerCheck_Bot?start=ref_{tg_id}`
- При регистрации по ссылке → реферер получает уведомление
- Когда реферал пройдёт тест → реферер получает скидку 50% на Premium
- Таблица `referrals`
- TODO: автоматическое начисление скидки не реализовано полностью

---

## 15. Критические паттерны и баги

### Паттерны которые НЕЛЬЗЯ нарушать
```
❌ display:contents + CSS animation = чёрный экран. НИКОГДА не использовать.
❌ useMemo — переменная должна быть объявлена ДО useMemo (TDZ — Temporal Dead Zone).
❌ После git pull — НЕ забыть docker compose build --no-cache.
```

### Правильные паттерны
```
✅ tg.openInvoice() — только через 80мс после setPremiumLoading(false)
✅ RedisStorage aiogram 3: key_builder=DefaultKeyBuilder(prefix="fsm")
✅ HMAC 2024+: signature включается в check_string, исключается ТОЛЬКО hash
✅ Safe area: padding-top: calc(var(--app-top, 0px) + Npx) на каждом header отдельно
✅ useMemo: declare variable first, then useMemo
```

---

## 16. ENV переменные (.env.example)

```env
BOT_TOKEN=           # Telegram bot token
ANTHROPIC_API_KEY=   # Claude API key
DOMAIN=careercheck.app
DATABASE_URL=postgresql://...
REDIS_HOST=redis
REDIS_PORT=6379
ADMIN_IDS=123456789  # Через запятую
ALLOWED_ORIGINS=https://careercheck.app
```

---

## 17. TODO / Незавершённое

| Задача | Приоритет | Файл |
|---|---|---|
| hasPremium из таблицы purchases | HIGH | `webapp/server.py` `/api/user/state` |
| Inline mode активировать в BotFather | MEDIUM | BotFather → /setinline |
| Alembic stamp head на prod БД | HIGH | `alembic/` |
| AI чат включить в UI | LOW | `ResultsPage.jsx` убрать `{null}` |
| LinkedIn карточка включить | LOW | `ShareCard.jsx` `{false&&...}` → `{true&&...}` |
| GitHub Actions CI/CD доработать | MEDIUM | `.github/workflows/deploy.yml` |
| Реферальная скидка автоматически | MEDIUM | `db/database.py` + `webapp/server.py` |

---

## 18. Скрытые фичи (код готов, UI скрыт)

1. **AI Чат** — `AIChatPage.jsx` готов. В `ResultsPage.jsx` найти `{null}` заглушку на кнопку и убрать её.
2. **LinkedIn карточка** — `ShareCard.jsx`, найти `{false && <LinkedInCard...>}` → `{true && ...}`
3. **Inline mode** — код в `handlers.py` есть (`inline_share_result`), нужно активировать в BotFather.

---

## 19. Деплой

```bash
# На сервере (VPS 31.76.18.54):
git pull
docker compose build --no-cache
docker compose up -d

# Логи:
docker compose logs -f bot
docker compose logs -f webapp

# Проверка:
curl https://careercheck.app/api/health
curl https://careercheck.app/api/health/bot
```

---

## 20. Heartbeat & мониторинг

- `main.py` каждые 30 сек пишет timestamp в Redis: `bot:heartbeat`
- `/api/health/bot` проверяет: если timestamp старше 90 сек → бот упал
- Можно настроить внешний мониторинг (UptimeRobot и т.п.) на `GET /api/health`
