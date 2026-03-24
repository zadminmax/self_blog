#!/usr/bin/env bash
# 在本机执行：生成 deploy/artifacts（linux 可跑的 API 二进制 + admin 静态 + Next standalone）
# 需：Go、Docker（用于在 Linux 容器内构建 Next）、Node（admin）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_BUILD="${ROOT}/deploy/.env.build"
if [[ ! -f "${ENV_BUILD}" ]]; then
  echo "请: cp deploy/.env.build.example deploy/.env.build 并填写 VITE_* / NEXT_PUBLIC_*"
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "${ENV_BUILD}"
set +a
if [[ -z "${VITE_API_URL:-}" || -z "${NEXT_PUBLIC_API_URL:-}" || -z "${NEXT_PUBLIC_SITE_URL:-}" ]]; then
  echo "deploy/.env.build 须含 VITE_API_URL、NEXT_PUBLIC_API_URL、NEXT_PUBLIC_SITE_URL"
  exit 1
fi

mkdir -p "${ROOT}/deploy/artifacts"
rm -rf "${ROOT}/deploy/artifacts/"{api,admin,web}

echo "==> API（linux/amd64，适合常见云主机）"
( cd "${ROOT}/backend" && GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w" -o "${ROOT}/deploy/artifacts/api" ./cmd/api )

echo "==> admin（Vite 静态）"
( cd "${ROOT}/admin" && npm ci && npm run build )
cp -R "${ROOT}/admin/dist" "${ROOT}/deploy/artifacts/admin"

echo "==> web（Docker Linux 内 npm build，避免 Mac 与服务器架构不一致）"
docker run --rm \
  -v "${ROOT}/web:/app" \
  -w /app \
  -e NEXT_PUBLIC_API_URL \
  -e NEXT_PUBLIC_SITE_URL \
  node:20-bookworm \
  bash -c "npm ci && npm run build"

mkdir -p "${ROOT}/deploy/artifacts/web"
cp -R "${ROOT}/web/.next/standalone"/. "${ROOT}/deploy/artifacts/web/"
mkdir -p "${ROOT}/deploy/artifacts/web/.next"
cp -R "${ROOT}/web/.next/static" "${ROOT}/deploy/artifacts/web/.next/"
# Next 的 public/ 为可选；无该目录时 standalone 仍可从 app 等提供资源
if [[ -d "${ROOT}/web/public" ]]; then
  cp -R "${ROOT}/web/public" "${ROOT}/deploy/artifacts/web/public"
fi

echo "==> 完成: deploy/artifacts/"
echo "    上传仓库（含 artifacts）到服务器后:  ./deploy/up.sh"
echo "    首次 HTTPS:                         ./deploy/cert-init.sh"
