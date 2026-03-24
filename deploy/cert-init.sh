#!/usr/bin/env bash
# 首次 Let’s Encrypt（须 80 公网可达，DNS 已指向本机）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=deploy/lib-env.sh
source "${ROOT}/deploy/lib-env.sh"

[[ -f .env ]] || exit 1
LE_DOMAIN="$(read_env_val LE_DOMAIN)"
LE_EMAIL="$(read_env_val LE_EMAIL)"
[[ -n "${LE_DOMAIN}" && -n "${LE_EMAIL}" ]] || { echo ".env 须含 LE_DOMAIN、LE_EMAIL"; exit 1; }

COMPOSE=(docker compose --project-directory "$ROOT" -f deploy/docker-compose.prod.yml --env-file .env)

cert_domains=()
add_domain() {
  local d="$1"
  [[ -z "${d}" ]] && return 0
  local x
  for x in "${cert_domains[@]}"; do [[ "${x}" == "${d}" ]] && return 0; done
  cert_domains+=("${d}")
}
add_domain "${LE_DOMAIN}"
add_domain "$(read_env_val SITE_ADMIN_HOST)"
add_domain "$(read_env_val SITE_WWW_HOST)"
CERTBOT_D=()
for d in "${cert_domains[@]}"; do CERTBOT_D+=(-d "${d}"); done

if [[ ! -f deploy/nginx/generated/.ssl-ready ]]; then
  bash deploy/nginx-gen.sh bootstrap
fi

"${COMPOSE[@]}" up -d

echo "==> certbot"
COMPOSE_PROFILES=cert "${COMPOSE[@]}" run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  "${CERTBOT_D[@]}" \
  --email "${LE_EMAIL}" \
  --agree-tos --no-eff-email

bash deploy/nginx-gen.sh ssl
"${COMPOSE[@]}" restart nginx
echo "==> 完成。若刚改过 PUBLIC_URL / CORS_ORIGINS，请执行:"
echo "    docker compose --project-directory \"\$(pwd)\" -f deploy/docker-compose.prod.yml --env-file .env restart api"
