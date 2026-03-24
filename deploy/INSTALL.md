# 生产部署（单服务器 · Docker · HTTPS）

仅支持：**一台 Linux 云主机**上同时跑 **Postgres、API、管理端静态、Next 官网、Nginx 终止 TLS**，证书 **Let’s Encrypt**。

---

## 1. 服务器环境

- Ubuntu 22.04 等；安装 Docker 与 Compose 插件，当前用户加入 `docker` 组。
- 安全组放行 **TCP 80、443**。
- `LE_DOMAIN`、`SITE_ADMIN_HOST`、`SITE_WWW_HOST` 的 **A 记录** 均指向本机公网 IP。

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable --now docker
```

---

## 2. 本机：先编辑再构建（再同步）

在**开发机**仓库根目录，**须先于 rsync** 完成（否则没有 `deploy/artifacts/`）：

```bash
cp deploy/.env.build.example deploy/.env.build
# 填写与线上一致的 https 地址（须与服务器 .env 里的公网域名一致，见 deploy/.env.build.example）

chmod +x deploy/build.sh
./deploy/build.sh
```

会生成：

- `deploy/artifacts/api` — Linux amd64 可执行文件  
- `deploy/artifacts/admin` — 管理端静态目录  
- `deploy/artifacts/web` — Next standalone（含 `server.js`）

---

## 3. 同步到服务器

**方式 A**：在服务器 `git clone` 到如 `/opt/selfblog`。若不在本机构建，须在服务器自行生成 `deploy/artifacts/`（不推荐，与本文档主流程不一致）。

**方式 B（推荐）**：在本机**编辑好** rsync 脚本后再执行同步（只传 Docker 所需路径：`deploy/`、`admin/docker/`、根目录 `.dockerignore`，不含 backend/web/admin 源码）：

```bash
cp deploy/rsync-upload.example.sh deploy/rsync-upload.local.sh
chmod +x deploy/rsync-upload.local.sh
# 编辑 REMOTE_USER、REMOTE_HOST、REMOTE_DIR、SSH_IDENTITY 等
./deploy/rsync-upload.local.sh
```

若服务器上曾用旧脚本整仓同步过，可能仍留有 `backend/`、`web/` 等，可在 SSH 上手动删掉以省磁盘。

---

## 4. 服务器：配置与启动

同步完成后，在服务器**编辑**根目录 `.env`，再启动：

```bash
cd /opt/selfblog   # 与 rsync 里 REMOTE_DIR 一致
cp deploy/.env.production.example .env
nano .env          # POSTGRES_PASSWORD、JWT_SECRET、PUBLIC_URL、CORS_ORIGINS、域名与邮箱等
chmod +x deploy/*.sh
./deploy/up.sh
```

`up.sh` 会生成 Nginx 配置并执行 compose（带 `--project-directory` 指向**仓库根**，避免把 `deploy/` 当成项目根而出现 `deploy/deploy` 路径错误）。

---

## 5. 首次 HTTPS 证书

**先满足：**

1. **DNS**：在域名服务商处为 `.env` 里的 `LE_DOMAIN`、`SITE_ADMIN_HOST`、`SITE_WWW_HOST` 各添加 **A 记录**，指向本机**公网 IPv4**（需要 IPv6 时再配 AAAA）。未解析或 `NXDOMAIN` 时 Let’s Encrypt 会直接失败，与 Nginx 无关。
2. **解析生效**：可用本机或 [Google Dig](https://dns.google/query) 查询，例如 `dig +short api.example.com` 应返回服务器 IP。
3. **80 端口**：安全组/防火墙对公网放行 **TCP 80**（HTTP-01 校验用）。

然后再执行：

```bash
./deploy/cert-init.sh
```

完成后若刚调整过 `PUBLIC_URL` / `CORS_ORIGINS`，执行：

```bash
cd /opt/selfblog   # 仓库根
docker compose --project-directory "$(pwd)" -f deploy/docker-compose.prod.yml --env-file .env restart api
```

**续期**（示例每天 4 点）：

```cron
0 4 * * * /opt/selfblog/deploy/cert-renew.sh >>/var/log/selfblog-cert.log 2>&1
```

---

## 6. 更新发版

本机改代码后：**编辑/确认** `deploy/.env.build`（若域名有变）→ `./deploy/build.sh` → **编辑/确认** rsync 脚本 → `./deploy/rsync-upload.local.sh` → 服务器 `./deploy/up.sh`。

---

## 7. 常用自检

```bash
cd /opt/selfblog
docker compose --project-directory "$(pwd)" -f deploy/docker-compose.prod.yml --env-file .env ps -a
docker compose --project-directory "$(pwd)" -f deploy/docker-compose.prod.yml --env-file .env logs api --tail 80
```

证书申请失败：查域名解析、80 是否对外开放、`.env` 中域名是否与访问一致。

跨域问题：核对 `CORS_ORIGINS` 是否包含前端页面的完整源（协议 + 主机 + 端口）。

---

## 8. 与本地开发的区别

仓库根目录 `docker-compose.yml` 仅供本机开发（Postgres + 源码构建 API）。**生产**只用 `deploy/docker-compose.prod.yml` 与上文脚本。
