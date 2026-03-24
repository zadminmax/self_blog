#!/usr/bin/env bash
# 仅同步服务器跑 Docker 所需内容（不推送 backend/web/admin 源码等大目录）:
#   - deploy/（含 artifacts、compose、Dockerfile、脚本等）
#   - admin/docker/（Dockerfile.admin 依赖 nginx-spa.conf）
#   - 仓库根 .dockerignore（compose build context 需要）
#
# 复制为本机专用（已在 .gitignore）:
#   cp deploy/rsync-upload.example.sh deploy/rsync-upload.local.sh && chmod +x deploy/rsync-upload.local.sh
#
# 同步前在本机执行 ./deploy/build.sh，确保 deploy/artifacts/ 存在。
#
# 若出现「bash: rsync: 未找到命令」：多半是**远端**未装 rsync 或 PATH 无 rsync:
#   sudo apt install -y rsync   # Debian / Ubuntu
#   sudo yum install -y rsync   # CentOS / Aliyun Linux
# 然后可设置 RSYNC_REMOTE_PATH=/usr/bin/rsync
set -euo pipefail

export PATH="/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"
[[ -d /opt/homebrew/bin ]] && PATH="/opt/homebrew/bin:${PATH}"
[[ -d /usr/local/bin ]] && PATH="/usr/local/bin:${PATH}"

RSYNC_BIN="$(command -v rsync 2>/dev/null || true)"
[[ -z "${RSYNC_BIN}" && -x /usr/bin/rsync ]] && RSYNC_BIN="/usr/bin/rsync"
if [[ -z "${RSYNC_BIN}" ]]; then
  echo "未找到 rsync，无法同步。"
  echo "  macOS: brew install rsync"
  echo "  Ubuntu/Debian: sudo apt install -y rsync"
  exit 1
fi

# ========== 修改这里 ==========
REMOTE_USER="root"
REMOTE_HOST="你的服务器IP或域名"
REMOTE_DIR="/opt/selfblog"

SSH_IDENTITY=""
# SSH_PORT="22"

# RSYNC_REMOTE_PATH="/usr/bin/rsync"
# ==============================

SSH_CMD=(ssh)
[[ -n "${SSH_IDENTITY}" ]] && SSH_CMD+=(-i "${SSH_IDENTITY}")
[[ -n "${SSH_PORT:-}" ]] && SSH_CMD+=(-p "${SSH_PORT}")
RSYNC_RSH="$(printf '%q ' "${SSH_CMD[@]}")"
RSYNC_RSH="${RSYNC_RSH% }"

RSYNC_EXTRA=()
[[ -n "${RSYNC_REMOTE_PATH:-}" ]] && RSYNC_EXTRA+=(--rsync-path="${RSYNC_REMOTE_PATH}")

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}"

# 远端先建好目录（部分老版本 rsync 不会自动建 admin/docker 等父路径）
REMOTE_Q="$(printf '%q' "${REMOTE_DIR}")"
"${SSH_CMD[@]}" "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p ${REMOTE_Q}/deploy ${REMOTE_Q}/admin/docker"

RSYNC_DEL=( "${RSYNC_BIN}" -avz --delete "${RSYNC_EXTRA[@]}" -e "${RSYNC_RSH}" )

# deploy/：--delete 与若干 exclude；不传 nginx/generated/，远端已生成的证书与 conf 保留（未使用 --delete-excluded）
"${RSYNC_DEL[@]}" \
  --exclude 'nginx/generated/' \
  --exclude '.env.build' \
  --exclude 'rsync-upload.local.sh' \
  "${ROOT}/deploy/" "${DEST}/deploy/"

"${RSYNC_DEL[@]}" \
  "${ROOT}/admin/docker/" "${DEST}/admin/docker/"

"${RSYNC_BIN}" -avz "${RSYNC_EXTRA[@]}" -e "${RSYNC_RSH}" \
  "${ROOT}/.dockerignore" "${DEST}/.dockerignore"

echo "同步完成。SSH 登录后执行:"
echo "  cd ${REMOTE_DIR} && chmod +x deploy/*.sh && ./deploy/up.sh"
echo "（若尚未申请 HTTPS 证书: ./deploy/cert-init.sh）"
echo ""
echo "说明: 本脚本不再同步整仓。若服务器上仍有历史遗留的 backend/、web/ 等目录，可 SSH 上自行删除以省空间。"
