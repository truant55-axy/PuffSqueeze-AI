# 玩偶 Wi-Fi 控制转发

这是控制数据服务，不是完整网页、PHP 数据库或小智语音服务。

## 当前状态（2026-10-16）

- Wrangler 已获得用户本人授权，使用 `account:read`、`user:read`、`workers_scripts:write` 权限。
- 已实际部署至 `https://puffsqueeze-grip.1850190464.workers.dev`，替换原 Hello World。
- 部署版本：`29a61d48-8124-493a-b949-3240e10a4d65`。
- Cloudflare 部署输出确认 `GRIP_ROOMS (GripRoom)` Durable Object 绑定存在。
- 依赖已安装（安装时禁用生命周期脚本），Worker 打包上传及平台启动成功；未运行额外测试、网页/设备 WebSocket 端到端检查或硬件烧录。
- 主网站、账号数据库仍未部署。2026-10-18 已增加钓鱼/飞行网页无线接收和本地小智合并源码，接线 GPIO8；配对、烧录及实际端到端验证尚未执行，详见 `../../docs/WIRELESS_GRIPS.md`。

## 部署

需要 Node.js LTS 与 npm。此目录单独安装依赖，不改动网页依赖。

```powershell
Set-Location 'E:\STUDY\year4\ENT\PuffSqueeze-AI-main\deploy\wireless'
npm install
npm run login
npm run deploy
```

登录时使用创建 `puffsqueeze-grip` 的同一个 Cloudflare 账号。部署更新同名 Worker，并通过 `v1` 迁移创建 **SQLite** Durable Object 类 `GripRoom`，绑定名 `GRIP_ROOMS`。免费账户使用 SQLite 版；不要改成 `new_classes`（旧 KV 版）。首次部署已完成，后续更新保留同一个 `v1` 迁移，不能重新创建或删除现有命名空间。

本机部署时，Node 已加入工具进程 PATH；npm 临时工具位于忽略的 `.tools/package/bin/npm-cli.js`。如果其他终端没有 npm，可安装 Node.js LTS，或用现有 Node 显式调用这些 JS 文件。此次 CLI 网络连接使用了电脑已配置的 `127.0.0.1:7897` 系统代理，通过 `HTTPS_PROXY` / `HTTP_PROXY` 仅传给本次命令，没有修改系统代理配置。更换网络/关闭代理后需按实际情况调整，不将该地址写入网页或设备代码。

只粘贴 `worker.js` 无法代替配置文件创建资源。CLI 完整部署后，后续同名类的纯代码修改才可以在控制台编辑器中进行。

官方依据：
- https://developers.cloudflare.com/durable-objects/get-started/
- https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/
- https://developers.cloudflare.com/durable-objects/platform/pricing/

免费额度并非无限，超出免费配额会失败；不要主动升级付费套餐。网络可达与游戏延迟需在实际设备上确认，打开 Hello World 只证明 HTTP 地址可访问。

## 协议 v1

- `GET /health`：公开服务状态；`ready` 只表示绑定存在，不是端到端验证成功。
- 玩偶：`wss://你的Worker域名/connect/device`，握手 `Authorization: Bearer <pairingKey>`。
- 网页：`new WebSocket('wss://你的Worker域名/connect/browser', ['puffsqueeze-grip-v1', 'grip-key.' + pairingKey])`。
- 配对密钥：用安全随机源生成 32 字节，再转换成无填充 base64url，恰好 43 字符。不同玩偶使用不同密钥；网页将其按用户保存，不把密钥写入源码、URL、聊天记录或截图。
- 这是原型的持有密钥即授权方案，没有账号所有权校验、短码配对、遗失撤销或网站登录令牌验证；后续产品绑定需要由 PHP 账号后端管理。该服务不会替网站保存使用记录。
- 私密密钥的 SHA-256 用作独立房间名，互不广播。每房间最多一个网页和一个设备，后连接替换旧连接（关闭码 4001）。浏览器不得发送控制帧。
- 可选 Worker 环境变量 `ALLOWED_ORIGINS`：允许连接的网站来源，逗号分隔。空值暂不限制来源，仍需要私密配对密钥；上线网站地址确定后应填写精确的 HTTPS 来源。

设备发送：

```json
{"type":"puffsqueeze:grip","seq":1,"left":0,"right":0}
```

`seq` 在每次连接内严格递增；铜箔只上报 `0`（松开）或 `1`（触摸），不是握力。状态变化后立即发送，握持与松开时都至少每 250ms 心跳发送一次，正常上限 25 帧/秒，服务端超过 40 帧/秒关闭。单条消息最多 512 字符，不发送音频。

连接/重连后必须双侧松开一次才接收握住数据。网页收到 `puffsqueeze:status` 时先清空按键状态；`release_required` 要求先松开，`waiting_for_device` 等待设备，`device_disconnected` 为设备断开。

转发帧增加 `stream`（设备连接标识）与 `received_at`（服务端毫秒时间）。每次网页连接的状态消息含 `server_time`，可估计时钟偏差。网页必须丢弃重复序号、延迟旧帧，并在 1 秒左右未收到控制心跳时自动释放/暂停，不能无限维持上一帧。服务端不保存最近握持状态，不在重连后回放旧输入。

## ESP32-S3 与网页剩余接线

官方小智固件由 ESP-IDF 构建；之前 Arduino 铜箔测试是独立程序。要把触摸采样与上述 WSS 客户端合到小智的自定义开发板中，不能先后烧录两个独立固件来叠加功能。需要确认实际模块的 Flash/PSRAM 型号、麦克风/功放/屏幕/铜箔引脚，避免冲突。WSS 必须校验证书，不能使用跳过证书检查的配置。

网页 `gripSerial.ts` 保留 USB；`gripWireless.ts` 与 `WirelessGripPanel` 提供无线接收、配对文件下载和失联释放，并接入钓鱼/飞行输入。固件使用独立自定义开发板，小智官方语音走原有语音连接，触摸单独连接本服务。需要把配对文件放入固件目录、重新配置编译并确认备份与分区后烧录，当前尚未进行真实无线联调。玩偶和网页可以处于不同网络，但校园 Wi-Fi 可能有联网限制。
