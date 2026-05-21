#!/usr/bin/env bash
set -euo pipefail

# TasteTrace install on Ubuntu VPS (alongside other apps like OpenClaw).
# Usage: PUBLIC_HOST=195.133.40.122 ./deploy/install.sh

INSTALL_DIR="${INSTALL_DIR:-/opt/tastetrace}"
REPO="${REPO:-https://github.com/Ant-Tom/TasteTrace.git}"
PUBLIC_HOST="${PUBLIC_HOST:-$(curl -fsS ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')}"

echo "==> TasteTrace deploy to ${INSTALL_DIR}"
echo "==> Public host: ${PUBLIC_HOST}"

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker..."
  apt-get update -qq
  apt-get install -y ca-certificates curl git
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin required."
  exit 1
fi

mkdir -p "$(dirname "${INSTALL_DIR}")"
if [ -d "${INSTALL_DIR}/.git" ]; then
  echo "==> Updating repo..."
  git -C "${INSTALL_DIR}" pull --ff-only
else
  echo "==> Cloning repo..."
  git clone "${REPO}" "${INSTALL_DIR}"
fi

cd "${INSTALL_DIR}"

if [ ! -f .env ]; then
  echo "==> Creating .env..."
  JWT_SECRET=$(openssl rand -hex 32)
  cat > .env <<EOF
POSTGRES_DB=tastetrace
POSTGRES_USER=tastetrace_user
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_PORT=5432

REDIS_PORT=6379
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=$(openssl rand -hex 12)
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_BUCKET_REVIEWS=review-photos

BACKEND_PORT=8080
FRONTEND_PORT=5173
AI_SERVICE_PORT=8000

JWT_SECRET=${JWT_SECRET}
JWT_ACCESS_EXPIRATION_MINUTES=30
JWT_REFRESH_EXPIRATION_DAYS=14

AI_MODEL_NAME=food-photo-classifier-v1

VITE_API_URL=http://${PUBLIC_HOST}:8080
CORS_ALLOWED_ORIGINS=http://${PUBLIC_HOST}:5173
EOF
fi

echo "==> Checking port conflicts..."
for port in 5173 8080; do
  if ss -tln | grep -q ":${port} "; then
    echo "WARNING: port ${port} already in use (OpenClaw or other app?)"
    ss -tlnp | grep ":${port} " || true
  fi
done

echo "==> Building and starting (project: tastetrace)..."
export COMPOSE_PROJECT_NAME=tastetrace
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo ""
echo "==> Done!"
echo "    Site:  http://${PUBLIC_HOST}:5173"
echo "    API:   http://${PUBLIC_HOST}:8080/api/establishments"
echo ""
echo "Open ports 5173 and 8080 in Timeweb firewall if not accessible externally."
