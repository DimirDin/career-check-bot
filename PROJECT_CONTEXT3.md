# CareerCheck — Полный технический контекст проекта
> **Версия:** 6.0 · **Дата обновления:** 2026-06-06
> Единый источник правды для AI-ассистентов и разработчиков.
> **Секреты не указаны** — токены, пароли, API-ключи хранятся в `.env` на сервере.
> Предыдущие версии: `PROJECT_CONTEXT.md` (скомпрометирован — содержал токен, удалён), `PROJECT_CONTEXT2.md`. Оба в `.gitignore`.

---

## 1. ЧТО ЭТО

**CareerCheck** — Telegram Mini App + Telegram Bot для карьерного психологического тестирования на базе научной модели **Big Five (OCEAN)**.

### Продукт
- **60 вопросов** по модели Big Five (12 вопросов × 5 черт личности)
- Пользователь получает: профиль Big Five, RIASEC-тип, топ профессий с % совпадения
- **Бесплатно**: результаты теста, карточка результата (PNG для шаринга), история прохождений, каталог 160 профессий
- **Платно (99 Telegram Stars ≈ $1)**: Premium PDF — 6 страниц персонального AI-анализа (Claude Sonnet 4)
- **Быстрый тест**: 10 вопросов (2 минуты, lead magnet, превью с размытым радаром + CTA на полный тест)

### Два входа в продукт
1. **Telegram Bot** `@CareerCheck_Bot` — обработка платежей Stars, deep links, ежедневные челленджи, fallback для пользователей без Mini App
2. **Telegram Mini App** `https://careercheck.app` — основной интерфейс (React SPA внутри Telegram WebApp)

### Целевые рынки
Мультиязычность: **ru / en / hi / es / pt**

---

## 2. СТЕК ТЕХНОЛОГИЙ

### Backend (Python)
| Библиотека | Версия | Назначение |
|---|---|---|
| aiogram | >=3.4.0 | Telegram Bot Framework (asyncio) |
| asyncpg | >=0.29.0 | Async PostgreSQL драйвер |
| FastAPI | >=0.111.0 | REST API для Mini App |
| uvicorn[standard] | >=0.30.0 | ASGI сервер |
| anthropic | >=0.35.0 | Claude API SDK (Premium PDF + AI-чат консультант) |
| httpx | >=0.27.0 | HTTP-клиент (Telegram Bot API для createInvoiceLink) |
| reportlab | >=4.0.0 | Генерация Premium PDF (6 страниц, Aurora тема) |
| matplotlib | >=3.8.0 | Графики в PDF |
| numpy | >=1.26.0 | Алгоритм матчинга профессий |
| redis | >=5.0.0 | Rate limiting, кэш вопросов, PDF-хранение, аналитика, AI-квота |
| aioredis | >=2.0.0 | Async Redis клиент (для rate_limit middleware) |
| tenacity | >=8.2.0 | Retry-логика для внешних API |
| alembic | >=1.13.0 | Миграции БД |
| psycopg2-binary | >=2.9.0 | Синхронный PostgreSQL драйвер (для Alembic) |
| structlog | >=24.0.0 | Структурированное логирование (JSON в production, ConsoleRenderer в dev) |
| python-dotenv | >=1.0.0 | Загрузка .env |
| pypdf | >=4.0.0 | Работа с PDF |

### Frontend (JavaScript/React)
| Технология | Версия | Назначение |
|---|---|---|
| React | ^18.3.1 | UI фреймворк |
| Vite | ^5.4.1 | Сборщик (output: `webapp/dist/`) |
| Telegram WebApp JS API | — | Интеграция с Telegram (initData, openInvoice, haptic, BackButton, MainButton) |
| CSS Modules | — | Стили MenuPage (`MenuPage.module.css`) |
| Обычный CSS | — | Стили всех остальных страниц (`styles.css`) |
| Canvas 2D API | — | Карточка результата (ShareCard), LinkedIn-карточка 1200×627 |

> **Критически важно**: в проекте НЕТ react-router-dom, styled-components, Tailwind, Framer Motion, Chart.js.
> Навигация — кастомный `NavigationContext`. Радар-чарт — чистый SVG без зависимостей. Canvas карточки — нативный Canvas 2D API.

---

## 3. РЕПОЗИТОРИЙ И ДЕПЛОЙ

- **GitHub**: `https://github.com/DimirDin/career-check-bot`
- **Ветка**: `main`
- **Деплой**: push в main → на сервере `git pull` + `docker compose build --no-cache` + `docker compose up -d`
- **Домен**: `careercheck.app`
- **Mini App URL**: `https://careercheck.app`
- **Сервер**: `31.76.18.54`, root, пароль в `.env`

### Деплой пошагово
```bash
# Локально (если менялся фронтенд):
cd miniapp && npm run build && cd ..
git add -A && git commit -m "..." && git push origin main

# На сервере:
cd /opt/careercheck
git pull origin main
docker compose build --no-cache webapp   # или bot, или оба
docker compose up -d webapp bot

# Проверить:
curl -s https://careercheck.app/api/health
docker compose ps
```

> **Важно**: просто `git pull` недостаточно — `webapp/dist/` встроен в Docker-образ на этапе сборки. Без `build --no-cache` изменения фронтенда не применяются.

---

## 4. ПОЛНАЯ ФАЙЛОВАЯ СТРУКТУРА

```
career-check-bot/
│
├── main.py                        # Точка входа бота.
│                                  # Создаёт DB pool, Redis, запускает heartbeat,
│                                  # challenge_scheduler, RateLimitMiddleware, polling.
│                                  # При старте: set_my_commands (4 команды),
│                                  # set_chat_menu_button (MenuButtonWebApp "CareerCheck"),
│                                  # set_my_description, set_my_short_description.
│
├── bot/
│   ├── handlers.py                # Все хендлеры бота (~950 строк):
│   │                              # /start → при каждом вызове set_chat_menu_button per-chat
│   │                              #   + новый текст: новым — Big Five pitch,
│   │                              #                  returning — топ профессия + match%
│   │                              # /refer → реферальная ссылка
│   │                              # /challenges → подписка на ежедневные задания
│   │                              # /stop_challenges → отписка
│   │                              # /help → справка
│   │                              # /stats (ADMIN_IDS) → статистика
│   │                              # inline_query → карточка Big Five профиля
│   │                              # update_menu_button_for_user() — динамическая кнопка
│   │                              #   по статусу: "▶️ Продолжить" / "📊 Результаты" / "🚀 Начать"
│   └── premium_handlers.py        # Оплата Stars + вызов update_menu_button_for_user после оплаты
│
├── miniapp/
│   ├── index.html                 # viewport-fit=cover, apple-mobile-web-app-capable,
│   │                              # apple-mobile-web-app-status-bar-style: black-translucent
│   │                              # manifest.json link, favicon, apple-touch-icon
│   ├── public/
│   │   ├── manifest.json          # display: fullscreen, theme #6C5CE7
│   │   └── icons/
│   │       ├── logo.svg           # SVG пятиугольник-радар, градиент #6C5CE7 → #0984E3
│   │       ├── icon-64.png        # Сгенерирован через Pillow
│   │       └── icon-512.png       # Сгенерирован через Pillow
│   └── src/
│       ├── App.jsx                # Корневой компонент. SCREEN enum + renderScreen().
│       │                          # Корневой div: paddingBottom: --bottom-nav-total
│       │                          # (без paddingTop — каждый page-header сам отступает через --app-top)
│       │                          # BottomNav показывается на всех экранах кроме:
│       │                          #   SPLASH, LOADING, QUIZ, QUICK_TEST, ONBOARDING
│       ├── styles.css             # Глобальные стили. Ключевые переменные в :root:
│       │                          #   --safe-top: env(safe-area-inset-top, 44px)  ← fallback 44px!
│       │                          #   --tg-header-h: 0px  (обновляется из JS)
│       │                          #   --app-top: calc(--tg-header-h + --safe-top)
│       │                          #   --bottom-nav-height: 64px
│       │                          #   --bottom-nav-total: calc(64px + safe-bottom)
│       │                          # html/body/#root background: #0B0E1A !important
│       │                          # Page headers: padding-top: calc(var(--app-top, 0px) + Npx)
│       │                          #   .profs-header  → +16px
│       │                          #   .history-header → +20px
│       │                          #   .settings-header → +20px
│       │                          #   .results-hero   → +32px
│       │                          #   .quiz-header    → +12px
│       │                          #   .quick-header   → +10px
│       │
│       ├── hooks/
│       │   └── useTelegram.js     # При монтировании:
│       │                          #   tg.ready() + requestFullscreen() (fallback: expand())
│       │                          #   disableVerticalSwipes()
│       │                          #   setHeaderColor('#0B0E1A') + setBackgroundColor('#0B0E1A')
│       │                          #   applyInsets(): Math.max(contentSafeAreaInsets.top,
│       │                          #     safeAreaInsets.top) → --tg-header-h (только если > 0)
│       │                          #   Слушает: safeAreaChanged, contentSafeAreaChanged, themeChanged
│       │
│       ├── components/
│       │   ├── BottomNav/         # 4 таба: Главная / Тест / История / Профиль
│       │   │   ├── BottomNav.jsx  # SVG иконки, active state #6C5CE7, glassmorphism фон
│       │   │   └── BottomNav.css  # fixed bottom, backdrop-blur(20px), --bottom-nav-total height
│       │   ├── Logo/
│       │   │   └── Logo.jsx       # SVG пятиугольник, variant='icon'|'full'
│       │   ├── SplashScreen.jsx   # 1.8s, Mercury анимация, пульсирующие точки (фиол/синий/бирюз)
│       │   └── [остальные без изменений]
│       │
│       ├── pages/
│       │   └── ProfessionsPage.jsx # fetch с async/await:
│       │                           #   403 → setProfessions([]), return
│       │                           #   finally: setLoading(false) гарантировано
│       │                           #   дедупликация по id через Set
│       │
│       └── styles/
│           ├── MenuPage.module.css  # .safeAreaTop { height: var(--app-top, 12px) }
│           └── cards.css            # .card, .card-glass, .card-accent, .btn-primary, .btn-secondary
│
├── scripts/
│   └── generate_icons.py          # cairosvg → Pillow fallback для генерации PNG иконок
│
└── [остальная структура без изменений — см. PROJECT_CONTEXT2.md]
```

---

## 5. DEEP NAVY DESIGN SYSTEM (добавлен в Sprint 7)

### CSS переменные (в `styles.css :root`)
```css
/* Deep Navy палитра */
--bg-primary:   #0B0E1A;   /* основной фон */
--bg-secondary: #131728;   /* карточки */
--bg-tertiary:  #1C2138;   /* приподнятые элементы */

/* Акценты */
--accent-primary:   #6C5CE7;   /* основной фиолетовый */
--accent-secondary: #0984E3;   /* синий */
--accent-success:   #00CEC9;   /* бирюзовый */
--accent-warning:   #FDCB6E;
--accent-danger:    #E17055;

/* Градиенты */
--gradient-accent:  linear-gradient(135deg, #6C5CE7 0%, #0984E3 100%);
--gradient-success: linear-gradient(135deg, #00CEC9 0%, #0984E3 100%);

/* Safe area */
--safe-top:    env(safe-area-inset-top, 44px);   /* fallback 44px для iPhone fullscreen */
--safe-bottom: env(safe-area-inset-bottom, 0px);
--tg-header-h: 0px;                              /* JS обновляет если > 0 */
--app-top:     calc(var(--tg-header-h) + var(--safe-top));

/* Bottom nav */
--bottom-nav-height: 64px;
--bottom-nav-total:  calc(64px + var(--safe-area-bottom));
```

### Принципы
- Фон везде `#0B0E1A` — задан через `html/body/#root { background: #0B0E1A !important }`
- Кнопки — градиентные pill (border-radius: 50px)
- Карточки — `background: rgba(19,23,40,0.8)`, `backdrop-filter: blur(20px)`, `border: 1px solid rgba(255,255,255,0.08)`
- Анимации только на `transform` и `opacity` (GPU-accelerated)
- Bottom Navigation заменяет `tg.MainButton` на главной

---

## 6. BOTTOM NAVIGATION (новое в Sprint 7)

```
components/BottomNav/BottomNav.jsx
components/BottomNav/BottomNav.css
```

**4 таба:**
| Таб | Иконка | Маршрут |
|-----|--------|---------|
| Главная | 🏠 SVG дом | `/menu` |
| Тест | ⬠ SVG пятиугольник | `/quick-test` |
| История | 🕐 SVG часы | `/history` |
| Профиль | 👤 SVG человек | `/settings` |

**Логика:** активный таб определяется по `current` из `NavigationContext`. Скрыт на SPLASH, LOADING, QUIZ, QUICK_TEST, ONBOARDING.

**`tg.MainButton` убран с главной страницы** — дублировал UI-кнопки.

---

## 7. INLINE MODE (новое в Sprint 7)

Хендлер в `bot/handlers.py`:
- Пользователь пишет `@CareerCheck_Bot` в любом чате
- Если есть результаты — показывает Big Five карточку с топ-3 профессиями
- Если нет — предлагает пройти тест
- Кнопка "Пройти тест" → deep link в бота

**Активация**: BotFather → `/setinline` → `@CareerCheck_Bot` → placeholder "Поделиться результатом..."

---

## 8. ДИНАМИЧЕСКАЯ КНОПКА МЕНЮ (новое в Sprint 7)

Функция `update_menu_button_for_user(bot, user_id, pool)` в `handlers.py`:

| Состояние | Текст кнопки |
|-----------|-------------|
| Нет теста | `🚀 Начать тест` |
| Тест в процессе | `▶️ Продолжить тест` |
| Тест пройден | `📊 Мои результаты` |

Вызывается при: `/start`, `successful_payment`.

---

## 9. SAFE AREA — ПОЛНОЕ ОПИСАНИЕ РЕШЕНИЯ

### Проблема
Telegram Mini App в fullscreen режиме: контент уходит под "Back"/"Close" шапку.

### Решение (три уровня)

**Уровень 1 — CSS fallback:**
```css
--safe-top: env(safe-area-inset-top, 44px);  /* 44px если env() недоступен */
--tg-header-h: 0px;
--app-top: calc(var(--tg-header-h) + var(--safe-top));
```

**Уровень 2 — JS обновление (useTelegram.js):**
```javascript
const applyInsets = () => {
  const top = Math.max(
    tg.contentSafeAreaInsets?.top ?? 0,
    tg.safeAreaInsets?.top ?? 0
  )
  if (top > 0) {  // ← не перезаписываем нулём!
    document.documentElement.style.setProperty('--tg-header-h', top + 'px')
  }
}
applyInsets()
tg.onEvent('safeAreaChanged', applyInsets)
tg.onEvent('contentSafeAreaChanged', applyInsets)
```

**Уровень 3 — Отступы на каждом page header:**
```css
.profs-header   { padding-top: calc(var(--app-top, 0px) + 16px); }
.history-header { padding-top: calc(var(--app-top, 0px) + 20px); }
.settings-header { padding-top: calc(var(--app-top, 0px) + 20px); }
.results-hero   { padding-top: calc(var(--app-top, 0px) + 32px); }
.quiz-header    { padding-top: calc(var(--app-top, 0px) + 12px); }
.quick-header   { padding-top: calc(var(--app-top, 0px) + 10px); }
```

**MenuPage** использует `<div className={styles.safeAreaTop} />` с `height: var(--app-top, 12px)`.

### Известные особенности
- `env(safe-area-inset-top)` в fullscreen mode может возвращать 0
- `contentSafeAreaInsets` доступен только в Telegram 7.8+
- При `top = 0` — fallback 44px из CSS гарантирует минимальный отступ

---

## 10. ИЗВЕСТНЫЕ ОСОБЕННОСТИ И РЕШЕНИЯ (обновлено)

| Ситуация | Решение |
|----------|---------|
| Safe area в fullscreen | `--safe-top: env(safe-area-inset-top, 44px)` + JS обновление `--tg-header-h` через `contentSafeAreaInsets` |
| `tg.MainButton` дублировал кнопки | Убран с `MenuPage`, заменён на `BottomNav` |
| Дубли профессий в каталоге | Дедупликация по `p.id` через `Set` в `ProfessionsPage.jsx` |
| 403 при открытии профессий вне Telegram | `if (res.status === 403) { setProfessions([]); return }` + `finally { setLoading(false) }` |
| Кнопка OPEN в списке чатов | Недоступна — это Telegram Attachment Menu, только для партнёров. `set_chat_menu_button` создаёт кнопку ВНУТРИ чата |
| `display:contents` + CSS-анимации | Никогда не использовать — `opacity:0` зависнет навсегда (чёрный экран) |
| `tg.openInvoice()` порядок | Вызывать ПОСЛЕ `setPremiumLoading(false)` + 80ms задержки |
| `useMemo` порядок хуков | Должен идти ПОСЛЕ объявления всех переменных (TDZ) |
| Docker и git pull | После `git pull` обязателен `docker compose build --no-cache` |
| HMAC Mini App (Telegram 2024+) | `signature` включается в check_string; исключается только `hash` |
| assets/ в .gitignore | `*.png` файлы приветствия нужно копировать через `scp` вручную |
| PROJECT_CONTEXT.md | Удалён (содержал токен). `PROJECT_CONTEXT2.md` и `PROJECT_CONTEXT3.md` в `.gitignore` |

---

## 11. API ЭНДПОИНТЫ (без изменений, см. PROJECT_CONTEXT2.md раздел 9)

Добавленные в Sprint 7: нет новых эндпоинтов. Все существующие сохранены.

---

## 12. ИСТОРИЯ РАЗРАБОТКИ

| Фаза | Что сделано |
|------|-------------|
| **Спринты 1–6** | См. `PROJECT_CONTEXT2.md` раздел 19 |
| **Sprint 7 — Фаза 1** | manifest.json (display:fullscreen), SVG логотип, PNG иконки 64/512, index.html мета, `set_my_commands` (4 команды), обновлены описания бота |
| **Sprint 7 — Фаза 2** | `requestFullscreen()` + `disableVerticalSwipes()`, safe area CSS переменные, `BottomNav` компонент (4 таба, SVG иконки, glassmorphism), интеграция в App.jsx |
| **Sprint 7 — Фаза 3** | Deep Navy дизайн-система (#0B0E1A, #6C5CE7), `cards.css`, редизайн MenuPage (pill кнопки, тёмные карточки), SplashScreen 1.8s + pulse dots, `Logo.jsx` компонент |
| **Sprint 7 — Фаза 4** | Inline mode хендлер, `update_menu_button_for_user()`, новый текст `/start` (разный для new/returning) |
| **Sprint 7 — Фиксы** | Safe area многоуровневый фикс, убран `tg.MainButton` с главной, дедупликация профессий, 403 guard в ProfessionsPage, `setHeaderColor/setBackgroundColor('#0B0E1A')` |

---

## 13. ДЕПЛОЙ И ИНФРАСТРУКТУРА (без изменений)

```
IP:           31.76.18.54
OS:           Ubuntu 22.04.5 LTS
Пользователь: root
```

```bash
# SSH
ssh root@31.76.18.54

# Полный деплой (фронт + бот)
cd /opt/careercheck
git pull origin main
docker compose build --no-cache webapp bot
docker compose up -d webapp bot

# Только фронт
docker compose build --no-cache webapp && docker compose up -d webapp

# Только бот
docker compose build --no-cache bot && docker compose up -d bot

# Логи
docker logs -f careercheck-bot-1
docker logs careercheck-webapp-1 --tail=100

# Проверка
curl -s https://careercheck.app/api/health
curl -s https://careercheck.app/api/health/bot
docker compose ps
```

---

## 14. TODO И ПЛАНЫ

### Скрытые функции (код готов, UI скрыт)
- [ ] **AI-чат консультант** — `AIChatPage.jsx` готов, на `ResultsPage.jsx` заменить `{null}` на кнопку
- [ ] **LinkedIn карточка** — `drawLinkedInCard()` в `ShareCard.jsx`, заменить `{false && ...}` на `{true && ...}`

### Технические долги
- [ ] **Alembic stamp** на продакшн БД
- [ ] **Webhook** вместо polling (при >1000 пользователей/день)
- [ ] **GitHub Actions CI/CD**
- [ ] `hasPremium` в `/api/user/state` — всегда `false`, не читает из `purchases`
- [ ] `inline mode` — активировать через BotFather: `/setinline` → placeholder "Поделиться результатом..."

### Продуктовые планы
- [ ] **История с графиком** sparklines
- [ ] **B2B командный профиль**
- [ ] **Ежеквартальный micro-тест**
- [ ] **Push-уведомления** через бот — напомнить о незавершённом тесте
