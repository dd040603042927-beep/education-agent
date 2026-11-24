# 智慧教育智能体平台部署说明

## 多用户部署原则

不同电脑上的教师、学生和管理员必须访问同一个服务地址，例如 `http://服务器公网 IP:5000`。账号、班级、邀请码、课程资料和学习记录保存在该服务实例的同一份 SQLite 数据库中。

不要在教师电脑、学生电脑或多台服务器上分别运行 `node server.js` 并让用户混用这些地址。每一份 `DATA_DIR` 都是一套独立系统；邀请码提示“资源不存在”通常意味着邀请码创建在另一份数据库中。

当前存储实现适合一个应用进程配一份 SQLite 数据库。不要扩容为多个 Node 容器或多副本共享数据库文件；需要多实例部署时，应先把其余业务状态从 `app_state` 拆分到 PostgreSQL。

## 服务器启动

1. 将整个项目部署到一台持续运行的服务器。所有访问者使用同一个公网 IP 或域名。
2. 在项目根目录创建 `.env`，至少设置一个新的高强度 `SESSION_SECRET`。不要提交该文件。
3. 运行：

```powershell
docker compose up -d --build
```

Compose 会把宿主机的 `production-data/` 挂载到容器 `/app/data`，因此容器重建、服务器重启后仍会保留所有账号、班级和邀请码。默认将服务器 `5000` 端口映射到应用 `5107` 端口。

4. 在服务器本机检查：

```powershell
Invoke-RestMethod http://127.0.0.1:5000/api/healthz
```

返回的 `storagePath` 应为容器中的 `/app/data/education.db`。之后所有用户都从浏览器访问同一个公网地址，不要使用各自电脑的 `localhost`。

5. 在服务器安全组和防火墙中仅放行实际对外端口。正式公网使用应配置域名和 HTTPS 反向代理，并将 Compose 中的 `COOKIE_SECURE` 改为 `true` 后重新启动。

## 现有数据与邀请码

只复制代码不会复制班级和邀请码。迁移服务器时应在停服状态下备份并迁移完整的持久化目录：

```text
production-data/
production-logs/
```

如果邀请码只存在于旧的 `data/db.json`、而当前服务使用的是 `data/education.db`，说明 JSON 和 SQLite 是两套数据。先停止服务并备份，再按 [SQLite 迁移说明](./docs/SQLITE_MIGRATION.md) 执行迁移；已有 SQLite 新数据时不要直接使用 `--replace`，它会以旧 JSON 覆盖新数据，必须先确认哪一份才是权威数据。

## 局域网临时测试

无需 Docker 时，可在一台作为中心主机的电脑上设置：

```ini
HOST=0.0.0.0
PORT=5107
DATA_DIR=./data
STORAGE_DRIVER=sqlite
DATABASE_URL=file:./data/education.db
```

然后运行 `node server.js`。其他设备用 `http://中心主机 IP:5107` 访问；不要在其他设备再启动本项目。

## 备份和验证

在服务器上定期执行：

```powershell
npm run backup
npm run check
npm test
```

备份含用户资料和可能的模型密钥，应限制服务器目录权限。发布前还应使用不同浏览器或无痕窗口分别登录教师与学生账号，验证学生可通过教师生成的邀请码申请加入同一班级。
