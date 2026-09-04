# Changelog

Each release uses the same sections: Overview, Highlights, Downloads, Installation, and Known Limitations. The release workflow reads the entry matching the application version.

## [1.0.0]

### 概览 / Overview

Lamp 的首个公开版本：一款面向小说与长文创作者的本地优先桌面编辑器，提供文稿管理、写作进度反馈和可选 AI 辅助。基础编辑无需账号，也无需联网。

The first public release of Lamp, a local-first desktop editor for novels and long-form writing, with writing progress tracking and optional AI assistance.

### 主要变化 / Highlights

- **编辑与文稿管理**：富文本编辑、多标签页、文件夹工作区、文档内和工作区查找替换，支持 `.lmph`、`.md`、`.txt`、`.html`。
- **保存与恢复**：原子写入、外部修改覆盖确认、自动保存恢复副本；修复 Markdown 仅打开就提示保存、格式序列化失真、TXT 空行和部分替换边界问题。
- **写作反馈**：字数统计、每日目标、连续写作记录、贡献热力图和达标动效。
- **可选 AI**：接入自己配置的服务商，进行润色、扩写、续写与总结，并自行接受或拒绝建议。
- **插件机制**：内建与外部插件统一生命周期，独立设置与翻译，支持语言回退、失败回滚、资源清理和外部插件重载。
- **使用体验**：简洁启动页、中英文界面、浅色/深色/跟随系统主题；设置迁移至应用数据目录，不再依赖启动位置。

### 下载 / Downloads

从本页 Assets 选择对应系统和架构的文件。文件名格式为 `Lamp-v1.0.0-系统-架构[-setup].扩展名`。

Choose the matching system and architecture from the assets below.

| 系统 / System | 架构 / Architecture | 安装包 / Package |
| --- | --- | --- |
| Windows | x64 / arm64 | `-setup.exe`（常规安装 / standard installer）、`.msi` |
| macOS | arm64（Apple Silicon / M 系列）、x64（Intel） | `.dmg` |
| Linux | x64 / arm64 | `.AppImage`（便携 / portable）、`.deb`、`.rpm` |

Intel / AMD 电脑通常选择 `x64`；ARM 设备选择 `arm64`。请不要将 ARM64 与 Intel/AMD 64 位混淆。

### 安装说明 / Installation

- **Windows**：当前未使用受信任的代码签名证书，系统可能显示未知发布者或 SmartScreen 提示。请确认文件来自本仓库的 Release。Windows builds are not signed with a trusted publisher certificate.
- **macOS**：使用免费的 ad-hoc 签名，**未经过 Apple 公证**。首次打开可能被 Gatekeeper 拦截；仅在确认来源可信后，按 [Apple 官方说明](https://support.apple.com/zh-cn/102445)在“系统设置 > 隐私与安全”中使用可用的“仍要打开”。请勿全局关闭 Gatekeeper。macOS builds are ad-hoc signed, not notarized; see [Apple's instructions](https://support.apple.com/en-us/102445).
- **Linux**：`.AppImage` 需具有执行权限；`.deb`、`.rpm` 请按发行版选择。Make the AppImage executable, or choose the package for your distribution.
- **已有配置**：首次启动会尝试迁移旧 `config.json`，保留原文件；重要文稿仍建议另行备份。Existing settings are migrated when found; keep independent backups of important documents.

### 已知限制 / Known Limitations

- 自动保存生成恢复副本，不会定时覆盖原文稿，也不替代备份。Autosave creates recovery copies, not periodic saves to the original file or a backup system.
- Lamp 不是 Markdown 源码编辑器，无法保证任意 Markdown/HTML 源文件的语法与排版逐字往返保留。Arbitrary Markdown/HTML source fidelity is not guaranteed.
- 写作统计是本地近似反馈；部分界面文案仍未完全国际化。Writing progress is approximate; some interface text is not yet fully localized.
- AI 请求会将相关文本发送给配置的服务商，API Key 当前以明文配置存储；插件不是安全沙箱，请只加载可信代码。AI is opt-in; API keys are stored in plaintext, and plugins are not sandboxed.
- macOS/Linux 尚无完整的安装后 UI 自动化验证。Build availability does not imply complete installed-app testing on every platform.

反馈问题请前往 [Issues](https://github.com/shaloong/lamp/issues)，附上系统、架构、版本和复现步骤。
