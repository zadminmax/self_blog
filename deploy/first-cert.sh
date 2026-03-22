#!/usr/bin/env bash
# 在服务器项目根目录执行：域名已解析到本机，80 端口对公网开放。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "缺少 .env"
  exit 1
fi

read_env_val() {
  local k="$1"
  grep -E "^${k}=" .env | tail -1 | sed "s/^${k}=//" | tr -d '\r' | sed 's/^"//;s/"$//;s/^'\''//;s/'\''$//'
}

LE_DOMAIN="$(read_env_val LE_DOMAIN)"
LE_EMAIL="$(read_env_val LE_EMAIL)"

if [[ -z "${LE_DOMAIN}" ]] || [[ -z "${LE_EMAIL}" ]]; then
  echo "请在 .env 中设置 LE_DOMAIN（如 api.example.com）与 LE_EMAIL（Let's Encrypt 通知邮箱）"
  exit 1
fi

COMPOSE=(
  docker compose
  -f docker-compose.yml
  -f deploy/docker-compose.cloud.yml
  -f deploy/docker-compose.https.yml
  --env-file .env
)

echo "==> 确保 Nginx 使用 HTTP 引导配置并已启动"
"${COMPOSE[@]}" up -d --build

echo "==> 申请证书（webroot）"
COMPOSE_PROFILES=cert "${COMPOSE[@]}" run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d "${LE_DOMAIN}" \
  --email "${LE_EMAIL}" \
  --agree-tos \
  --no-eff-email

echo "==> 切换为 HTTPS + HTTP 跳转"
rm -f "$ROOT/deploy/nginx/templates"/*.template
cp "$ROOT/deploy/nginx/stage-ssl/10-http.conf.template" "$ROOT/deploy/nginx/templates/"
cp "$ROOT/deploy/nginx/stage-ssl/20-https.conf.template" "$ROOT/deploy/nginx/templates/"

"${COMPOSE[@]}" restart nginx

echo "==> 完成。请用 https://${LE_DOMAIN}/health 自测，并把 PUBLIC_URL、CORS_ORIGINS 改为 https。"
