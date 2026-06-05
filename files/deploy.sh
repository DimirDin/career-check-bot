#!/usr/bin/env bash
# deploy.sh — первичная настройка Hetzner VPS + деплой CareerCheck
# Запускать на сервере под root (ssh root@YOUR_IP)
# Затем — под appuser для последующих деплоев
#
# Использование:
#   chmod +x deploy.sh
#   ./deploy.sh setup          # первый раз: установка всего
#   ./deploy.sh deploy         # обновить код и перезапустить
#   ./deploy.sh logs           # посмотреть логи
#   ./deploy.sh db-backup      # бекап PostgreSQL
#   ./deploy.sh db-restore     # восстановление из бекапа

set -euo pipefail

DOMAIN=${DOMAIN:-"yourdomain.com"}
APP_DIR="/opt/careercheck"
APP_USER="appuser"
BACKUP_DIR="/opt/backups"

# ─────────────────────────────────────────────────────────────────
# SETUP: первичная настройка сервера (запускать один раз)
# ─────────────────────────────────────────────────────────────────
cmd_setup() {
    echo "=== [1/7] Обновление системы ==="
    apt-get update -qq && apt-get upgrade -y -qq

    echo "=== [2/7] Установка зависимостей ==="
    apt-get install -y -qq \
        docker.io docker-compose-v2 \
        nginx certbot python3-certbot-nginx \
        git curl ufw fail2ban \
        postgresql-client   # для pg_dump с сервера

    echo "=== [3/7] Настройка firewall ==="
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    echo "UFW статус:"
    ufw status

    echo "=== [4/7] Создание пользователя ==="
    if ! id "$APP_USER" &>/dev/null; then
        useradd -m -s /bin/bash "$APP_USER"
        usermod -aG docker "$APP_USER"
        echo "Пользователь $APP_USER создан"
    fi

    echo "=== [5/7] Создание папок ==="
    mkdir -p "$APP_DIR" "$BACKUP_DIR"
    chown -R "$APP_USER":"$APP_USER" "$APP_DIR" "$BACKUP_DIR"

    echo "=== [6/7] Настройка nginx ==="
    cp nginx.conf /etc/nginx/sites-available/careercheck
    # Заменяем yourdomain.com на реальный домен
    sed -i "s/yourdomain.com/$DOMAIN/g" /etc/nginx/sites-available/careercheck
    ln -sf /etc/nginx/sites-available/careercheck /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
    echo "nginx настроен"

    echo "=== [7/7] SSL-сертификат ==="
    echo "Убедись, что DNS A-запись $DOMAIN → $(curl -s ifconfig.me) уже активна"
    read -p "DNS настроен? (y/n): " dns_ready
    if [[ "$dns_ready" == "y" ]]; then
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN"
        echo "SSL получен!"
    else
        echo "Пропускаем SSL. Запусти позже: certbot --nginx -d $DOMAIN"
    fi

    echo ""
    echo "✅ Сервер настроен! Следующий шаг:"
    echo "   1. Скопируй код: git clone ... $APP_DIR"
    echo "   2. Создай .env:  cp $APP_DIR/.env.example $APP_DIR/.env && nano $APP_DIR/.env"
    echo "   3. Деплой:       cd $APP_DIR && ./deploy.sh deploy"
}

# ─────────────────────────────────────────────────────────────────
# DEPLOY: сборка и перезапуск контейнеров
# ─────────────────────────────────────────────────────────────────
cmd_deploy() {
    cd "$APP_DIR"

    echo "=== Получаем последний код ==="
    git pull origin main

    echo "=== Сборка образов ==="
    docker compose build --no-cache

    echo "=== Перезапуск сервисов ==="
    docker compose up -d --remove-orphans

    echo "=== Ждём старта БД ==="
    sleep 5

    echo "=== Статус ==="
    docker compose ps

    echo ""
    echo "✅ Деплой завершён!"
    echo "   Логи бота:    docker compose logs -f bot"
    echo "   Логи webapp:  docker compose logs -f webapp"
}

# ─────────────────────────────────────────────────────────────────
# LOGS
# ─────────────────────────────────────────────────────────────────
cmd_logs() {
    cd "$APP_DIR"
    docker compose logs -f --tail=50 "${2:-bot}"
}

# ─────────────────────────────────────────────────────────────────
# DB BACKUP
# ─────────────────────────────────────────────────────────────────
cmd_db_backup() {
    cd "$APP_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/careercheck_$TIMESTAMP.sql.gz"

    echo "=== Создаём бекап БД ==="
    docker compose exec -T db pg_dump \
        -U "${POSTGRES_USER:-careercheck}" \
        "${POSTGRES_DB:-careercheck}" \
        | gzip > "$BACKUP_FILE"

    echo "✅ Бекап сохранён: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

    # Удаляем бекапы старше 30 дней
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
    echo "Бекапы старше 30 дней удалены"
}

# ─────────────────────────────────────────────────────────────────
# DB RESTORE
# ─────────────────────────────────────────────────────────────────
cmd_db_restore() {
    BACKUP_FILE="${2:-}"
    if [[ -z "$BACKUP_FILE" ]]; then
        echo "Укажи файл: ./deploy.sh db-restore /opt/backups/careercheck_YYYYMMDD.sql.gz"
        exit 1
    fi
    cd "$APP_DIR"
    echo "=== Восстанавливаем из $BACKUP_FILE ==="
    gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql \
        -U "${POSTGRES_USER:-careercheck}" \
        "${POSTGRES_DB:-careercheck}"
    echo "✅ Восстановлено!"
}

# ─────────────────────────────────────────────────────────────────
# ТОЧКА ВХОДА
# ─────────────────────────────────────────────────────────────────
case "${1:-help}" in
    setup)      cmd_setup ;;
    deploy)     cmd_deploy ;;
    logs)       cmd_logs "$@" ;;
    db-backup)  cmd_db_backup ;;
    db-restore) cmd_db_restore "$@" ;;
    *)
        echo "Использование: ./deploy.sh [setup|deploy|logs|db-backup|db-restore]"
        ;;
esac
