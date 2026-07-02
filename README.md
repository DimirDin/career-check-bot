<div align="center">

# CareerCheck

**Scientific career guidance bot powered by Big Five × RIASEC**

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![aiogram](https://img.shields.io/badge/aiogram-3.x-2CA5E0?style=flat-square&logo=telegram&logoColor=white)](https://aiogram.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[**Live bot →**](https://t.me/CareerCheckBot) · [**Mini App →**](https://careercheck.app) · [**Support →**](https://t.me/CareerCheckSupport)

![CareerCheck Preview](assets/welcome_en.png)

</div>

---

## What it does

CareerCheck is a Telegram bot that helps people discover their ideal career path through two scientifically validated psychological models:

- **Big Five (OCEAN)** — measures Openness, Conscientiousness, Extraversion, Agreeableness, and Emotional Stability
- **RIASEC** — maps personality to six professional types: Realistic, Investigative, Artistic, Social, Enterprising, Conventional

Users answer 60 questions, receive an instant personality profile, and get matched to the top 3 professions from a curated database of 30+ careers — with a detailed breakdown of fit, growth potential, pros and cons.

**Premium tier** delivers a 6-page AI-generated PDF report via Claude/DeepSeek API — personalized career vision, 5-step roadmap, salary trajectory, and a personal message from an AI coach.

---

## Features

| Feature | Details |
|---|---|
| 60-question psychometric test | Validated Big Five instrument, inverted items, progress saving |
| Real-time matching algorithm | Weighted OCEAN vector comparison + RIASEC bonus/penalty scoring |
| Sharing card | Dark-themed radar charts (Big Five + RIASEC) exported as PNG |
| Premium PDF report | 6 pages, AI-generated via API, paid with Telegram Stars (99 ★) |
| Telegram Mini App | Full React SPA inside Telegram — same test, better UX |
| 5 languages | RU · EN · HI · ES · PT — auto-detected from Telegram locale |
| Rate limiting | 1 msg/sec, 3 callbacks/2 sec, flood cooldown — in-memory middleware |
| Honest answer detection | Flags suspiciously uniform responses |
| Graceful shutdown | SIGTERM/SIGINT handling, clean DB pool teardown |
| Dockerized | Single `docker compose up` — bot + webapp + PostgreSQL |

---

## Tech stack

```
Telegram Bot API  ←→  aiogram 3 (FSM, middlewares, routers)
                             ↓
                    PostgreSQL 16 (asyncpg)
                    ├── users, questions, professions
                    ├── test_results, test_progress
                    └── profession_details (pros/cons/reality)
                             ↓
                    Services layer
                    ├── calculator.py    — Big Five + RIASEC scoring
                    ├── card_generator.py — matplotlib PNG card
                    ├── pdf_generator.py  — ReportLab base PDF
                    └── premium_pdf_generator.py — 6-page AI report
                             ↓
                    FastAPI (Mini App backend)
                    └── React + Vite (Mini App frontend → webapp/dist)
```

**Runtime:** Python 3.12, aiogram 3.x, asyncpg, FastAPI, uvicorn  
**PDF/Charts:** ReportLab, matplotlib  
**AI:** Anthropic Claude API or DeepSeek API (OpenAI-compatible)  
**Payments:** Telegram Stars (XTR) via built-in invoice flow  
**Infra:** Docker Compose, PostgreSQL 16, nginx, Let's Encrypt  

---

## Project structure

```
careercheck/
├── main.py                     # Entry point — bot + polling
├── calculator.py               # Big Five & RIASEC algorithms
│
├── bot/
│   ├── handlers.py             # All FSM handlers (start, test, results)
│   └── premium_handlers.py     # Telegram Stars payment + PDF delivery
│
├── services/
│   ├── calculator.py           # Scoring logic (mirror of root for imports)
│   ├── card_generator.py       # Sharing card — matplotlib PNG
│   ├── pdf_generator.py        # Base PDF (ReportLab, dark theme Aurora)
│   ├── premium_pdf_generator.py # 6-page AI PDF (calls ai_analyst)
│   └── ai_analyst.py           # Claude/DeepSeek prompt + API call
│
├── db/
│   ├── database.py             # All asyncpg queries
│   └── migration/              # SQL migrations (run in order)
│       ├── init.sql
│       ├── 010_test_progress.sql
│       ├── 020_multilang.sql
│       └── add_professions_part*.sql
│
├── middlewares/
│   └── rate_limit.py           # Sliding window rate limiter
│
├── locales/
│   ├── ru.py / en.py / hi.py / es.py / pt.py
│   └── __init__.py             # get_text(key, lang) dispatcher
│
├── config/
│   └── settings.py             # Env vars loader
│
├── miniapp/                    # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx             # Screen orchestrator
│   │   ├── pages/
│   │   │   ├── WelcomePage.jsx
│   │   │   ├── QuizPage.jsx    # 60 questions, haptics, animations
│   │   │   └── ResultsPage.jsx # Radars, trait bars, profession cards
│   │   ├── hooks/
│   │   │   └── useTelegram.js  # WebApp API abstraction
│   │   ├── components/
│   │   │   └── RadarChart.jsx  # Pure SVG radar — no canvas library
│   │   └── utils/
│   │       └── calculator.js   # Big Five + RIASEC mirrored in JS
│   └── vite.config.js          # Builds into webapp/dist
│
├── webapp/
│   └── server.py               # FastAPI: /api/* + SPA fallback
│
├── assets/
│   └── welcome_*.png           # Welcome images per language
│
├── docker-compose.yml
├── Dockerfile                  # Multi-stage: Node (frontend) + Python
└── .env.example
```

---

## Quick start

### Prerequisites

- Docker + Docker Compose
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- An Anthropic or DeepSeek API key (for Premium PDF)
- A domain with DNS pointing to your server (for Mini App HTTPS)

### 1. Clone and configure

```bash
git clone https://github.com/your-username/careercheck.git
cd careercheck
cp .env.example .env
nano .env
```

Fill in `.env`:

```env
BOT_TOKEN=your_telegram_bot_token

POSTGRES_DB=careercheck
POSTGRES_USER=careercheck
POSTGRES_PASSWORD=your_strong_password

DB_HOST=db
DB_PORT=5432
DB_NAME=careercheck
DB_USER=careercheck
DB_PASSWORD=your_strong_password

# For Premium PDF — choose one:
ANTHROPIC_API_KEY=sk-ant-...
# or
DEEPSEEK_API_KEY=sk-...

PREMIUM_PRICE_STARS=99
DOMAIN=careercheck.app
```

### 2. Build and run

```bash
docker compose up -d --build
```

This starts three containers:

| Container | Role | Port |
|---|---|---|
| `bot` | aiogram polling | — |
| `webapp` | FastAPI + Mini App | 3014 (internal) |
| `db` | PostgreSQL 16 | 5432 (internal) |

### 3. Apply migrations

```bash
docker compose exec db psql -U careercheck careercheck < db/migration/init.sql
docker compose exec db psql -U careercheck careercheck < db/migration/010_test_progress.sql
docker compose exec db psql -U careercheck careercheck < db/migration/020_multilang.sql
# ... apply remaining migration files in order
```

### 4. Configure nginx + SSL

```bash
# Install nginx and certbot on your server
apt install nginx certbot python3-certbot-nginx -y

# Copy nginx config
cp nginx.conf /etc/nginx/sites-available/careercheck
sed -i "s/careercheck.app/your-domain.com/g" /etc/nginx/sites-available/careercheck
ln -s /etc/nginx/sites-available/careercheck /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Get SSL certificate
certbot --nginx -d your-domain.com
```

### 5. Register Mini App in BotFather

```
/mybots → your bot → Bot Settings → Menu Button
URL: https://your-domain.com
```

Or add an inline button in your handlers:

```python
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

kb = InlineKeyboardMarkup(inline_keyboard=[[
    InlineKeyboardButton(
        text="🚀 Take the test",
        web_app=WebAppInfo(url="https://your-domain.com")
    )
]])
```

---

## Scoring algorithm

### Big Five (OCEAN)

Each trait is scored from 12 questions on a 1–5 scale. Inverted items are reversed (`6 - score`).

```python
raw[trait] = sum(scores)                            # range: 12–60
normalized[trait] = round((raw - 12) / 48 * 100)   # range: 0–100%
```

### RIASEC derivation

RIASEC scores are derived from Big Five via a weighted formula:

```python
R = (C×0.6 + S×0.4) × max(0, (100-O)/100) × 0.8
I = (O×0.5 + C×0.3 + S×0.2) × 0.9
A = (O×0.7 + A×0.3) × max(0, (100-C)/100) × 0.8
S = (E×0.5 + A×0.5) × 0.9
E = (E×0.6 + (100-A)×0.2 + S×0.2) × 0.9
C = (C×0.7 + A×0.3) × 0.9
```

### Profession matching

Each profession has a `required_traits` vector (O/C/E/A/S). Matching uses:

1. **Element-wise deviation** with a `floor=20` minimum match per trait
2. **Importance weighting** — traits with higher requirements matter more
3. **Key trait bonus** (+5 pts) when both user and profession exceed 80% on the same trait
4. **RIASEC penalty** (−10 to −15 pts) for mismatch on the dominant professional type
5. **RIASEC bonus** (+10 pts) when dominant types align

---

## Premium PDF — AI report

When a user pays 99 Stars, the bot:

1. Receives `successful_payment` webhook from Telegram
2. Fetches the user's latest test results from the database
3. Builds a detailed prompt with the full psychological profile
4. Calls Claude Sonnet 4.6 or DeepSeek V4 Flash API (~15–30 sec)
5. Renders a 6-page dark-themed PDF with the AI-generated content
6. Sends the PDF as a document in Telegram

**Report structure:**

| Page | Content |
|---|---|
| 1 | Personality portrait · Superpower · Shadow side |
| 2 | Big Five bars · RIASEC hexagon visualization |
| 3 | Career vision (5y + 10y) · Ideal work environment · Stress triggers |
| 4 | Deep dive into profession #1 · Day-in-life · Salary trajectory |
| 5 | 5-step roadmap · Hard/soft skills · Resources · Red flags |
| 6 | Professions #2 & #3 analysis · Action for today · Personal message |

**Switching AI vendors** — edit three lines in `services/ai_analyst.py`:

```python
# DeepSeek (cheapest — ~$0.00055/request)
API_URL = "https://api.deepseek.com/v1/chat/completions"
MODEL   = "deepseek-v4-flash"
headers = {"Authorization": f"Bearer {api_key}"}

# Kimi K2.5 (~$0.007/request)
API_URL = "https://api.moonshot.cn/v1/chat/completions"
MODEL   = "kimi-k2.5"
headers = {"Authorization": f"Bearer {api_key}"}
```

---

## Telegram Stars — payment flow

```
User taps "Buy Premium (99 ★)"
        ↓
Telegram shows native Stars invoice
        ↓
User confirms payment
        ↓
Telegram deducts 99 Stars from user balance
        ↓
Stars credited to bot's balance (instant)
        ↓
Bot receives successful_payment webhook
        ↓
Bot generates and sends PDF
        ↓
Later: withdraw via fragment.com → TON wallet → exchange → bank
```

**Economics per sale:**

| | Mobile purchase | Desktop purchase |
|---|---|---|
| User pays | ~$1.29 | ~$1.29 |
| Apple/Google cut | −30% | 0% |
| Fragment spread | −~2% | −~2% |
| **You receive** | **~$0.88** | **~$1.24** |
| AI cost (DeepSeek) | −$0.001 | −$0.001 |
| **Net margin** | **~$0.88** | **~$1.24** |

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `BOT_TOKEN` | ✅ | Telegram bot token from BotFather |
| `POSTGRES_*` | ✅ | Database credentials |
| `DB_HOST` | ✅ | Database host (`db` in Docker) |
| `ANTHROPIC_API_KEY` | ⚡ | For Premium PDF via Claude |
| `DEEPSEEK_API_KEY` | ⚡ | Alternative — cheaper option |
| `PREMIUM_PRICE_STARS` | — | Stars per PDF (default: `99`) |
| `DOMAIN` | — | Your domain for Mini App |
| `ADMIN_IDS` | — | Comma-separated Telegram IDs for /stats |

⚡ One AI key is required for Premium PDF generation.

---

## Database schema

```sql
users              — telegram_id, username, full_name, lang, test_completed
questions          — id, trait, question_text, is_inverted, active + translations
professions        — id, title, description, required_traits (JSON), riasec_type, growth_potential + translations
profession_details — profession_id, reality, pros (JSON), cons (JSON) + translations
test_results       — user_id, raw_scores, normalized_scores, riasec_profile, top_professions, completed_at
test_progress      — user_id, answers (JSON), current_question, updated_at
```

---

## Development

```bash
# Run locally without Docker
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env && nano .env  # set DB_HOST=localhost

# Start PostgreSQL separately (or use Docker just for DB)
docker compose up -d db

# Run bot
python main.py

# Run Mini App dev server (with hot reload)
cd miniapp && npm install && npm run dev
# Proxies /api/* to localhost:3014 automatically

# Run FastAPI backend
cd webapp && uvicorn server:app --reload --port 3014
```

---

## Deployment

See [`DEPLOY.md`](DEPLOY.md) for a full step-by-step guide.

**TL;DR for a fresh VPS (Ubuntu 22.04+):**

```bash
# On the server
apt install docker.io docker-compose-v2 nginx certbot -y
git clone https://github.com/your-username/careercheck.git /opt/careercheck
cd /opt/careercheck && cp .env.example .env && nano .env
docker compose up -d --build

# SSL
certbot --nginx -d your-domain.com

# Auto-backups (cron)
crontab -e
# 0 3 * * * /opt/careercheck/cron-backup.sh
```

**Recommended server:** Hetzner CX22 (2 vCPU, 4 GB RAM, €4.51/mo) or nuxt.cloud (2 vCPU, 4 GB RAM, ~330 RUB/mo)

---

## Useful commands

```bash
# Logs
docker compose logs -f bot
docker compose logs -f webapp

# Restart only the bot (no DB downtime)
docker compose restart bot

# Enter PostgreSQL
docker compose exec db psql -U careercheck careercheck

# Manual backup
./deploy.sh db-backup

# Server resource usage
docker stats
```

---

## Roadmap

- [ ] Adaptive test (CAT) — reduce questions from 60 to ~25
- [ ] Progress tracking — monthly retest with personality change graph
- [ ] "Compare with a friend" — overlay two radar profiles
- [ ] B2B HR dashboard — team testing, department summary report
- [ ] Referral program — free Premium PDF for invited friends
- [ ] Public profile page — SEO-friendly shareable URL

---

## Support

Questions about your report or the bot? Contact **[@CareerCheckSupport](https://t.me/CareerCheckSupport)**

---

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">
  <sub>Built with Python · aiogram · PostgreSQL · React · Claude API</sub><br>
  <sub><a href="https://careercheck.app">careercheck.app</a></sub>
</div>
