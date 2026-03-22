#!/usr/bin/env bash
# 兼容旧路径；逻辑在 deploy/selfblog.sh
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec "${ROOT}/deploy/selfblog.sh" nginx-gen "$@"
