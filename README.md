# 星轨 ORBIT 2.0

习惯打卡、收支账本、目标备忘、收入储蓄规划、自定义专注与 AI 伙伴「团团」。

## 直接使用

在 GitHub Releases 下载：
- Windows：`Orbit-Life-Windows.zip`，完整解压后双击「启动星轨.cmd」，自带 Node 运行环境。地址 http://127.0.0.1:4318/ 。停止服务用「停止星轨.cmd」。
- Android 8.0+：`Orbit-Life-Android.apk` 或安卓压缩包。覆盖安装保留原数据，不要先卸载。2.0 使用与旧版相同的签名。

安装包与源码均不含 API 密钥、用户记录或签名私钥。

## 账号、数据库与同步

- 云端账号：电脑和手机登录同一星轨账号，数据存入账号数据库；打开页面、切回应用及每 20 秒刷新。写入采用版本检查，冲突提示刷新，不静默覆盖其他设备。
- 本机账号：Windows SQLite 账号，数据只在本电脑。云端网页和安卓使用云端账号。
- 本机体验：无需注册，Windows SQLite／安卓私有 SQLite 存储。旧版数据保留。
- 云端账号页提供可选的“预览本机数据迁移”。登录不会自动迁移或绑定；确认后仅补充缺少的习惯、打卡、账目、目标、备忘、专注记录，保留云端已有记录及本机原件。重复迁移去重；预算、预测、AI 对话及设置不覆盖。
- 密码使用 scrypt 加盐哈希；会话使用 HttpOnly Cookie（电脑）或 Android Keystore 加密令牌（手机）。恢复码只显示一次，请妥善保存。
- 云端入口：https://orbit-habit-life.purplepark65.chatgpt.site 。入口已公开，个人记录仍受账号保护。但目前原生请求遭遇 Cloudflare 403 网关拦截，公网登录和同步尚未恢复；2.0.1 会明确显示网关错误，不将其误报为密码错误或尚未开放。源码公开不代表个人数据公开。
- 网络断开时安卓可读取当前账号缓存，账号写入需要联网。进行中的计时器按设备保存，完成专注记录参与同步。

电脑数据库为 `data/orbit.sqlite`。复制整个 data 目录前先停止服务。GitHub 用于同步源码与发布安装包，个人记录存放在账号数据库，不提交到公开仓库。

## 功能

- 习惯：新建、搜索、分类、编辑、重复星期、归档／恢复、删除。
- 打卡：当天完成、历史补记、按习惯与日期查看、修改日期与备注、删除。删除习惯会一并删除该习惯的打卡记录。
- 专注：1–720 分钟、自定义休息 1–120 分钟、暂停／继续、关联事项、按真实截止时间恢复、完成历史与统计。
- 账本：收入支出增删改查、分类、月份筛选、预算与导出。
- 目标与备忘：关联目标、截止日期、完成状态、编辑删除；支持生活目标与储蓄目标。
- 规划：预计到手＝工资＋奖金加班＋其他收入－扣款；预计可存＝到手－生活支出；储蓄缺口＝计划存款－预计可存，最低零。预测不会记为实际收入，目标积累金额需单独维护。
- 团团：查询相关数据，提出打卡、记账、目标、备忘、规划及专注设置的操作建议，用户确认后才写入。

## AI 密钥

Windows 双击「配置团团AI.cmd」输入 DeepSeek 密钥，Windows DPAPI 加密保存到 `%LOCALAPPDATA%/Orbit/deepseek.key.dpapi`，在项目外。也可使用后端环境变量 `DEEPSEEK_API_KEY`，不要加 VITE_ 或 NEXT_PUBLIC_ 前缀。

安卓在账号页 AI 设置中输入自己的密钥，由 Android Keystore 加密。云端账号聊天时，设备通过 HTTPS 临时向后端提供密钥用于 DeepSeek 请求，不写入账号数据库；网页客户端不提供密钥输入。聊天及请求查询的数据将发给 DeepSeek。固定官方 HTTPS 接口，模型 `deepseek-flash`。

AI 不执行系统命令、读取任意文件或进行转账；操作需要确认。已发送到聊天或公开的密钥应在服务商后台更换。

## 开发

Node.js 24：

```sh
npm ci
npm run build:local
npm run start:local
npm run test:domain
npx tsc --noEmit
```

`npm run build` 构建云端，使用 D1；`db/schema.ts` 与 `drizzle/` 保存数据库迁移。`server/accounts.mjs` 是电脑与云端共用的账号 API，`shared/` 为状态及 AI 逻辑，`mobile/runtime.mjs` 和 `android/` 为安卓桥接，`app/v2.css` 为新版响应式界面。

`npm run build:android` 需要 Java 21、Android Build Tools 35 和 Platform 35。SDK 默认 `%LOCALAPPDATA%/Orbit/android-sdk`；可设置 `ORBIT_ANDROID_SDK`。签名文件及口令保存在 `%LOCALAPPDATA%/Orbit/`，不在仓库；请自行备份，更新必须使用同一签名。构建检查 APK 内资源路径，避免 Windows 反斜杠引起安卓黑屏。

发布前运行 `node scripts/scan-secrets.mjs` 检查源码、Git 历史、APK、Windows 包和前端产物。`.gitignore` 排除数据库、密钥、日志、签名及输出。中文字体 Noto Sans SC 和 Ma Shan Zheng，授权在 `public/fonts/`。
