# 波波技术栈 — 个人博客（Go + Next.js + 管理后台）

前后端分离：Go（Gin + GORM）提供 REST API；**Next.js App Router** 公开站点（SEO / 响应式）；**Vite + React + Ant Design + Vditor** 管理后台（Markdown + 图片上传）。

## 目录结构

```
selfblog/
├── backend/          # Go API
├── web/              # Next.js 公开站
├── admin/            # 管理后台 SPA
├── docker-compose.yml
└── README.md
```

## 本地开发（推荐：SQLite + 三进程）

### 1. 启动 API

```bash
cd backend
go run ./cmd/api
```

默认：

- 监听 `http://127.0.0.1:8080`
- SQLite：`backend/data/selfblog.db`（自动创建）
- 上传目录：`backend/data/uploads`
- 首次启动会种子 **管理员**：用户名 `admin`，密码 `admin123`（请通过环境变量修改）

常用环境变量（也可在 `backend/.env` 中配置）：

| 变量 | 说明 |
|------|------|
| `HTTP_ADDR` | 监听地址，默认 `:8080` |
| `USE_SQLITE` | `true`/`false`，默认 `true` |
| `SQLITE_PATH` | SQLite 路径，默认 `data/selfblog.db` |
| `DATABASE_URL` | 若设置则使用 PostgreSQL（密码须 URL 编码；含 `#` 等时建议改用下面 `DB_*`） |
| `DB_HOST` | 与 `DB_USER` / `DB_PASSWORD` / `DB_NAME` 等分项组装连接串（Docker 生产默认如此，密码可含特殊字符） |
| `JWT_SECRET` | JWT 密钥 |
| `PUBLIC_URL` | 对外访问 API 的根 URL（用于拼接上传文件 URL），默认 `http://localhost:8080` |
| `CORS_ORIGINS` | 逗号分隔，默认含 `http://localhost:5173` 与 `http://localhost:3000` |
| `ADMIN_SEED_USER` / `ADMIN_SEED_PASSWORD` | 首次种子管理员 |

### 2. 启动管理后台

```bash
cd admin
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。开发环境下 Vite 已将 `/api`、`/uploads` 代理到 `8080`，一般**无需**配置 `VITE_API_URL`。

生产构建或直连 API 时，可设置：

```bash
VITE_API_URL=https://your-api.example.com npm run build
```

### 3. 启动公开站

```bash
cd web
npm install
npm run dev
```

公开站默认从 `http://127.0.0.1:8080` 拉数据。若 API 地址不同，可在 `web/.env.local` 中设置：

```env
API_URL=http://127.0.0.1:8080
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- `API_URL`：仅服务端请求使用（Docker 内可写 `http://api:8080`）。
- `NEXT_PUBLIC_SITE_URL`：canonical / sitemap / OG 等绝对地址。

## Docker Compose（PostgreSQL + API）

```bash
docker compose up -d --build
```

将启动 Postgres 与 API（`http://localhost:8080`）。本机仍可照常 `npm run dev` 启动 `web` 与 `admin`，并指向该 API。

## API 约定

- 统一前缀 `/api/v1`
- 成功响应：`{ "code": 0, "message": "ok", "data": ... }`
- 公开只读：`/api/v1/public/posts`、`/api/v1/public/posts/:slug`、分类与标签列表
- 管理端：`Authorization: Bearer <token>`，权限在 JWT 的 `perms` 中

## 内容与安全

- 文章支持 `body_format`：`markdown`（默认）或 `html`；保存时由服务端生成/净化 `body_html`（Goldmark + Bluemonday）。
- 图片上传：`POST /api/v1/admin/media`，字段名 `file`，返回 `data.url`。

## 许可证

MIT（示例项目，可按需修改）。
