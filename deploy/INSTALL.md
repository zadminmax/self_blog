# 云服务器完整安装步骤（Docker）

面向：**Linux 云主机**（Ubuntu / Debian / 阿里云 / 腾讯云等），部署 **Postgres + API**，可选 **Nginx + HTTPS（Let’s Encrypt / certbot）**。

---

## 一、服务器准备

### 1. 系统与权限

- 推荐：**Ubuntu 22.04 LTS** 或同类 Debian 系。
- 登录方式：**SSH 密钥**（私钥权限 `chmod 600`）。

### 2. 安装 Docker

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable --now docker
```

验证：

```bash
docker --version
docker compose version
```

若当前用户不在 `docker` 组：

```bash
sudo usermod -aG docker "$USER"
# 重新登录 SSH 后生效
```

### 3. 安全组 / 防火墙（云控制台）

| 场景 | 需放行端口 |
|------|------------|
| 仅 HTTP API | **TCP 8080**（或见下文「仅内网 API」） |
| 带 Nginx + HTTPS | **TCP 80、443**（申请/续签证书通常需要 80） |

---

## 二、获取项目代码

任选其一。

**Git：**

```bash
sudo mkdir -p /opt
sudo chown "$USER:$USER" /opt
cd /opt
git clone <你的仓库地址> selfblog
cd selfblog
```

**本机 rsync 到服务器：** 复制 `deploy/rsync-upload.example.sh`，修改 `REMOTE_USER`、`REMOTE_HOST`、`REMOTE_DIR` 后在本机执行。

---

## 三、环境变量 `.env`

```bash
cd /opt/selfblog
cp deploy/.env.production.example .env
nano .env
```

### 必填项说明

| 变量 | 说明 |
|------|------|
| `POSTGRES_PASSWORD` | 数据库密码；含 `#`、空格时请加引号，如 `'Abcd#1234'` |
| `JWT_SECRET` | 随机长串；生产勿用默认值 |
| `PUBLIC_URL` | 浏览器/API 对外根地址，无尾部 `/`，如 `https://api.example.com` |
| `CORS_ORIGINS` | 允许跨域的前端源，逗号分隔，须与真实访问域名一致 |

### 使用 HTTPS（Nginx + certbot）时额外必填

| 变量 | 说明 |
|------|------|
| `LE_DOMAIN` | 与证书一致的主机名，如 `api.example.com`，**DNS A 记录须指向本机公网 IP** |
| `LE_EMAIL` | Let’s Encrypt 联系邮箱 |

部署前将 `PUBLIC_URL`、`CORS_ORIGINS` 改成最终 **https** 地址（可先填 http，证书就绪后再改并重启 API 容器）。

---

## 四、部署命令（两种选一）

在项目根目录 `/opt/selfblog`：

```bash
chmod +x deploy/server-release.sh deploy/first-cert.sh deploy/renew-certs.sh
```

### 方案 A：仅 Docker API + Postgres（公网直接访问 8080）

- 安全组放行 **8080**。
- **勿**与本机 `go run ./cmd/api` 同时占用 8080。

```bash
./deploy/server-release.sh
```

自检：

```bash
curl -sS http://127.0.0.1:8080/health
```

公网：`http://<服务器IP>:8080/health`。

### 方案 B：Nginx 80/443 + HTTPS（推荐生产）

1. 安全组放行 **80、443**；域名解析到本机。

2. 在 `.env` 中填写 `LE_DOMAIN`、`LE_EMAIL`，并配置好 `PUBLIC_URL`（https）、`CORS_ORIGINS`。

3. 启动栈（API **不**映射宿主机 8080，只经 Nginx）：

```bash
USE_HTTPS=1 ./deploy/server-release.sh
```

4. **首次**申请证书并切换 HTTPS 配置：

```bash
./deploy/first-cert.sh
```

5. 验证（**请把下面域名换成 `.env` 里 `LE_DOMAIN` 的真实值**；当前 shell 不会自动读取 `.env`，不要照抄 `${LE_DOMAIN}` 除非已 `export`）：

```bash
curl -sS https://api.example.com/health
```

6. **自动续期**（示例：每天 4 点）：

```bash
crontab -e
```

增加一行（路径按实际修改）：

```cron
0 4 * * * /opt/selfblog/deploy/renew-certs.sh >>/var/log/selfblog-cert.log 2>&1
```

---

## 五、默认管理员与后续

- 种子账号来自 `.env` 中 `ADMIN_SEED_USER` / `ADMIN_SEED_PASSWORD`（默认 `admin` / `admin123`），**仅在首次创建库时写入**；已有数据库不会自动改密码。
- 登录管理后台前，需自行构建并托管 **admin（Vite）**、**web（Next）** 静态资源或单独容器；本仓库当前 `docker-compose` **仅包含 API + Postgres（+ 可选 Nginx）**。
- 管理端开发时通过 `VITE_API_URL` 指向上述 API 根地址；生产同理。

---

## 六、更新版本

```bash
cd /opt/selfblog
git pull   # 或再次 rsync
USE_HTTPS=1 ./deploy/server-release.sh   # 不用 HTTPS 则去掉环境变量
```

---

## 七、可选：清理无用 Docker 镜像

```bash
PRUNE_UNUSED_IMAGES=1 ./deploy/server-release.sh
```

会删除**当前没有任何容器使用**的镜像（其他已停止项目的镜像也可能被删）。**不要**随意执行 `docker system prune -a --volumes`，以免删掉数据库卷。

---

## 八、常见问题

1. **`curl` 本机 404，容器里正常**  
   宿主机 **8080** 被本机 `go run` 等进程占用，请求未进 Docker。结束本机进程或改用 `USE_HTTPS=1` 只走 80/443。

2. **`docker compose build` 一直 0 秒、代码未更新**  
   执行：`docker compose build --no-cache api` 后再 `up -d`。

3. **Let’s Encrypt 失败**  
   检查域名解析、80 端口是否对公网开放、`.env` 中 `LE_DOMAIN` 是否与访问域名一致。

4. **跨域/CORS**  
   浏览器报错时，检查 `CORS_ORIGINS` 是否包含前端页面的**完整源**（协议 + 域名 + 端口）。

5. **Nginx 报 `invalid number of arguments in "server_name"`**  
   根目录 `.env` 里缺少或未生效的 **`LE_DOMAIN=`**（`server_name` 为空）。填好后务必在**项目根目录**执行 `USE_HTTPS=1 ./deploy/server-release.sh`（`nginx` 的 `env_file` 相对根目录的 `.env`）。若已拉取含 `deploy/docker-compose.https.yml` 的更新，Nginx 会通过 `env_file` 读 `.env`，避免仅因 compose 插值未读到变量而传空。

6. **`docker compose ps` 只有 postgres、没有 api 或 api 为 Exited**  
   表示 **api 已崩溃退出**，先看日志（在项目根目录，与启动时相同的 `-f` / `--env-file`）：  
   `docker compose -f docker-compose.yml -f deploy/docker-compose.cloud.yml --env-file .env logs api --tail 80`  
   若带 HTTPS 再加 `-f deploy/docker-compose.https.yml`。常见原因：生产环境 **`JWT_SECRET` 未设置或为空**（会报 `JWT_SECRET must be set in production`）；**数据库连接失败**（`.env` 里 `POSTGRES_PASSWORD` 含 `#` 未加引号会导致解析错误）；**`POSTGRES_PASSWORD` 与库内已有数据不一致**（改密码后需删卷重建或改回一致）。

7. **`curl: Could not resolve host: health`**  
   多半是执行了 `curl "https://${LE_DOMAIN}/health"`，但 shell 里**没有**变量 `LE_DOMAIN`（它只在 `.env` 里，Compose 会读，bash 默认不读）。请写成真实域名，例如 `curl -sS https://api.example.com/health`，或先：`export LE_DOMAIN=api.example.com`（与 `.env` 一致）。

---

更省事的「从本机同步代码」示例见：`deploy/rsync-upload.example.sh`。
