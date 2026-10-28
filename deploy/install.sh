#!/usr/bin/env bash
set -euo pipefail

# TasteTrace install on a fresh Ubuntu VPS: Docker, the repo, .env with random
# secrets, and the production stack behind Caddy with automatic HTTPS.
#
# Before running: point the domain's DNS A record to this server.
# Usage: DOMAIN=tastetrace.ru ACME_EMAIL=you@example.com ./deploy/install.sh

INSTALL_DIR="${INSTALL_DIR:-/opt/tastetrace}"
REPO="${REPO:-https://github.com/Ant-Tom/TasteTrace.git}"
BRANCH="${BRANCH:-main}"
DOMAIN="${DOMAIN:?Set DOMAIN, e.g. DOMAIN=tastetrace.ru}"
ACME_EMAIL="${ACME_EMAIL:?Set ACME_EMAIL for certificate notifications}"

echo "==> TasteTrace deploy to ${INSTALL_DIR} for https://${DOMAIN}"

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker..."
  apt-get update -qq
  apt-get install -y ca-certificates curl git
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
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
  echo "==> Cloning repo (${BRANCH})..."
  git clone --branch "${BRANCH}" "${REPO}" "${INSTALL_DIR}"
fi

cd "${INSTALL_DIR}"

if [ ! -f .env ]; then
  echo "==> Creating .env with random secrets..."
  cat > .env <<EOF
DOMAIN=${DOMAIN}
ACME_EMAIL=${ACME_EMAIL}

POSTGRES_DB=tastetrace
POSTGRES_USER=tastetrace_user
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_PORT=5432

BACKEND_PORT=8080
FRONTEND_PORT=5173

JWT_SECRET=$(openssl rand -hex 32)
JWT_ACCESS_EXPIRATION_MINUTES=30
JWT_REFRESH_EXPIRATION_DAYS=14

PUBLIC_API_URL=https://${DOMAIN}
CORS_ALLOWED_ORIGINS=https://${DOMAIN}
EOF
  chmod 600 .env
fi

echo "==> Building and starting (project: tastetrace)..."
export COMPOSE_PROJECT_NAME=tastetrace
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo ""
echo "==> Done! Site: https://${DOMAIN}"
echo "    The HTTPS certificate is issued on the first request (takes a few seconds)."
echo "    Firewall: allow inbound TCP 80 and 443 (and UDP 443 for HTTP/3)."
echo "    Backups:  add deploy/backup.sh to cron, see deploy/README.md."
