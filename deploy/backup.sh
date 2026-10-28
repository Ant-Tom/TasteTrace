#!/usr/bin/env bash
set -euo pipefail

# Daily backup: PostgreSQL dump + review photos, keeps the last KEEP_DAYS days.
# Cron example (03:30 every night):
#   30 3 * * * /opt/tastetrace/deploy/backup.sh >> /var/log/tastetrace-backup.log 2>&1
#
# Restore:
#   gunzip -c db-<date>.sql.gz | docker exec -i tastetrace-postgres psql -U <user> -d <db>
#   docker run --rm -v tastetrace_photos_data:/dest -v "$PWD":/src alpine:3.20 tar xzf /src/photos-<date>.tar.gz -C /dest

cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-/opt/tastetrace-backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
PROJECT="${COMPOSE_PROJECT_NAME:-tastetrace}"
STAMP=$(date +%Y-%m-%d_%H%M)

set -a
# shellcheck disable=SC1091
source .env
set +a

mkdir -p "${BACKUP_DIR}"

echo "==> $(date -Is) dumping database..."
docker exec tastetrace-postgres pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-owner \
  | gzip > "${BACKUP_DIR}/db-${STAMP}.sql.gz"

echo "==> archiving photos..."
docker run --rm -v "${PROJECT}_photos_data:/photos:ro" -v "${BACKUP_DIR}:/backup" alpine:3.20 \
  tar czf "/backup/photos-${STAMP}.tar.gz" -C /photos .

find "${BACKUP_DIR}" -name 'db-*.sql.gz' -mtime +"${KEEP_DAYS}" -delete
find "${BACKUP_DIR}" -name 'photos-*.tar.gz' -mtime +"${KEEP_DAYS}" -delete

echo "==> done: $(ls -1 "${BACKUP_DIR}" | wc -l) files in ${BACKUP_DIR}"
