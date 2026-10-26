# 星轨 ORBIT

一个以星际伙伴「团团」为中心的生活管理应用：习惯打卡、收支账本、目标备忘、下月收入与储蓄规划，以及可以查询记录、提出操作建议的 DeepSeek AI 伙伴。

## 电脑本地版

需要 Node.js 24+。首次下载源码后执行：

```sh
npm ci
npm run build:local
npm run start:local
```

Windows 也可以双击「启动星轨.cmd」；首次使用前先完成上面的依赖安装与构建。「停止星轨.cmd」可停止服务。地址固定为 http://127.0.0.1:4318/，无需 ChatGPT 登录，仅监听本机。

数据：`data/orbit.sqlite`，与线上旧版独立。升级到本版本时会自动保留、迁移旧本地习惯和账本。备份电脑数据前先停止应用，再复制整个 `data/` 目录。

## 团团 AI 与密钥

双击「配置团团AI.cmd」，在密码式输入框中输入自己的 DeepSeek 密钥。密钥由 Windows DPAPI 加密存入 `%LOCALAPPDATA%/Orbit/deepseek.key.dpapi`，不写入项目目录、前端代码、聊天记录或 Git。

也支持后端读取 `DEEPSEEK_API_KEY` 环境变量。不要使用 VITE_ 或 NEXT_PUBLIC_ 前缀保存密钥，不要把密钥粘贴到聊天里。接口固定为 DeepSeek 官方 HTTPS 地址，模型为 `deepseek-flash`。

聊天内容以及你要求团团查询的相关应用数据会发送至 DeepSeek。AI 只能读取白名单范围，并提出更改建议；必须由用户在确认卡片点击后执行。不支持执行系统命令、读取电脑文件、转账或金融交易。历史保存在本机，最近 6 轮对话作为上下文。请求失败不会假装成功。

## 目标备忘与规划

- 备忘可以关联目标、设置截止日期、勾选完成、编辑或删除。
- 目标可为普通生活目标，或带目标金额、已有积累的储蓄目标。
- 预计到手＝预计工资＋奖金／加班＋其他收入－扣款。
- 预计可存＝预计到手－预计生活支出。
- 储蓄缺口＝计划存款－预计可存（最低为零）。
- 预计数与实际账本分开保存，不会把预测收入当作已到账；储蓄目标的积累金额也由用户单独更新。

## 安卓版

请使用 1.0.2 或更新版本。1.0.0／1.0.1 存在 Windows 打包路径错误，会导致安卓黑屏；1.0.2 已修复并加入资源路径回归检查和原生启动失败提示。更新时直接覆盖安装，不要卸载，以保留本机数据。

`release/Orbit-Life-Android.apk` 为安卓安装包，压缩包内包含它和安装说明。Android 8.0+，建议更新系统 Android WebView。无需电脑服务器；习惯、账本、备忘与规划离线使用，AI 需要联网。

首次使用在应用「AI 设置」中单独输入自己的 DeepSeek 密钥，由 Android Keystore 加密保存在该手机。APK 与 GitHub 不含任何用户密钥。手机与电脑目前独立保存数据，不自动同步。手机顶部提供 JSON 备份和恢复；备份不含 API 密钥。恢复会替换本机数据，先备份再操作。卸载应用会删除手机本地记录。

### 构建安卓 APK

```sh
npm run build:android
```

需要 Java 21、Android Build Tools 35 与 Android Platform 35。将 `ORBIT_ANDROID_SDK` 指向包含 `build-tools/` 和 `platform/android.jar` 的 SDK 目录；未指定时使用 `%LOCALAPPDATA%/Orbit/android-sdk`。当前构建脚本面向 Windows，不依赖 Android Studio 或 Gradle。

签名文件在 `%LOCALAPPDATA%/Orbit/android-signing.p12`，口令文件同目录；均不属于项目、不会提交 Git。应自行备份签名文件，使用同一签名才能覆盖安装并保留手机数据。

## 开发与验证

```sh
npm run test:domain
npx tsc --noEmit
npm run build:local
```

- `shared/domain.mjs`：跨电脑／手机的状态、验证、备忘及收支计算。
- `shared/workspace.mjs`：API 与 AI 工具、确认流程。
- `local/server.mjs`：电脑 SQLite、回环 HTTP 与 DeepSeek 请求。
- `mobile/runtime.mjs`：安卓本地数据适配。
- `android/`：WebView、Android Keystore、HTTPS 与文件导入导出。
- `app/page.tsx`、`components/`、`app/globals.css`：界面。

仓库还保留最初的 Sites 服务端模板；最新目标、规划和 AI 功能以本地版及安卓版为准，不能直接假设旧在线版已包含这些功能。

## 隐私与仓库

`.gitignore` 排除了数据库、运行日志、密钥文件、签名文件、依赖与构建输出。分享源码不包含你的个人记录或 API 凭据；忽略规则不替代提交前检查。任何已经公开或发送到聊天中的密钥都应在服务商后台更换。

中文字体采用 Noto Sans SC 和 Ma Shan Zheng，字体授权在 `public/fonts/` 中。
