# Lamp

Lamp 是一款面向小说与长文创作的开源桌面编辑器，基于 Tauri、Vue 和 TipTap 构建，提供专注的编辑体验、本地文件管理与写作进度统计。

[English](../README.md) | [下载](https://github.com/shaloong/lamp/releases) | [问题反馈](https://github.com/shaloong/lamp/issues)

## 功能

- **专注编辑**：富文本排版、段落专注模式，以及浅色、深色和跟随系统的主题。
- **文档管理**：文件夹工作区、多文档标签页，支持文档内和整个工作区的查找替换。
- **草稿恢复**：自动保存恢复副本，启动时可恢复未完成的草稿。
- **写作统计**：字数统计、每日目标、连续写作记录、写作热力图与目标达成动效。
- **本地文件**：支持 Lamp 文档（`.lmph`）、Markdown（`.md`）、纯文本（`.txt`）和 HTML（`.html`），基础写作无需联网或注册账号。
- **可选 AI 辅助**：接入自己配置的服务商，进行润色、扩写、续写与总结，自行选择接受或拒绝建议。
- **插件扩展**：通过插件添加命令、面板、编辑工具、主题与 AI 操作。

## 下载安装

前往 [Releases](https://github.com/shaloong/lamp/releases)，选择适合你系统的安装包。

| 系统 | 架构 | 安装包 |
| --- | --- | --- |
| Windows | x64 / arm64 | `.exe` 安装程序、`.msi` |
| macOS | x64（Intel）/ arm64（Apple Silicon） | `.dmg` |
| Linux | x64 / arm64 | `.AppImage`、`.deb`、`.rpm` |

Intel 或 AMD 电脑选择 `x64`；ARM 设备（包括 Apple Silicon Mac）选择 `arm64`。具体可用安装包以对应 Release 为准。

文件名包含版本、系统和架构，例如 `Lamp-v1.0.0-Windows-x64-setup.exe`。

## 使用

新建或打开文档即可开始写作，也可以将文件夹作为工作区打开，集中管理章节。通过标签页切换文稿，修改时可在整个工作区内查找内容。

文稿保存在本地。自动保存的恢复副本用于帮助找回意外中断的内容，请仍然正常保存文档，并为重要作品保留备份。

如需 AI 辅助，在 **设置 > AI** 中配置服务商。AI 请求涉及的文本会发送给该服务商；编辑与保存文档不依赖 AI。

## 开发

### 环境要求

- Node.js 24，以及 [package.json](../package.json) 中指定版本的 pnpm。
- 稳定版 Rust，以及 [Tauri 对应平台的依赖](https://v2.tauri.app/start/prerequisites/)。

### 运行与构建

在仓库根目录执行：

```bash
pnpm install
pnpm tauri dev       # 启动桌面开发环境
pnpm run check       # 版本检查、代码检查、测试与前端构建
pnpm tauri build     # 构建桌面应用和安装包
```

`pnpm dev` 仅启动前端服务，端口为 `1086`。需要本地文件访问等桌面能力时，请使用 `pnpm tauri dev`。构建产物位于 `src-tauri/target/release/`，安装包位于其 `bundle/` 子目录。

### 项目结构

- `src/`：Vue 前端、编辑器与应用状态。
- `src/plugins/`：插件宿主与公共 API；`src/builtins/`：内建插件。
- `src-tauri/`：Rust 桌面后端与平台配置。
- `scripts/`：版本管理工具与回归测试。

### 发布

运行 `pnpm run version:set -- <版本>` 同步应用版本，完成检查并提交变更。推送对应的 `v<版本>` tag 后，[发布工作流](../.github/workflows/release.yml) 会构建上述六个系统与架构组合，并生成待审核的草稿 Release。

## 插件开发

内建插件与外部插件使用同一套扩展机制。插件独立管理设置和翻译，通过插件 API 访问应用能力。

API、生命周期与扩展点说明见[插件开发指南](PLUGIN_SYSTEM.md)。

## 参与贡献

欢迎提交问题、功能建议、代码与翻译。[反馈问题](https://github.com/shaloong/lamp/issues)时，请附上操作系统、Lamp 版本与复现步骤。提交代码变更前，请运行 `pnpm run check`。

## 许可证

[MIT](../LICENSE)
