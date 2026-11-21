# 星轨 ORBIT 2.5.10 · iOS

工程使用 SwiftUI 和 WKWebView，最低部署版本为 iOS 17。交付压缩包带有 `Orbit/www`，包含与安卓版本相同的界面和离线资源。

1. 解压后，在 Mac 用 Xcode 打开 `Orbit.xcodeproj`。
2. 选择 `Orbit` 方案和 iPhone 模拟器，点击运行。
3. 如果要在真机安装，在 `Signing & Capabilities` 选择自己的开发团队。若包标识已被占用，改成团队自己的标识，然后选择已连接的 iPhone 运行。

本机体验数据保存在 App 的应用支持目录。可从账号与数据页面通过「文件」导出或恢复 JSON 备份。Android 本机数据可用同一备份格式迁入。云端账号和 DeepSeek 需要网络，凭据存在 iOS 钥匙串。当前 iOS 的截止提醒在 App 打开时显示。

从仓库重新生成离线资源时，在仓库根目录执行 `npm run build:local`，然后运行 `node scripts/prepare-ios.mjs`。请在 Xcode 中验证首启、本机体验、杀掉进程后重开、文件导入导出和云端登录，再用于日常数据。
