#!/usr/bin/env bash
# 由 crontab 每日执行：续签并在成功时 reload nginx（建议 root 或 docker 组成员）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  exit 0
fi

COMPOSE=(
  docker compose
  -f docker-compose.yml
  -f deploy/docker-compose.cloud.yml
  -f deploy/docker-compose.https.yml
  --env-file .env
)

COMPOSE_PROFILES=cert "${COMPOSE[@]}" run --rm certbot renew --webroot -w /var/www/certbot --quiet
"${COMPOSE[@]}" exec nginx nginx -s reload
