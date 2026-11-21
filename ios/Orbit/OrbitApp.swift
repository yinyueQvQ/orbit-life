import SwiftUI
import UIKit
import WebKit
import Security
import UniformTypeIdentifiers

@main
struct OrbitApp: App {
    var body: some Scene {
        WindowGroup { OrbitView() }
    }
}

struct OrbitView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> OrbitController { OrbitController() }
    func updateUIViewController(_ controller: OrbitController, context: Context) {}
}

final class BundledAssets: NSObject, WKURLSchemeHandler {
    static let scheme = "orbit-app"
    static let host = "localhost"
    let root: URL

    init(root: URL) { self.root = root.standardizedFileURL }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, url.host == Self.host else {
            task.didFailWithError(URLError(.badURL))
            return
        }
        let component = url.path == "/" ? "local.html" : String(url.path.dropFirst())
        let file = root.appendingPathComponent(component).standardizedFileURL
        guard file.path.hasPrefix(root.path + "/"),
              let bytes = try? Data(contentsOf: file, options: .mappedIfSafe) else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        let known = ["html": "text/html; charset=utf-8", "js": "text/javascript",
                     "mjs": "text/javascript", "css": "text/css", "wasm": "application/wasm",
                     "woff2": "font/woff2", "svg": "image/svg+xml"]
        let type = known[file.pathExtension] ?? UTType(filenameExtension: file.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
        guard let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": type, "Access-Control-Allow-Origin": "*", "Content-Length": String(bytes.count)]) else {
            task.didFailWithError(URLError(.badServerResponse))
            return
        }
        task.didReceive(response)
        task.didReceive(bytes)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

struct OrbitFailure: LocalizedError {
    let message: String
    init(_ message: String) { self.message = message }
    var errorDescription: String? { message }
}

final class NoRedirects: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}

final class OrbitMessageProxy: NSObject, WKScriptMessageHandlerWithReply {
    weak var controller: OrbitController?
    init(_ controller: OrbitController) { self.controller = controller }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard let controller else { replyHandler(nil, "星轨已关闭"); return }
        controller.userContentController(userContentController, didReceive: message, replyHandler: replyHandler)
    }
}

final class OrbitController: UIViewController, WKNavigationDelegate, WKUIDelegate,
    WKScriptMessageHandlerWithReply, UIDocumentPickerDelegate {
    typealias Reply = (Any?, String?) -> Void
    private let root = URL.applicationSupportDirectory.appendingPathComponent("Orbit", isDirectory: true)
    private let syncURL = "https://orbit-life-production.up.railway.app"
    private let keychainService = Bundle.main.bundleIdentifier ?? "com.orbit.life.ios"
    private lazy var network = URLSession(configuration: .ephemeral, delegate: NoRedirects(), delegateQueue: nil)
    private var pendingFile: (kind: String, reply: Reply, temporary: URL?)?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        guard let assets = Bundle.main.url(forResource: "www", withExtension: nil),
              let scriptURL = Bundle.main.url(forResource: "Bridge", withExtension: "js"),
              let script = try? String(contentsOf: scriptURL, encoding: .utf8) else {
            let label = UILabel()
            label.text = "缺少星轨离线资源，请重新构建应用。"
            label.textAlignment = .center
            label.numberOfLines = 0
            label.frame = view.bounds
            label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            view.addSubview(label)
            return
        }
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundledAssets(root: assets), forURLScheme: BundledAssets.scheme)
        config.userContentController.addScriptMessageHandler(OrbitMessageProxy(self), contentWorld: .page, name: "orbit")
        config.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        web.uiDelegate = self
        web.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(web)
        let safe = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: safe.topAnchor), web.bottomAnchor.constraint(equalTo: safe.bottomAnchor),
            web.leadingAnchor.constraint(equalTo: safe.leadingAnchor), web.trailingAnchor.constraint(equalTo: safe.trailingAnchor)
        ])
        if let url = URL(string: "\(BundledAssets.scheme)://\(BundledAssets.host)/local.html") {
            web.load(URLRequest(url: url))
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let url = action.request.url
        decisionHandler(url?.scheme == BundledAssets.scheme && url?.host == BundledAssets.host ? .allow : .cancel)
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler reply: @escaping Reply) {
        guard message.frameInfo.isMainFrame,
              let url = message.frameInfo.request.url, url.scheme == BundledAssets.scheme, url.host == BundledAssets.host,
              let body = message.body as? [String: Any], let operation = body["operation"] as? String else {
            reply(nil, "无效请求来源")
            return
        }
        do {
            switch operation {
            case "status": reply(["session": secret("session") != nil, "ai": secret("deepseek") != nil], nil)
            case "clearSession": try setSecret("session", nil); reply(true, nil)
            case "configure": configure(reply)
            case "loadWorkspace": reply(try read(root.appendingPathComponent("workspace.json")) as Any? ?? NSNull(), nil)
            case "saveWorkspace":
                try save(body["value"], to: root.appendingPathComponent("workspace.json"), limit: 2_200_000)
                reply(true, nil)
            case "loadImage": reply(try read(imageURL(body["id"])) as Any? ?? NSNull(), nil)
            case "saveImage":
                guard let raw = body["value"] as? String,
                      let image = try JSONSerialization.jsonObject(with: Data(raw.utf8)) as? [String: Any] else {
                    throw OrbitFailure("图片格式无效")
                }
                let url = try imageURL(image["id"])
                if !FileManager.default.fileExists(atPath: url.path) { try save(raw, to: url, limit: 560_000) }
                reply(true, nil)
            case "deleteImage":
                let url = try imageURL(body["id"])
                if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
                reply(true, nil)
            case "export": try exportFile(body, reply)
            case "request":
                guard let request = body["request"] as? [String: Any], let kind = request["type"] as? String else {
                    throw OrbitFailure("请求格式无效")
                }
                if ["import", "importImage", "importPdf"].contains(kind) { try importFile(kind, reply) }
                else { send(request, kind: kind, reply: reply) }
            default: throw OrbitFailure("不支持的操作")
            }
        } catch { reply(nil, error.localizedDescription) }
    }

    private func read(_ url: URL) throws -> String? {
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        return try String(contentsOf: url, encoding: .utf8)
    }

    private func save(_ value: Any?, to url: URL, limit: Int) throws {
        guard let value = value as? String, value.utf8.count <= limit else { throw OrbitFailure("数据太大或格式无效") }
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data(value.utf8).write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }

    private func imageURL(_ value: Any?) throws -> URL {
        guard let id = value as? String, id.range(of: #"^[-a-zA-Z0-9_]{8,80}$"#, options: .regularExpression) != nil else {
            throw OrbitFailure("图片编号无效")
        }
        return root.appendingPathComponent("images", isDirectory: true).appendingPathComponent(id + ".json")
    }

    private func secretQuery(_ name: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: keychainService, kSecAttrAccount as String: name]
    }

    private func secret(_ name: String) -> String? {
        var query = secretQuery(name)
        query[kSecReturnData as String] = true
        var value: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &value) == errSecSuccess, let data = value as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private func setSecret(_ name: String, _ value: String?) throws {
        let query = secretQuery(name)
        guard let value else {
            let result = SecItemDelete(query as CFDictionary)
            if result != errSecSuccess && result != errSecItemNotFound { throw OrbitFailure("清除安全凭据失败") }
            return
        }
        let update: [String: Any] = [kSecValueData as String: Data(value.utf8)]
        var result = SecItemUpdate(query as CFDictionary, update as CFDictionary)
        if result == errSecItemNotFound {
            var item = query.merging(update) { _, value in value }
            item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            result = SecItemAdd(item as CFDictionary, nil)
        }
        guard result == errSecSuccess else { throw OrbitFailure("保存安全凭据失败") }
    }

    private func configure(_ reply: @escaping Reply) {
        let alert = UIAlertController(title: "配置团团 AI", message: "DeepSeek 密钥保存在本机钥匙串。聊天及按需查询的记录会发送给 DeepSeek。", preferredStyle: .alert)
        alert.addTextField { $0.isSecureTextEntry = true; $0.placeholder = "DeepSeek API Key" }
        alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in reply(self.secret("deepseek") != nil, nil) })
        alert.addAction(UIAlertAction(title: "保存", style: .default) { [weak alert] _ in
            let value = alert?.textFields?.first?.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            do {
                guard (12...512).contains(value.count) else { throw OrbitFailure("请检查密钥") }
                try self.setSecret("deepseek", value)
                reply(true, nil)
            } catch { reply(nil, error.localizedDescription) }
        })
        present(alert, animated: true)
    }

    private func importFile(_ kind: String, _ reply: @escaping Reply) throws {
        guard pendingFile == nil else { throw OrbitFailure("请先完成上一次文件选择") }
        let types: [UTType] = kind == "importPdf" ? [.pdf] : kind == "importImage" ? [.image] : [.json]
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: types, asCopy: true)
        picker.delegate = self
        pendingFile = (kind, reply, nil)
        present(picker, animated: true)
    }

    private func exportFile(_ body: [String: Any], _ reply: @escaping Reply) throws {
        guard pendingFile == nil else { throw OrbitFailure("请先完成上一次文件选择") }
        let raw = body["name"] as? String ?? "orbit-backup.json"
        let name = raw.replacingOccurrences(of: #"[^a-zA-Z0-9._-]"#, with: "_", options: .regularExpression)
        guard !name.isEmpty, name != ".", name != ".." else { throw OrbitFailure("文件名无效") }
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let file = folder.appendingPathComponent(name)
        try save(body["value"], to: file, limit: 33_554_432)
        let picker = UIDocumentPickerViewController(forExporting: [file], asCopy: true)
        picker.delegate = self
        pendingFile = ("export", reply, folder)
        present(picker, animated: true)
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        finishFile(error: "已取消文件选择")
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let pending = pendingFile, let url = urls.first else { finishFile(error: "未选择文件"); return }
        if pending.kind == "export" { finishFile(value: true); return }
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        do {
            let limit = pending.kind == "import" ? 33_554_432 : 8_388_608
            let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? Int.max
            guard size <= limit else { throw OrbitFailure("文件超过大小限制") }
            let data = try Data(contentsOf: url, options: .mappedIfSafe)
            guard data.count <= limit else { throw OrbitFailure("文件超过大小限制") }
            if pending.kind == "import" {
                guard let content = String(data: data, encoding: .utf8) else { throw OrbitFailure("备份文件须为 UTF-8 JSON") }
                finishFile(value: ["content": content])
            } else {
                let mime = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
                finishFile(value: ["name": url.lastPathComponent, "mime": mime, "base64": data.base64EncodedString()])
            }
        } catch { finishFile(error: error.localizedDescription) }
    }

    private func finishFile(value: Any? = nil, error: String? = nil) {
        guard let pending = pendingFile else { return }
        pendingFile = nil
        if let folder = pending.temporary { try? FileManager.default.removeItem(at: folder) }
        pending.reply(value, error)
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: "星轨", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "确定", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: "星轨", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "确定", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }

    private func send(_ body: [String: Any], kind: String, reply: @escaping Reply) {
        Task { @MainActor in
            do { reply(try await request(body, kind: kind), nil) }
            catch { reply(nil, error is OrbitFailure ? error.localizedDescription : "网络连接失败，请稍后重试") }
        }
    }

    private func request(_ body: [String: Any], kind: String) async throws -> [String: Any] {
        let data = body["body"] as? [String: Any] ?? [:]
        let path = body["path"] as? String ?? ""
        let method = body["method"] as? String ?? "GET"
        let remotePaths: Set<String> = [
            "/api/auth/me", "/api/auth/register", "/api/auth/login", "/api/auth/recover", "/api/auth/logout",
            "/api/auth/password", "/api/life", "/api/chat", "/api/chat/actions", "/api/account/export",
            "/api/account/import", "/api/account/migrate", "/api/account/state", "/api/account/ai",
            "/api/plans/draft", "/api/journal/reflect", "/api/media"
        ]
        let aiRequest = kind == "complete"
        let needsAI = aiRequest || path.hasPrefix("/api/chat") || path == "/api/plans/draft" || path == "/api/journal/reflect"
        let media = path.range(of: #"^/api/media/[-a-zA-Z0-9_]{8,80}$"#, options: .regularExpression) != nil
        guard aiRequest || (kind == "remote" && (remotePaths.contains(path) || media) && ["GET","POST","DELETE"].contains(method)),
              let url = URL(string: aiRequest ? "https://api.deepseek.com/chat/completions" : syncURL + path) else {
            throw OrbitFailure("不支持的网络操作")
        }
        let key = needsAI ? secret("deepseek") : nil
        if aiRequest && key == nil { throw OrbitFailure("请先配置 DeepSeek 密钥") }
        var request = URLRequest(url: url, timeoutInterval: needsAI ? 165 : 20)
        request.httpMethod = aiRequest ? "POST" : method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if aiRequest {
            request.setValue("Bearer " + (key ?? ""), forHTTPHeaderField: "Authorization")
        } else {
            request.setValue("native", forHTTPHeaderField: "X-Orbit-Client")
            if let token = secret("session") { request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization") }
            if let key { request.setValue(key, forHTTPHeaderField: "X-Orbit-AI-Key") }
        }
        if request.httpMethod == "POST" { request.httpBody = try JSONSerialization.data(withJSONObject: data) }
        let (bytes, raw) = try await network.data(for: request)
        guard let response = raw as? HTTPURLResponse, bytes.count <= 33_554_432 else { throw OrbitFailure("服务返回异常") }
        let status = response.statusCode
        var text = String(decoding: bytes, as: UTF8.self)
        if let key, !key.isEmpty { text = text.replacingOccurrences(of: key, with: "[已隐藏]") }
        guard var result = (try? JSONSerialization.jsonObject(with: Data(text.utf8))) as? [String: Any] else {
            throw OrbitFailure("服务返回异常（\(status)）")
        }
        if aiRequest {
            guard status == 200 else { throw OrbitFailure("DeepSeek 服务请求失败（\(status)）") }
            return result
        }
        if let token = result.removeValue(forKey: "token") as? String, (200..<300).contains(status) {
            try setSecret("session", token)
        }
        if path == "/api/auth/logout", (200..<300).contains(status) { try setSecret("session", nil) }
        return ["status": status, "data": result]
    }
}
