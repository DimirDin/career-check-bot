#!/usr/bin/env bash
# /opt/careercheck/cron-backup.sh
# Добавить в crontab: 0 3 * * * /opt/careercheck/cron-backup.sh >> /var/log/careercheck-backup.log 2>&1

set -euo pipefail
cd /opt/careercheck

source .env 2>/dev/null || true

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
BACKUP_FILE="$BACKUP_DIR/careercheck_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

docker compose exec -T db pg_dump \
    -U "${POSTGRES_USER:-careercheck}" \
    "${POSTGRES_DB:-careercheck}" \
    | gzip > "$BACKUP_FILE"

echo "$(date): Backup OK → $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# Оставляем только последние 14 бекапов
ls -t "$BACKUP_DIR"/careercheck_*.sql.gz | tail -n +15 | xargs -r rm
echo "$(date): Cleanup OK"
