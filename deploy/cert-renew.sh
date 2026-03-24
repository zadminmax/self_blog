#!/usr/bin/env bash
# crontab 示例: 0 4 * * * /opt/selfblog/deploy/cert-renew.sh >>/var/log/selfblog-cert.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
[[ -f .env ]] || exit 0
COMPOSE=(docker compose --project-directory "$ROOT" -f deploy/docker-compose.prod.yml --env-file .env)
COMPOSE_PROFILES=cert "${COMPOSE[@]}" run --rm certbot renew --webroot -w /var/www/certbot --quiet
"${COMPOSE[@]}" exec nginx nginx -s reload
