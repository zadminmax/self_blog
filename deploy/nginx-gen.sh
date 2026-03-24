#!/usr/bin/env bash
# 写入 deploy/nginx/generated/；参数: bootstrap | ssl
# 依赖根目录 .env：LE_DOMAIN、SITE_ADMIN_HOST、SITE_WWW_HOST（与证书/SAN 一致）
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"
# shellcheck source=deploy/lib-env.sh
source "$SCRIPT_DIR/lib-env.sh"

MODE="${1:-}"
if [[ "${MODE}" != "bootstrap" && "${MODE}" != "ssl" ]]; then
  echo "用法: $0 bootstrap|ssl"
  exit 1
fi
[[ -f .env ]] || { echo "缺少根目录 .env"; exit 1; }

API_HOST="$(read_env_val LE_DOMAIN)"
ADMIN_HOST="$(read_env_val SITE_ADMIN_HOST)"
WWW_HOST="$(read_env_val SITE_WWW_HOST)"
if [[ -z "${API_HOST}" || -z "${ADMIN_HOST}" || -z "${WWW_HOST}" ]]; then
  echo ".env 须同时设置 LE_DOMAIN、SITE_ADMIN_HOST、SITE_WWW_HOST"
  exit 1
fi

OUT="${ROOT}/deploy/nginx/generated"
mkdir -p "${OUT}"

resolver_line='    resolver 127.0.0.11 valid=10s ipv6=off;'
proxy_api='        set $api_upstream api:8080;
        proxy_pass http://$api_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;'

if [[ "${MODE}" == "bootstrap" ]]; then
  {
    echo "# deploy/nginx-gen.sh bootstrap"
    echo "server {"
    echo "    listen 80;"
    echo "    server_name ${API_HOST};"
    echo "${resolver_line}"
    echo "    location ^~ /.well-known/acme-challenge/ { root /var/www/certbot; }"
    echo "    location / {"
    echo "${proxy_api}"
    echo "        proxy_set_header X-Forwarded-Proto \$scheme;"
    echo "    }"
    echo "}"
    echo "server {"
    echo "    listen 80;"
    echo "    server_name ${ADMIN_HOST};"
    echo "    location ^~ /.well-known/acme-challenge/ { root /var/www/certbot; }"
    echo "    location / { return 204; }"
    echo "}"
    echo "server {"
    echo "    listen 80;"
    echo "    server_name ${WWW_HOST};"
    echo "    location ^~ /.well-known/acme-challenge/ { root /var/www/certbot; }"
    echo "    location / { return 204; }"
    echo "}"
  } >"${OUT}/10-http.conf"
  rm -f "${OUT}/20-https.conf" "${OUT}/.ssl-ready"
  echo "==> Nginx: ${OUT}（bootstrap）"
else
  {
    echo "# deploy/nginx-gen.sh ssl"
    echo "server {"
    echo "    listen 80;"
    echo "    server_name ${API_HOST} ${ADMIN_HOST} ${WWW_HOST};"
    echo "    location ^~ /.well-known/acme-challenge/ { root /var/www/certbot; }"
    echo "    location / { return 301 https://\$host\$request_uri; }"
    echo "}"
  } >"${OUT}/10-http.conf"

  cert="/etc/letsencrypt/live/${API_HOST}/fullchain.pem"
  key="/etc/letsencrypt/live/${API_HOST}/privkey.pem"
  {
    echo "# deploy/nginx-gen.sh ssl"
    echo "server {"
    echo "    listen 443 ssl;"
    echo "    http2 on;"
    echo "    server_name ${API_HOST};"
    echo "    ssl_certificate ${cert};"
    echo "    ssl_certificate_key ${key};"
    echo "${resolver_line}"
    echo "    location / {"
    echo "${proxy_api}"
    echo "        proxy_set_header X-Forwarded-Proto https;"
    echo "    }"
    echo "}"
    echo "server {"
    echo "    listen 443 ssl;"
    echo "    http2 on;"
    echo "    server_name ${ADMIN_HOST};"
    echo "    ssl_certificate ${cert};"
    echo "    ssl_certificate_key ${key};"
    echo "${resolver_line}"
    echo "    location / {"
    echo "        set \$admin_upstream admin:80;"
    echo "        proxy_pass http://\$admin_upstream;"
    echo "        proxy_http_version 1.1;"
    echo "        proxy_set_header Host \$host;"
    echo "        proxy_set_header X-Real-IP \$remote_addr;"
    echo "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
    echo "        proxy_set_header X-Forwarded-Proto https;"
    echo "    }"
    echo "}"
    echo "server {"
    echo "    listen 443 ssl;"
    echo "    http2 on;"
    echo "    server_name ${WWW_HOST};"
    echo "    ssl_certificate ${cert};"
    echo "    ssl_certificate_key ${key};"
    echo "${resolver_line}"
    echo "    location / {"
    echo "        set \$web_upstream web:3000;"
    echo "        proxy_pass http://\$web_upstream;"
    echo "        proxy_http_version 1.1;"
    echo "        proxy_set_header Host \$host;"
    echo "        proxy_set_header X-Real-IP \$remote_addr;"
    echo "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
    echo "        proxy_set_header X-Forwarded-Proto https;"
    echo "    }"
    echo "}"
  } >"${OUT}/20-https.conf"
  touch "${OUT}/.ssl-ready"
  echo "==> Nginx: ${OUT}（ssl）"
fi
