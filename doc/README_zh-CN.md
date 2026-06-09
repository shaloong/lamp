# Lamp

[English](../README.md) | [简体中文](README_zh-CN.md) | [官网](https://www.shaloong.com/lamp/)

Lamp 是一款现代化的跨平台、零干扰桌面编辑器，专为写作者打造。由 Shaloong 工作室倾力呈现，它将极简主义 WYSIWYG 的优雅体验与 Markdown 风格的排版工具、AI 辅助功能，以及让你在每个桌面操作系统上都倍感原生体验的 Tauri 外壳完美融合。

## 亮点特性

- **零干扰的写作体验**：精心调校的排版与极简界面设计，让注意力始终聚焦于内容本身。
- **轻量却不将就**：基于 TipTap 的富文本编辑器、常用 Markdown 快捷键、行内格式化、文档树、自动保存、版本快照，以及 AI 润色与扩写工具。
- **真正的桌面原生感**：一份代码同时覆盖 Windows、macOS 和 Linux，基于 Tauri 构建。
- **永久免费**：Lamp 坚持开源透明，将长期免费提供下载与使用。
- **社区驱动**：依托于慷慨的开源生态，同时也欢迎你的 Issue、PR 与二次开发。

## 快速上手

```bash
pnpm install
pnpm tauri dev
```

第一条命令安装依赖，第二条同时启动 Vite 开发服务器（默认 1086 端口）和 Tauri 外壳。如果想分开手动启动：

1. `pnpm dev`
2. `pnpm tauri dev`

## 打包发布

```bash
pnpm build           # 构建 Vite 静态资源到 dist/
pnpm tauri build     # 调用 Tauri 打包工具生成安装包
```

Tauri 会在 `src-tauri/target/release/bundle/` 下输出对应平台的产物：Windows NSIS 安装包、macOS DMG、Linux 可分发目录。

## AI 配置

在桌面应用中打开 **设置 → AI**，填写你的服务提供商的 Base URL、Model 和 API Key。配置会持久化到 `config.json`，下次启动自动复用。

## 社区与支持

Shaloong 目前是一个兴趣驱动的小型工作室。我们会在 [shaloong.com](https://www.shaloong.com/) 分享工具与灵感。发现 Bug 或想贡献功能？欢迎提交 Issue/PR，每一份反馈都在帮助 Lamp 成为写作者更得心应手的创作伙伴。
