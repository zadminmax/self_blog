#!/usr/bin/env bash
# 在云服务器上、项目根目录执行（代码已通过 git/rsync 就位）。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.yml -f deploy/docker-compose.cloud.yml)
if [[ "${USE_HTTPS:-}" == "1" ]]; then
  COMPOSE+=(-f deploy/docker-compose.https.yml)
fi
if [[ -f .env ]]; then
  COMPOSE+=(--env-file .env)
else
  echo "缺少根目录 .env。请: cp deploy/.env.production.example .env && nano .env"
  exit 1
fi

echo "==> 构建并启动 selfblog（postgres 不映射宿主机端口）"
if [[ "${USE_HTTPS:-}" == "1" ]]; then
  echo "    （USE_HTTPS=1：Nginx 80/443，API 仅内网；首次证书请执行 ./deploy/first-cert.sh）"
fi
"${COMPOSE[@]}" up -d --build

echo "==> 状态"
"${COMPOSE[@]}" ps

echo ""
if [[ "${USE_HTTPS:-}" == "1" ]]; then
  echo "本机经 Nginx 自检: curl -sS http://127.0.0.1/health   （若已执行 first-cert 则用 https）"
else
  echo "本机自检 API: curl -sS http://127.0.0.1:8080/health"
fi
echo ""

if [[ "${PRUNE_UNUSED_IMAGES:-}" == "1" ]]; then
  echo "==> PRUNE_UNUSED_IMAGES=1：删除「未被任何容器使用」的镜像（其它已停止项目的镜像也会被删）"
  docker image prune -a -f
fi

if [[ "${PRUNE_EVERYTHING_UNUSED:-}" == "1" ]]; then
  echo "==> PRUNE_EVERYTHING_UNUSED=1：网络/构建缓存等未使用资源（不含卷，避免误删数据库卷）"
  docker system prune -a -f
fi

echo ""
echo "若仍想清理构建缓存: docker builder prune -f"
echo "危险（会删未使用卷，可能丢数据）: docker system prune -a -f --volumes"
