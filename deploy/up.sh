#!/usr/bin/env bash
# 在服务器项目根目录执行：检查产物与 .env → 写 Nginx 配置 → docker up
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

[[ -f .env ]] || { echo "缺少根目录 .env，请复制 deploy/.env.production.example 为 .env 并编辑"; exit 1; }
[[ -f deploy/artifacts/api ]] || { echo "缺少 deploy/artifacts/api，请在本机 ./deploy/build.sh 后同步 deploy/artifacts"; exit 1; }
[[ -d deploy/artifacts/admin ]] || { echo "缺少 deploy/artifacts/admin"; exit 1; }
[[ -f deploy/artifacts/web/server.js ]] || { echo "缺少 deploy/artifacts/web/server.js"; exit 1; }

if [[ -f deploy/nginx/generated/.ssl-ready ]]; then
  bash deploy/nginx-gen.sh ssl
else
  bash deploy/nginx-gen.sh bootstrap
fi

COMPOSE=(docker compose --project-directory "$ROOT" -f deploy/docker-compose.prod.yml --env-file .env)
"${COMPOSE[@]}" up -d --build

"${COMPOSE[@]}" ps -a
echo ""
if [[ -f deploy/nginx/generated/.ssl-ready ]]; then
  echo "自检示例（把 api.example.com 换成 .env 里 LE_DOMAIN）:"
  echo "  curl -sk https://127.0.0.1/health -H 'Host: api.example.com'"
else
  echo "首次证书前（Host 填 .env 中 LE_DOMAIN）:"
  echo "  curl -sS http://127.0.0.1/health -H 'Host: api.example.com'"
  echo "然后: ./deploy/cert-init.sh"
fi
