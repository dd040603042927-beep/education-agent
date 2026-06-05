# 智慧教育智能体平台部署说明

本项目当前适合“校内演示 / 小范围内测”。正式多学校、多班级长期运行前，仍应按 `RELEASE_CHECKLIST.md` 推进数据库、任务队列、真实 RAG、监控和备份。

## 1. 本地或局域网启动

复制环境变量模板：

```powershell
Copy-Item .env.example .env
```

修改 `.env`，至少设置强随机 `SESSION_SECRET`。局域网测试时保持：

```text
HOST=0.0.0.0
PORT=5107
DATA_DIR=./data
LOG_DIR=./logs
COOKIE_SECURE=false
SESSION_IDLE_TIMEOUT_MS=172800000
```

登录态最长 2 天无活动过期；即使旧配置里 `SESSION_TTL_MS` 大于 2 天，服务也会按 2 天上限处理。

启动：

```powershell
node server.js
```

本机访问：

```text
http://127.0.0.1:5107
```

局域网其他设备访问：

```text
http://你的电脑局域网IP:5107
```

需要在 Windows 防火墙中允许 `5107` 端口入站访问。不要直接暴露到公网；公网访问应放在 HTTPS 反向代理后，并设置 `COOKIE_SECURE=true`。

## 2. Docker Compose 部署

先准备 `.env`，再运行：

```bash
docker compose up -d --build
```

健康检查：

```bash
curl http://127.0.0.1:5107/api/healthz
curl http://127.0.0.1:5107/api/readyz
```

Compose 会把数据和日志挂载到宿主机：

```text
./data -> /app/data
./logs -> /app/logs
```

## 3. OCR 说明

仓库中的 Dockerfile 是轻量 Node 运行镜像，不默认内置 PaddleOCR。它可以处理文本层 PDF、Office 文档和文本资料；扫描版 PDF 的完整 OCR 需要在运行环境中安装 Python、PyMuPDF、PaddleOCR 等依赖，或基于当前 Dockerfile 自行扩展镜像。

本机运行时可通过环境变量指定 Python：

```text
PDF_AGENT_PYTHON=python
```

OCR 页数和超时时间可在 `.env` 中调整：

```text
PDF_AGENT_OCR_MAX_PAGES=80
PDF_AGENT_OCR_LEADING_PAGES=40
PDF_AGENT_TIMEOUT_MS=1200000
```

## 4. 发布前检查

每次发布前至少执行：

```powershell
node --check server.js
node --check public\app.js
npm.cmd test
```

`npm test` 在部分 Windows PowerShell 环境会被执行策略拦截，可改用 `npm.cmd test`。

## 5. 备份与恢复

当前版本仍使用 JSON 数据文件。小范围内测时必须定期备份：

```text
data/db.json
data/uploads/
data/runtime/
logs/audit.log
```

可以直接运行：

```powershell
npm run backup
```

备份会生成到：

```text
backups/backup-时间戳/
```

恢复时停止服务，替换 `data/` 和 `logs/` 后重新启动。多人并发和长期运行建议尽快迁移到 SQLite WAL 或 PostgreSQL。
