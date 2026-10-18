# Serv00 主网站部署

用户选择免费、免绑卡方案，注册申请已提交，当前等待人工审核。Cloudflare 只部署了无线转发服务，主网站和数据库仍未上线。

2026-10-16 已生成上传包：`deploy/artifacts/serv00/2026-10-15T18-25-46-874Z.zip`（文件名时间戳为 UTC）。生产构建成功，Vite 提示主 JS 分包较大；没有进行功能测试或设备联调。上传包目录与私有配置排除规则已检查。后续修改网页或后端代码后应重新打包，不能继续上传旧包。

此包目前已过时：不含随后调整的 Aviator 难度（更快的飞行、更多障碍物）。正式上传前运行下面的打包命令生成新包。

## 本地上传包

在项目根目录运行（需要 Node 与现有网页依赖）：

```powershell
node deploy/serv00/package.mjs
```

脚本构建生产网页到新的时间戳目录，然后生成 ZIP。文件位于 `deploy/artifacts/serv00/`。不会删除旧的部署包，也不会修改现有 `dist` 或 `.env.local`。包内包含源码运行所需 PHP 与空白配置模板，不含本机密码、AI 密钥、数据库记录或备份。

## 账号获批后再进行

1. 查看开通邮件中的主机名、用户名、管理面板和分配网址。密码由用户自行保管，不发到聊天。
2. 在 DevilWEB 为分配网址配置 PHP 类型网站，PHP 8.3，开启 HTTPS/证书。
3. 通过 SFTP 上传 ZIP，放在对应域名目录，不放在公开网页目录中。解压后应是：

```text
domains/实际域名/
├── public_html/                 网页公开目录
│   ├── index.html
│   ├── api.php
│   ├── .htaccess
│   ├── .user.ini
│   ├── assets/
│   └── games/
└── puffsqueeze-private/         PHP 与配置；在公开目录之外
    └── backend/
        ├── .env.example
        ├── api/
        ├── services/
        ├── scripts/
        └── sql/
```

4. 在面板创建 MySQL 数据库及用户，把面板提供的真实主机名、库名、用户名、密码写入私有 `backend/.env`（从 `.env.example` 复制）。保持前端接口为同源 `/api`，不要填写 localhost 或旧的局域网 IP。
5. 需要保留旧账号/记录时，先在原网页来源完成账号数据同步，导出本机数据库所有表，私下导入到新库。备份保存于公开目录外。初始化脚本不会代替旧数据迁移。
6. SSH 切换到实际域名目录，运行 `php83 puffsqueeze-private/backend/scripts/prepare-production.php`，只对新库初始化或迁移；不要指向本机或其他生产数据库。全新数据库无需导入旧记录。不要通过网页公开一个初始化入口。
7. 使用 HTTPS 打开网站。实际验证登录、保存、API 路由和游戏需要在账号开通并部署后进行，当前没有做远程验证。

PHP 文件读取范围必须覆盖同域名目录内的 `puffsqueeze-private`，若面板启用 open_basedir，不能只允许 `public_html`。本方案使用托管 PHP 与 MySQL，不在 Serv00 运行 Docker 或 PHP 内置开发服务器。

`.htaccess` 强制 HTTPS，并把 `/api/*` 转给唯一公开 PHP 入口 `api.php`；私有后端代码通过固定相对路径加载，不能从 URL 直接读取。已准备 Authorization 头转发和 PHP 兼容恢复，实际环境仍需确认。

`GEMINI_API_KEY` 留空时，网页 AI 仍需要后续配置才能回答。小智官方设备语音、网页 AI 和网站数据库是三项独立配置，不会自动共用聊天历史。网页无线接收和设备合并固件仍待开发。

Serv00 的 .htaccess 由 Nginx 的兼容模块处理，不完全等同于原 Docker Nginx 配置；登录和 AI 的网关限速需要按托管面板支持设置。首次连接需要核对平台提供的 SSH 主机指纹，不能跳过主机校验。

官方资料：
- https://www.serv00.com/register-account/ （审核通常为几小时至 72 小时）
- https://docs.serv00.com/WWW/
- https://docs.serv00.com/PHP/
- https://docs.serv00.com/htaccess/
- https://docs.serv00.com/
