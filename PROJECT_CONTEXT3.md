# CareerCheck — Полный технический контекст проекта
> **Версия:** 7.0 · **Дата обновления:** 2026-06-06
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
├── main.py                        # Точка входа бота.
│                                  # Создаёт DB pool, Redis, запускает heartbeat,
│                                  # challenge_scheduler, RateLimitMiddleware, polling.
│
├── bot/
│   ├── handlers.py                # Все хендлеры бота (~950 строк)
│   └── premium_handlers.py        # Оплата Stars + update_menu_button_for_user
│
├── miniapp/
│   ├── index.html                 # viewport-fit=cover, fullscreen meta
│   ├── public/
│   │   ├── manifest.json          # display: fullscreen, theme #6C5CE7
│   │   ├── icons/
│   │   │   ├── logo.svg           # SVG пятиугольник-радар
│   │   │   ├── icon-64.png
│   │   │   └── icon-512.png
│   │   └── webh/                  # Aurora V2 иконки (WebP с прозрачностью)
│   │       ├── hero_logo.webp     # Фиолетовая сфера с мозгом (hero)
│   │       ├── ic_ai_chat.webp    # ИИ-Эксперт
│   │       ├── ic_catalog.webp    # Каталог профессий
│   │       ├── ic_challenges.webp # Челленджи
│   │       └── ic_compat.webp     # Сравнение профилей
│   └── src/
│       ├── App.jsx                # Корневой компонент. SCREEN enum + renderScreen()
│       ├── styles.css             # Глобальные стили, CSS переменные safe area
│       ├── hooks/
│       │   └── useTelegram.js     # requestFullscreen, safeArea, insets
│       ├── context/
│       │   └── NavigationContext.jsx  # Кастомный роутер (navigate, useLocation)
│       ├── components/
│       │   ├── BottomNav/         # 4 таба: Главная / Тест / История / Профиль
│       │   ├── Logo/Logo.jsx      # SVG логотип
│       │   └── SplashScreen.jsx   # 1.8s анимация
│       └── pages/
│           ├── MenuPage.jsx       # ← AURORA V2 (см. раздел 6)
│           └── ProfessionsPage.jsx
│
├── webapp/
│   └── server.py                  # FastAPI: REST API + статика для Mini App
│                                  # Монтирует: /assets, /webh, /icons → StaticFiles
│                                  # SPA fallback для всех остальных роутов
│
├── config/settings.py             # os.getenv() для всех секретов
├── Dockerfile                     # Stage 1: node:20 build; Stage 2: python:3.12
├── docker-compose.yml             # Сервисы: webapp, bot, db, redis
├── requirements.txt
└── .env.example                   # Шаблон (без реальных значений)
```

---

## 6. AURORA V2 — MENUPAGE (Sprint 8)

`miniapp/src/pages/MenuPage.jsx` полностью переписан в стиле **Aurora V2**.

### Дизайн-токены
```js
const T = {
  void: '#05050b',        // фон
  glass: 'rgba(13,13,26,0.65)',
  violet: '#7c3aed',
  cyan: '#06b6d4',
  rose: '#f43f5e',
  green: '#22d3a5',
  textPrimary: '#f0eeff',
  textSecondary: '#9b97c0',
}
```

### Компоненты
| Компонент | Описание |
|-----------|---------|
| `HeaderProfile` | Фиксированная шапка: аватар с инициалами, стрик "7 ДНЕЙ", "LVL 4" |
| `HeroCard` | Карточка hero: RadarChart (если тест пройден) или кнопка "Начать тест" + logo |
| `RadarChart` | Чистый SVG, 5 осей Big Five (OCEAN), gradientFill |
| `QuickActionsGrid` | Сетка 2×2: Каталог, ИИ-Эксперт, Челленджи, Сравнение |
| `SectionHeader` | Подзаголовок секции с action-ссылкой |

### Маршруты карточек
```
catalog      → /professions
ai           → /ai-chat
challenges   → /challenges
compat       → /comparison
```

### Иконки
Все иконки — `.webp` с прозрачным фоном в `/webh/`:
```jsx
<img src="/webh/hero_logo.webp" className="aurora-icon-asset hero" />
<img src="/webh/ic_catalog.webp" className="aurora-icon-asset catalog" />
<img src="/webh/ic_ai_chat.webp" className="aurora-icon-asset ai-chat" />
<img src="/webh/ic_challenges.webp" className="aurora-icon-asset challenges" />
<img src="/webh/ic_compat.webp" className="aurora-icon-asset compat" />
```

CSS-класс `aurora-icon-asset` даёт нужный `drop-shadow` на тёмном фоне.

### Анимации (CSS keyframes, инжектируются один раз)
- `heartbeat` — пульс кнопки "Начать тест"
- `breathe` — плавное свечение hero logo
- `aurora-fadeInUp` — появление карточек
- `aurora-ctaGlow` — пульсирующая подсветка CTA
- `aurora-streakFlicker` — мерцание стрика

---

## 7. СТАТИЧЕСКИЕ ФАЙЛЫ — FASTAPI (важно)

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

### Путь от файла до браузера
```
miniapp/public/webh/     →  npm run build  →  webapp/dist/webh/
                                              ↓
                                        docker build (COPY --from=frontend)
                                              ↓
                                    FastAPI mount /webh → StaticFiles
                                              ↓
                                    браузер: GET /webh/ic_catalog.webp ✅
```

---

## 8. DEEP NAVY DESIGN SYSTEM (Sprint 7)

### CSS переменные (в `styles.css :root`)
```css
--bg-primary:   #0B0E1A;
--bg-secondary: #131728;
--accent-primary:   #6C5CE7;
--accent-secondary: #0984E3;
--accent-success:   #00CEC9;
--gradient-accent:  linear-gradient(135deg, #6C5CE7 0%, #0984E3 100%);
--safe-top:    env(safe-area-inset-top, 44px);
--tg-header-h: 0px;
--app-top:     calc(var(--tg-header-h) + var(--safe-top));
--bottom-nav-height: 64px;
--bottom-nav-total:  calc(64px + var(--safe-area-bottom));
```

---

## 9. SAFE AREA — РЕШЕНИЕ

```js
// useTelegram.js
const applyInsets = () => {
  const top = Math.max(
    tg.contentSafeAreaInsets?.top ?? 0,
    tg.safeAreaInsets?.top ?? 0
  )
  if (top > 0) {
    document.documentElement.style.setProperty('--tg-header-h', top + 'px')
  }
}
```

Page headers используют: `padding-top: calc(var(--app-top, 0px) + Npx)`

---

## 10. ИЗВЕСТНЫЕ ОСОБЕННОСТИ И РЕШЕНИЯ

| Ситуация | Решение |
|----------|---------|
| Иконки не видны (чёрные квадраты) | FastAPI должен монтировать `/webh` явно как StaticFiles. Без этого SPA-fallback отдаёт index.html |
| Белый фон на JPEG иконках | Конвертировать в WebP с удалением фона через Pillow (`Image.convert("RGBA")`, маска по яркости) |
| git pull не применяет фронт | `webapp/dist/` в Docker-образе → нужен `docker compose build --no-cache` |
| display:contents + анимации | Никогда не использовать — opacity:0 зависнет (чёрный экран) |
| tg.openInvoice() порядок | Вызывать ПОСЛЕ setPremiumLoading(false) + 80ms задержки |
| Safe area в fullscreen | Три уровня: CSS fallback 44px + JS обновление --tg-header-h + отступы на каждом header |
| `tg.MainButton` дублировал кнопки | Убран с MenuPage, заменён на BottomNav |
| 403 при открытии профессий вне Telegram | if (res.status === 403) { setProfessions([]); return } + finally { setLoading(false) } |
| HMAC Mini App (Telegram 2024+) | `signature` включается в check_string; исключается только `hash` |
| PROJECT_CONTEXT.md | Удалён (содержал токен). PROJECT_CONTEXT2.md в .gitignore |

---

## 11. API ЭНДПОИНТЫ

| Метод | Путь | Описание |
|-------|------|---------|
| GET | `/api/health` | Статус сервера |
| GET | `/api/health/bot` | Статус бота |
| POST | `/api/validate` | Валидация Telegram initData |
| GET | `/api/test/questions` | 60 вопросов теста |
| POST | `/api/test/submit` | Отправить ответы, получить результаты |
| GET | `/api/user/state` | Состояние пользователя (тест, premium) |
| GET | `/api/professions` | Каталог 160 профессий |
| GET | `/api/history` | История прохождений |
| POST | `/api/premium/generate` | Генерация Premium PDF (Claude) |
| GET | `/api/premium/download/{id}` | Скачать PDF |

---

## 12. ИСТОРИЯ РАЗРАБОТКИ

| Фаза | Что сделано |
|------|-------------|
| Спринты 1–6 | Big Five тест, PostgreSQL, Premium PDF, Telegram Stars, ShareCard, каталог профессий |
| Sprint 7 — Фаза 1 | manifest.json (fullscreen), SVG логотип, PNG иконки, set_my_commands |
| Sprint 7 — Фаза 2 | requestFullscreen, safe area CSS, BottomNav компонент |
| Sprint 7 — Фаза 3 | Deep Navy дизайн-система, SplashScreen, Logo.jsx |
| Sprint 7 — Фаза 4 | Inline mode, динамическая кнопка меню, новый /start |
| Sprint 7 — Фиксы | Safe area multilayer fix, убран tg.MainButton, дедупликация профессий |
| **Sprint 8** | **GitHub Actions CI/CD** (автодеплой push→VPS), **Aurora V2 MenuPage** (glassmorphism, анимации, RadarChart SVG), **WebP иконки** с прозрачным фоном, **fix FastAPI /webh/ StaticFiles mount** |

---

## 13. ИНФРАСТРУКТУРА

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

## 14. TODO И ПЛАНЫ

### Технические
- [ ] **Alembic stamp** на продакшн БД
- [ ] **Webhook** вместо polling (при >1000 пользователей/день)
- [x] ~~GitHub Actions CI/CD~~ — **ГОТОВО**
- [ ] `hasPremium` в `/api/user/state` — всегда `false`, не читает из `purchases`
- [ ] `inline mode` — активировать через BotFather: `/setinline`
- [ ] Загрузить новые WebP иконки (user присылал новые версии — нужно добавить в `miniapp/public/webh/`)

### Скрытые функции (код готов, UI скрыт)
- [ ] **AI-чат консультант** — `AIChatPage.jsx` готов, на `ResultsPage.jsx` заменить `{null}` на кнопку
- [ ] **LinkedIn карточка** — `drawLinkedInCard()` в `ShareCard.jsx`

### Продуктовые планы
- [ ] История с графиком sparklines
- [ ] B2B командный профиль
- [ ] Push-уведомления через бот
