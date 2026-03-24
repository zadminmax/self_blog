# shellcheck shell=bash
# 从项目根目录 .env 读取 KEY=value（缺省键不报错）
read_env_val() {
  local k="$1"
  { grep -E "^${k}=" .env 2>/dev/null || true; } | tail -1 | sed "s/^${k}=//" | tr -d '\r' | sed 's/^"//;s/"$//;s/^'\''//;s/'\''$//'
}
