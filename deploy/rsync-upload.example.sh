#!/usr/bin/env bash
# 在你自己的电脑上改好变量后执行：用于把代码同步到服务器（示例，非必须）。
set -euo pipefail

# ========== 修改这里 ==========
REMOTE_USER="root"
REMOTE_HOST="你的服务器IP或域名"
REMOTE_DIR="/opt/selfblog"
# ==============================

RSYNC_EXCLUDE=(
  --exclude '.git'
  --exclude '**/node_modules'
  --exclude 'web/.next'
  --exclude 'web/out'
  --exclude 'admin/dist'
  --exclude 'backend/data'
  --exclude '*.db'
  --exclude '.env'
)

rsync -avz --delete "${RSYNC_EXCLUDE[@]}" \
  "$(cd "$(dirname "$0")/.." && pwd)/" \
  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"

echo "同步完成。SSH 登录后执行:"
echo "  cd ${REMOTE_DIR} && chmod +x deploy/selfblog.sh && USE_HTTPS=1 ./deploy/selfblog.sh release"
