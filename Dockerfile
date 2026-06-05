# ── Stage 1: build React Mini App ────────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /app/miniapp
COPY miniapp/package*.json ./
RUN npm ci --silent
COPY miniapp/ ./
RUN npm run build
# Результат: /app/miniapp/../webapp/dist/

# ── Stage 2: Python app ───────────────────────────────────────────
FROM python:3.12-slim AS app

# Системные зависимости для matplotlib / ReportLab / asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc libfreetype6 libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python зависимости (кешируются отдельно от кода)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Исходный код
COPY . .

# Фронтенд из stage 1
COPY --from=frontend /app/webapp/dist ./webapp/dist

# Непривилегированный пользователь
RUN useradd -m -u 1000 appuser && chown -R appuser /app
USER appuser

# Порт для FastAPI Mini App
EXPOSE 8000
