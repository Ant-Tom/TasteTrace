#!/usr/bin/env bash
set -euo pipefail

# One-off: copy review photos from the old MinIO container into the new photos_data volume.
#
# Run on the server after `git pull` and BEFORE `docker compose up`: the old MinIO
# container must still be running. MinIO no longer publishes free images, so the copy
# is done with the official AWS CLI image, which speaks S3 to MinIO.
#
# Usage: ./deploy/migrate-photos-from-minio.sh

cd "$(dirname "$0")/.."

PROJECT="${COMPOSE_PROJECT_NAME:-tastetrace}"
MINIO_CONTAINER="${MINIO_CONTAINER:-tastetrace-minio}"
VOLUME="${PROJECT}_photos_data"

set -a
# shellcheck disable=SC1091
source .env
set +a
BUCKET="${MINIO_BUCKET_REVIEWS:-review-photos}"

if ! docker inspect "${MINIO_CONTAINER}" >/dev/null 2>&1; then
  echo "MinIO container '${MINIO_CONTAINER}' not found — nothing to migrate."
  exit 0
fi

NETWORK=$(docker inspect -f '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}} {{end}}' "${MINIO_CONTAINER}" | awk '{print $1}')

echo "==> Copying s3://${BUCKET} from ${MINIO_CONTAINER} into volume ${VOLUME}..."
docker volume create "${VOLUME}" >/dev/null
docker run --rm \
  --network "${NETWORK}" \
  -v "${VOLUME}:/dest" \
  -e AWS_ACCESS_KEY_ID="${MINIO_ROOT_USER}" \
  -e AWS_SECRET_ACCESS_KEY="${MINIO_ROOT_PASSWORD}" \
  -e AWS_DEFAULT_REGION=us-east-1 \
  amazon/aws-cli:2.39.0 \
  s3 sync "s3://${BUCKET}" /dest --endpoint-url "http://${MINIO_CONTAINER}:9000" --no-progress

COUNT=$(docker run --rm -v "${VOLUME}:/dest" alpine:3.20 sh -c 'find /dest -type f | wc -l')
echo "==> Done: ${COUNT} files in ${VOLUME}."
echo ""
echo "Next: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --remove-orphans"
echo "When photos show up on the site, remove the old storage:"
echo "  docker volume rm ${PROJECT}_minio_data"
