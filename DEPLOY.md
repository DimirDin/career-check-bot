# Деплой CareerCheck на Hetzner VPS

Пошаговый гайд: от нуля до работающего бота + Mini App с HTTPS.

---

## Шаг 1 — Создай сервер на Hetzner

1. Зарегистрируйся на [hetzner.com/cloud](https://hetzner.com/cloud)
2. Нажми **New Server**
3. Выбери:
   - **Location**: Nuremberg или Helsinki (ближе к Telegram серверам)
   - **Image**: Ubuntu 24.04
   - **Type**: CX22 (2 vCPU, 4 GB RAM) — €4.51/мес ✅
   - **SSH Keys**: добавь свой публичный ключ (`~/.ssh/id_rsa.pub`)
4. Нажми **Create & Buy**
5. Запиши IP-адрес сервера

---

## Шаг 2 — Подключись к серверу

```bash
ssh root@YOUR_SERVER_IP
```

---

## Шаг 3 — Скопируй файлы деплоя

```bash
# Вариант А: через git (рекомендую)
git clone https://github.com/YOUR_USERNAME/careercheck.git /opt/careercheck
cd /opt/careercheck

# Вариант Б: через scp с MacBook
scp -r ~/careercheck root@YOUR_IP:/opt/careercheck
```

---

## Шаг 4 — Создай .env файл

```bash
cd /opt/careercheck
cp .env.example .env
nano .env
```

Заполни обязательные поля:
```env
BOT_TOKEN=ВАШ_ТОКЕН_ОТ_BOTFATHER
POSTGRES_PASSWORD=придумай_сложный_пароль
DB_PASSWORD=тот_же_пароль
DOMAIN=yourdomain.com
```

---

## Шаг 5 — Настрой DNS

1. Купи домен (namecheap.com ~$10, или бесплатно: afraid.org)
2. В DNS-панели добавь A-запись:
   ```
   Type: A
   Name: @  (или yourdomain.com)
   Value: YOUR_SERVER_IP
   TTL: 300
   ```
3. Подожди 5-15 минут (проверь: `ping yourdomain.com`)

---

## Шаг 6 — Запусти setup

```bash
chmod +x deploy.sh
./deploy.sh setup
```

Скрипт сделает:
- Установит Docker, nginx, certbot, fail2ban
- Настроит firewall (UFW)
- Создаст пользователя appuser
- Настроит nginx
- Получит SSL-сертификат Let's Encrypt

---

## Шаг 7 — Первый деплой

```bash
./deploy.sh deploy
```

Скрипт:
- Соберёт Docker-образы (npm build + pip install)
- Запустит PostgreSQL, бота, FastAPI
- Применит SQL-миграции из `db/migration/`

---

## Шаг 8 — Перенеси данные с MacBook

```bash
# На MacBook — экспорт БД
pg_dump careercheck | gzip > ~/careercheck_backup.sql.gz

# Копируем на сервер
scp ~/careercheck_backup.sql.gz root@YOUR_IP:/opt/backups/

# На сервере — импорт
cd /opt/careercheck
./deploy.sh db-restore /opt/backups/careercheck_backup.sql.gz
```

---

## Шаг 9 — Настрой BotFather для Mini App

1. Открой @BotFather в Telegram
2. `/mybots` → выбери своего бота → **Bot Settings** → **Menu Button**
3. Укажи URL: `https://yourdomain.com`
4. Или добавь кнопку в боте:

```python
# В handlers.py
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

web_app_btn = InlineKeyboardMarkup(inline_keyboard=[[
    InlineKeyboardButton(
        text="🚀 Пройти тест",
        web_app=WebAppInfo(url="https://yourdomain.com")
    )
]])
```

---

## Шаг 10 — Автобекапы

```bash
# Добавить в crontab (бекап каждую ночь в 3:00)
crontab -e
# Добавь строку:
0 3 * * * /opt/careercheck/cron-backup.sh >> /var/log/careercheck-backup.log 2>&1
```

---

## Полезные команды в проде

```bash
# Логи бота в реальном времени
docker compose logs -f bot

# Логи Mini App
docker compose logs -f webapp

# Перезапустить только бота (без даунтайма БД)
docker compose restart bot

# Войти в PostgreSQL
docker compose exec db psql -U careercheck careercheck

# Статус всех контейнеров
docker compose ps

# Обновить код и задеплоить
git pull && ./deploy.sh deploy

# Ручной бекап
./deploy.sh db-backup

# Использование ресурсов
docker stats
```

---

## Мониторинг (опционально, бесплатно)

**UptimeRobot** — пинг каждые 5 минут, уведомление в Telegram если упал:
1. [uptimerobot.com](https://uptimerobot.com) → Add Monitor
2. URL: `https://yourdomain.com/api/health`
3. Telegram alert: добавь свой chat_id

---

## Стоимость в месяц

| Статья | Стоимость |
|--------|-----------|
| Hetzner CX22 | €4.51 |
| Домен (в месяц) | ~$0.83 |
| SSL (Let's Encrypt) | бесплатно |
| Cloudflare DDoS-защита | бесплатно |
| **Итого** | **~€5.5/мес** |

---

**@Dimirdin · CareerCheck**
