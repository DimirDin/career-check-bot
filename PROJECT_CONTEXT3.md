# CareerCheck — Полный технический контекст проекта
> **Версия:** 8.0 · **Дата обновления:** 2026-06-06
> Единый источник правды для AI-ассистентов и разработчиков.
> **Секреты не указаны** — токены, пароли, API-ключи хранятся в `.env` на сервере и в GitHub Secrets.
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
| Canvas 2D API | — | Карточка результата (ShareCard), LinkedIn-карточка 1200×627 |
| Google Fonts — Syne 800 | — | Шрифт SplashScreen и заголовков Aurora V2 |

> **Критически важно**: в проекте НЕТ react-router-dom, styled-components, Tailwind, Framer Motion, Chart.js.
> Навигация — кастомный `NavigationContext`. Радар-чарт — чистый SVG без зависимостей. Canvas карточки — нативный Canvas 2D API.

---

## 3. РЕПОЗИТОРИЙ И ДЕПЛОЙ

- **GitHub**: `https://github.com/DimirDin/career-check-bot`
- **Ветка разработки**: `main` (прямой деплой)
- **Деплой**: **автоматический** — push/merge в `main` → GitHub Actions → SSH на VPS → docker compose build --no-cache + up
- **Домен**: `careercheck.app`
- **Mini App URL**: `https://careercheck.app`
- **Сервер**: `31.76.18.54` (Ubuntu 22.04.5 LTS), пользователь: root

### GitHub Actions CI/CD (настроен, работает)

Файл: `.github/workflows/deploy.yml`

```yaml
name: Deploy to VPS
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          password: ${{ secrets.VPS_PASSWORD }}
          command_timeout: 10m
          script: |
            set -e
            cd /opt/careercheck
            git pull origin main
            docker compose build --no-cache webapp bot
            docker compose up -d webapp bot
            curl -sf https://careercheck.app/api/health && echo "Health check OK"
```

**GitHub Secrets** (Settings → Secrets → Actions):
- `VPS_HOST` — IP-адрес сервера
- `VPS_USER` — пользователь (root)
- `VPS_PASSWORD` — пароль

### Деплой вручную (если нужно без GitHub Actions)
```bash
ssh root@<VPS_IP>
cd /opt/careercheck
git pull origin main
docker compose build --no-cache webapp bot
docker compose up -d webapp bot

# Проверка:
curl -s https://careercheck.app/api/health
docker compose ps
```

> **Важно**: просто `git pull` недостаточно — `webapp/dist/` встроен в Docker-образ на этапе сборки.
> Без `build --no-cache` изменения фронтенда НЕ применяются.

---

## 4. КАК РАБОТАТЬ (WORKFLOW)

### С MacBook (стандартная схема)
```bash
# 1. Клонировать репо (один раз)
git clone https://github.com/DimirDin/career-check-bot.git
cd career-check-bot

# 2. Работать с кодом локально
# Если правишь фронтенд — можно проверить:
cd miniapp && npm install && npm run dev  # localhost:5173
cd ..

# 3. Коммитить и пушить
git add -A
git commit -m "feat: описание изменений"
git push origin main

# 4. GitHub Actions автоматически задеплоит на VPS (~2-3 минуты)
# Следить за деплоем: github.com/DimirDin/career-check-bot/actions
```

### С телефона / без MacBook (через Claude Code на claude.ai/code)
```
1. Открыть claude.ai/code или использовать GitHub → Claude agent
2. Описать задачу — Claude сам редактирует файлы, коммитит, пушит
3. После пуша в main → GitHub Actions автоматически деплоит
4. Claude создаёт PR на ветку claude/... → мержит через GitHub MCP
```

### С любого устройства — прямое SSH (для экстренных правок)
```bash
ssh root@<VPS_IP>
cd /opt/careercheck

# Посмотреть логи:
docker logs -f careercheck-bot-1
docker logs careercheck-webapp-1 --tail=100

# Проверить статус:
docker compose ps
curl -s https://careercheck.app/api/health
```

---

## 5. ПОЛНАЯ ФАЙЛОВАЯ СТРУКТУРА

```
career-check-bot/
│
├── .github/workflows/deploy.yml   # GitHub Actions CI/CD (автодеплой при пуше в main)
│
├── main.py                        # Точка входа бота
│
├── bot/
│   ├── handlers.py                # Все хендлеры бота (~950 строк)
│   └── premium_handlers.py        # Оплата Stars + update_menu_button_for_user
│
├── miniapp/
│   ├── index.html                 # viewport-fit=cover, Syne font, fullscreen meta
│   ├── public/
│   │   ├── manifest.json          # display: fullscreen, theme #6C5CE7
│   │   ├── icons/
│   │   │   ├── logo.svg
│   │   │   ├── icon-64.png
│   │   │   └── icon-512.png
│   │   └── webh/                  # Aurora V2 иконки (WebP с прозрачностью)
│   │       ├── hero_logo.webp     # Фиолетовая сфера с мозгом (hero)
│   │       ├── ic_ai_chat.webp    # ИИ-Эксперт
│   │       ├── ic_catalog.webp    # Каталог профессий
│   │       ├── ic_challenges.webp # Челленджи
│   │       └── ic_compat.webp     # Сравнение профилей
│   └── src/
│       ├── App.jsx                # Корневой компонент. SCREEN enum, renderScreen(), StarField, AuroraStreak
│       ├── styles.css             # Глобальные стили, Aurora V2 CSS переменные
│       ├── hooks/
│       │   ├── useTelegram.js     # requestFullscreen, safeArea, insets
│       │   └── useAnalytics.js    # track()
│       ├── context/
│       │   └── NavigationContext.jsx  # Кастомный роутер (navigate, useLocation)
│       ├── components/
│       │   ├── BottomNav/         # 4 таба: Главная / Тест / История / Профиль
│       │   ├── SplashScreen.jsx   # 3.8s: morphing logo + typewriter "CareerCheck"
│       │   ├── StarField.jsx      # 55 анимированных звёзд (canvas, z-index 0)
│       │   ├── AuroraStreak.jsx   # Вспышка-переход при навигации (400ms)
│       │   ├── Skeleton.jsx       # QuizLoadingSkeleton, ResultsLoadingSkeleton
│       │   ├── MilestoneCard.jsx  # Карточка на вопросах 20 и 40
│       │   └── PentagonProgress.jsx # SVG прогресс-пятиугольник + canvas trails
│       └── pages/
│           ├── MenuPage.jsx       # Aurora V2 главная
│           ├── QuizPage.jsx       # 60 вопросов, прогресс, milestone cards
│           ├── QuickTestPage.jsx  # 10 вопросов, быстрый тест
│           ├── ResultsPage.jsx    # Результаты, табы, trait bars, RadarChart
│           ├── HistoryPage.jsx    # История прохождений
│           ├── AIChatPage.jsx     # AI-консультант (3 бесплатных вопроса)
│           ├── SettingsPage.jsx   # Настройки, челленджи
│           ├── ProfessionsPage.jsx # Каталог профессий с фильтрами
│           ├── ProfessionDetailPage.jsx
│           ├── ComparisonPage.jsx # Сравнение профилей по hash
│           ├── PremiumPromoPage.jsx
│           ├── WelcomePage.jsx
│           └── QuickResultsPage.jsx
│
├── webapp/
│   └── server.py                  # FastAPI: REST API + статика
│                                  # Монтирует: /assets, /webh, /icons → StaticFiles
│                                  # SPA fallback для всех остальных роутов
│
├── config/settings.py             # os.getenv() для всех секретов
├── Dockerfile                     # Stage 1: node:20 build; Stage 2: python:3.12
├── docker-compose.yml             # Сервисы: webapp, bot, db, redis
├── requirements.txt
└── .env.example
```

---

## 6. AURORA V2 — ДИЗАЙН-СИСТЕМА (Sprint 8+)

Aurora V2 применена на **всех страницах** приложения, не только на главной.

### Дизайн-токены (CSS `:root` в `styles.css`)
```css
/* Aurora V2 — основные */
--bg-primary:   #05050b;       /* void-тёмный фон */
--bg-secondary: #0c0c1e;
--bg-tertiary:  #13132a;

--accent-primary:   #7c3aed;   /* фиолетовый */
--accent-secondary: #06b6d4;   /* голубой/cyan */
--accent-success:   #22d3a5;

--gradient-accent: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);

--text-primary:   #f0eeff;
--text-secondary: #9b97c0;
--text-muted:     #5a5878;

--glass-bg:     rgba(13,13,26,0.65);
--glass-border: rgba(124,58,237,0.18);
--glass-blur:   blur(24px);

--border-subtle: rgba(124,58,237,0.15);
--border-medium: rgba(124,58,237,0.25);

--shadow-card:  0 4px 24px rgba(0,0,0,0.4);
--shadow-glow:  0 0 40px rgba(124,58,237,0.2);

/* Навигация */
--bottom-nav-height: 64px;
--bottom-nav-total:  calc(64px + var(--safe-area-bottom));

/* Высота шапки */
--header-h: 68px;   /* используется для spacer-ов */
```

### Стиль карточек (применён везде)
```css
/* .section-card, .score-btn, .settings-section, .history-entry-card, .profs-card и др. */
background: rgba(13,13,26,0.65);
border: 1px solid rgba(124,58,237,0.18);
backdrop-filter: blur(24px);
box-shadow: inset 0 0 14px rgba(6,182,212,0.08), 0 4px 24px rgba(0,0,0,0.4);
```

### Глобальный фон
```css
html, body { background: #05050b; }
/* App.jsx wrapper: */
background: linear-gradient(160deg, #05050b 0%, #0c0c1e 60%, #08081a 100%)
```

### MenuPage — компоненты Aurora V2
| Компонент | Описание |
|-----------|---------|
| `HeaderProfile` | Фиксированная шапка: аватар с инициалами, имя, "ПРОФИЛЬ АКТИВЕН" |
| `HeroCard` | Карточка: RadarChart (если тест пройден) или кнопка "Начать тест" + hero logo |
| `RadarChart` | Чистый SVG, 5 осей Big Five, gradientFill |
| `QuickActionsGrid` | Сетка 2×2: Каталог, ИИ-Эксперт, Челленджи, Сравнение |

### Маршруты Quick Actions
```
catalog      → /professions
ai           → /ai-chat
challenges   → /challenges  (coming soon)
compat       → /comparison
```

### Анимации (CSS keyframes, инжектируются один раз через `injectCSS()`)
- `heartbeat` — пульс кнопки "Начать тест"
- `breathe` — плавное свечение hero logo
- `aurora-fadeInUp` — появление карточек
- `aurora-ctaGlow` — пульсирующая подсветка CTA
- `aurora-navPulse` / `aurora-onlinePulse` — индикатор онлайн

---

## 7. SPLASH SCREEN (Sprint 8+)

`miniapp/src/components/SplashScreen.jsx` — полностью переписан.

### Таймлайн анимации
```
  0ms  — морфинг логотипа начинается (border-radius 4 keyframe, 3200ms)
300ms  — typewriter начинает печатать "CareerCheck"
         "Career" — белый (#ffffff), "Check" — фиолетовый (#a855f7)
         каждая буква: 110ms
1510ms — typewriter заканчивается (300 + 11×110)
1810ms — курсор исчезает (addClass splash-cursor-hide)
1860ms — подпись "карьерный анализ личности" появляется (opacity 0→1, 500ms)
3800ms — onDone() вызывается → переход на целевой экран
```

### Фикс гонки с initApp
В `App.jsx` `initApp()` больше **не вызывает `setScreen()`** напрямую.
Вместо этого — `targetScreenRef.current`:
```js
const targetScreenRef = useRef(SCREEN.MENU)

// В initApp():
if (startParam.startsWith('compare_')) {
  setCompareHash(...)
  targetScreenRef.current = SCREEN.COMPARISON
} else {
  targetScreenRef.current = SCREEN.MENU
}
// При ошибке:
targetScreenRef.current = SCREEN.ERROR

// SplashScreen:
<SplashScreen onDone={() => setScreen(targetScreenRef.current || SCREEN.MENU)} />
```
Это гарантирует: заставка всегда показывается полные 3.8 секунды.

---

## 8. ДЕКОРАТИВНЫЕ КОМПОНЕНТЫ

### StarField (`components/StarField.jsx`)
- 55 анимированных точек-звёзд на canvas
- `position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.6`
- Каждая: случайная позиция, радиус 0.3–1.5px, opacity пульсирует через `sin()`
- Автоматически ресайзится по окну

### AuroraStreak (`components/AuroraStreak.jsx`)
- Декоративная вспышка-полоса при переходе между экранами
- `active` state включается на 400ms в `navigate()` в App.jsx
- `position: fixed; inset: 0; z-index: 9000; pointer-events: none`

---

## 9. НАВИГАЦИЯ И ЭКРАНЫ

### SCREEN enum (App.jsx)
```js
const SCREEN = {
  SPLASH, LOADING, MENU, WELCOME, ONBOARDING,
  QUIZ, SAVING, RESULTS, HISTORY,
  QUICK_TEST, QUICK_RESULTS, COMPARISON,
  AI_CHAT, SETTINGS, PROFESSIONS, PROF_DETAIL,
  COMING_SOON, PREMIUM_PROMO, ERROR
}
```

### ROUTE_MAP (App.jsx)
```js
'/menu'        → SCREEN.MENU
'/test'        → SCREEN.QUIZ
'/results'     → SCREEN.RESULTS
'/welcome'     → SCREEN.WELCOME
'/premium'     → SCREEN.PREMIUM_PROMO
'/history'     → SCREEN.HISTORY
'/ai-chat'     → SCREEN.AI_CHAT
'/settings'    → SCREEN.SETTINGS
'/professions' → SCREEN.PROFESSIONS
'/support'     → SCREEN.COMING_SOON
```

### BottomNav — табы и активная вкладка
```
home     → "Главная" → /menu
test     → "Тест"    → /quick-test
history  → "История" → /history
profile  → "Профиль" → /settings
```

`resolveActiveTab(current)` логика:
- `/menu`, `/` → `home`
- `/quick-test`, `/test`, `/results`, `/quiz` → `test`
- `/history` → `history`
- `/settings`, `/profile` → `profile`
- default → `home`

> **Важно**: `/ai-chat` не входит ни в один таб → BottomNav показывается, активного нет.
> Кнопка "Назад" в AIChatPage ведёт на `/menu` (не `/results`), чтобы не активировался таб "Тест".

---

## 10. ШАПКИ СТРАНИЦ (ЕДИНЫЙ СТАНДАРТ)

Все шапки приведены к одинаковой высоте как у главной страницы (MenuPage `HeaderProfile`).

### Формула высоты
```
Главная: padding(10 + safe-area) + avatar(36px) + padding-bottom(12px) = 58px + safe-area
Остальные: padding(10 + safe-area) + title(18px) + padding-bottom(30px) = 58px + safe-area
```

### CSS паттерн (history, profs, settings, chat)
```css
.{page}-header {
  position: fixed;
  top: 0; left: 0; right: 0; z-index: 100;
  background: rgba(5,5,11,0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(124,58,237,0.14);
  padding: calc(10px + env(safe-area-inset-top, 0px)) 16px 30px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center;
}
.{page}-header-spacer {
  height: calc(var(--header-h) + env(safe-area-inset-top, 0px));  /* 68px + safe */
  flex-shrink: 0;
}
```

### Quiz / QuickTest шапка
```css
/* 3-колоночный grid: пятиугольник по центру, badge справа */
.quiz-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: calc(10px + env(safe-area-inset-top, 0px)) 20px 10px;
}
/* pentagon size=48 → 10 + 48 + 10 = 68px */
```

### HistoryPage — счётчик
Счётчик ("21 прохождений") вынесен **из шапки** в контент — первый элемент после spacer:
```jsx
<div className="history-header">
  <h2 className="history-title">{T.title}</h2>
</div>
<div className="history-header-spacer" />
<div style={{ padding: '0 16px', ... }}>
  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
    {T.count(results.length)}
  </div>
  ...
```

---

## 11. СТАТИЧЕСКИЕ ФАЙЛЫ — FASTAPI (важно)

`webapp/server.py` монтирует папки из `webapp/dist/` (Vite build output):

```python
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")
    if (DIST / "webh").exists():
        app.mount("/webh", StaticFiles(directory=DIST / "webh"), name="webh")
    if (DIST / "icons").exists():
        app.mount("/icons", StaticFiles(directory=DIST / "icons"), name="icons")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        return FileResponse(DIST / "index.html")
```

> **Критически важно**: если не смонтировать `/webh` явно — все запросы к `/webh/*.webp`
> попадут в SPA-fallback и вернут `index.html` → чёрные квадраты вместо иконок.

### Путь файла от исходника до браузера
```
miniapp/public/webh/*.webp
    → npm run build
    → webapp/dist/webh/
    → docker build (COPY --from=frontend)
    → FastAPI mount /webh → StaticFiles
    → GET /webh/ic_catalog.webp ✅
```

---

## 12. API ЭНДПОИНТЫ

| Метод | Путь | Описание |
|-------|------|---------|
| GET | `/api/health` | Статус сервера |
| GET | `/api/health/bot` | Статус бота |
| POST | `/api/validate` | Валидация Telegram initData |
| GET | `/api/questions?lang=ru` | 60 вопросов теста |
| POST | `/api/results/save` | Сохранить ответы, получить результаты |
| GET | `/api/results/{user_id}` | Последний результат пользователя |
| GET | `/api/history` | История прохождений |
| GET | `/api/quick-test/questions?lang=ru` | 10 вопросов быстрого теста |
| POST | `/api/quick-test/results` | Результаты быстрого теста |
| GET | `/api/professions` | Каталог 160 профессий |
| POST | `/api/chat/ask` | AI-консультант (Claude) |
| GET | `/api/chat/quota` | Остаток бесплатных вопросов |
| GET | `/api/challenges/status` | Статус подписки на челленджи |
| POST | `/api/premium/generate` | Генерация Premium PDF (Claude) |
| GET | `/api/premium/download/{id}` | Скачать PDF |

---

## 13. ИЗВЕСТНЫЕ ОСОБЕННОСТИ И РЕШЕНИЯ

| Ситуация | Решение |
|----------|---------|
| Иконки не видны (чёрные квадраты) | FastAPI должен монтировать `/webh` явно как StaticFiles. Без этого SPA-fallback отдаёт index.html |
| Белый фон на JPEG иконках | Конвертировать в WebP с удалением фона через Pillow |
| git pull не применяет фронт | `webapp/dist/` в Docker-образе → нужен `docker compose build --no-cache` |
| SplashScreen слишком быстрая | `initApp()` не должен вызывать `setScreen()` — только `targetScreenRef.current =`. `setScreen()` вызывается только в `onDone` после 3.8s |
| ИИ-чат → назад попадал в "Тест" | `navigate('/results')` заменён на `navigate('/menu')`. `/results` маппится на таб "Тест" в BottomNav |
| Контент вылезает под шапку | Каждая страница имеет spacer: `height: calc(var(--header-h) + env(safe-area-inset-top, 0px))` |
| display:contents + анимации | Никогда не использовать — opacity:0 зависнет (чёрный экран) |
| tg.openInvoice() порядок | Вызывать ПОСЛЕ setPremiumLoading(false) + 80ms задержки |
| Safe area в fullscreen | CSS: `env(safe-area-inset-top, 0px)` в padding. JS: useTelegram устанавливает `--tg-header-h` |
| 403 при открытии профессий вне Telegram | `if (res.status === 403) { setProfessions([]); return }` + `finally { setLoading(false) }` |
| HMAC Mini App (Telegram 2024+) | `signature` включается в check_string; исключается только `hash` |
| PROJECT_CONTEXT.md | Удалён (содержал токен). PROJECT_CONTEXT2.md в .gitignore |

---

## 14. ИСТОРИЯ РАЗРАБОТКИ

| Фаза | Что сделано |
|------|-------------|
| Спринты 1–6 | Big Five тест, PostgreSQL, Premium PDF, Telegram Stars, ShareCard, каталог профессий |
| Sprint 7 — Фаза 1 | manifest.json (fullscreen), SVG логотип, PNG иконки, set_my_commands |
| Sprint 7 — Фаза 2 | requestFullscreen, safe area CSS, BottomNav компонент |
| Sprint 7 — Фаза 3 | Deep Navy дизайн-система, SplashScreen (первая версия), Logo.jsx |
| Sprint 7 — Фаза 4 | Inline mode, динамическая кнопка меню, новый /start |
| Sprint 7 — Фиксы | Safe area multilayer fix, убран tg.MainButton, дедупликация профессий |
| **Sprint 8 — Фаза 1** | **GitHub Actions CI/CD** (автодеплой push→VPS), **Aurora V2 MenuPage** (glassmorphism, RadarChart SVG), **WebP иконки** с прозрачным фоном, **fix FastAPI /webh/ StaticFiles** |
| **Sprint 8 — Фаза 2** | **SplashScreen v2**: morphing blob logo (3.2s rAF) + typewriter "CareerCheck" (110ms/буква) + подпись + onDone через 3.8s. **Фикс гонки initApp**: targetScreenRef вместо прямого setScreen |
| **Sprint 8 — Фаза 3** | **Фиксы шапок**: profile по центру, убраны "7 ДНЕЙ" и "LVL 4" бейджи, все страницы с position:fixed шапками + spacer |
| **Sprint 8 — Фаза 4** | **Aurora V2 на всех страницах**: тёмный фон #05050b, стеклянные карточки (rgba(13,13,26,0.65) + violet border), обновлены CSS токены. **Фикс AI Chat**: onBack → /menu. **Пятиугольник по центру**: grid 1fr/auto/1fr в quiz header. **Стандарт высоты шапок**: все шапки = 58px + safe-area (padding 10/30, без min-height). **StarField** + **AuroraStreak** декоративные компоненты |

---

## 15. ИНФРАСТРУКТУРА

```
VPS:          31.76.18.54 (Ubuntu 22.04.5 LTS)
Пользователь: root
Директория:   /opt/careercheck
```

```bash
# Полезные команды на сервере
docker compose ps
docker logs -f careercheck-bot-1
docker logs careercheck-webapp-1 --tail=100
curl -s https://careercheck.app/api/health
```

---

## 16. TODO И ПЛАНЫ

### Технические
- [ ] **Alembic stamp** на продакшн БД
- [ ] **Webhook** вместо polling (при >1000 пользователей/день)
- [x] ~~GitHub Actions CI/CD~~ — **ГОТОВО**
- [ ] `hasPremium` в `/api/user/state` — всегда `false`, не читает из `purchases`
- [ ] `inline mode` — активировать через BotFather: `/setinline`
- [ ] BottomNav: `/ai-chat` не подсвечивает ни один таб — рассмотреть добавление или скрытие nav

### Скрытые функции (код готов, UI скрыт)
- [ ] **LinkedIn карточка** — `drawLinkedInCard()` в `ShareCard.jsx`

### Продуктовые планы
- [ ] История с графиком sparklines
- [ ] B2B командный профиль
- [ ] Push-уведомления через бот
- [ ] Сравнение профилей (ComparisonPage готов, роут /comparison работает)
