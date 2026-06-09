# Lamp

[English](../README.md) | [简体中文](README_zh-CN.md) | [官网](https://www.shaloong.com/lamp/)

Lamp 是一款为创作者量身定制的现代化所见即所得编辑器——够轻、够快、够优雅。我们希望你像擦亮神灯一样，自由召唤灵感与想象。

## 亮点特性

- **零干扰的写作体验**：精选排版与色彩，减少 UI 噪声，把注意力留给文字。
- **轻量却不将就**：基于 TipTap 的富文本内核、常用 Markdown 快捷键、自动保存、版本保护与 AI 辅助润色/扩写。
- **跨平台桌面感觉**：Tauri + Vite 构建，一次打包即可投放 Windows/macOS/Linux。
- **永久免费**：Lamp 将长期以免费方式维护，无须担心订阅和授权。
- **社区驱动**：感谢所有开源生态的开发者，同时也欢迎你的 Issue、PR 与二次开发。

## 快速上手

```bash
pnpm install
pnpm tauri dev
```

第一条安装依赖，第二条同时启动 Vite（默认 1086 端口）与 Tauri 外壳。如果想拆分调试：

1. `pnpm dev`
2. `pnpm tauri dev`

## 打包发布

```bash
pnpm build           # 构建 Vite 静态资源
pnpm tauri build    # 交给 Tauri 生成安装包
```

Tauri 会在 `src-tauri/target/release/bundle/` 下输出对应平台的产物：Windows NSIS 安装包、macOS DMG、Linux 可分发目录。

## AI 配置

进入应用内 **设置 → AI 接口**，填写 `Base URL`、`Model` 与 `API Key`。配置会写入 `config.json`，下次启动自动复用。

## 社区与支持

Shaloong 目前仍是一个兴趣驱动的小型工作室，我们会在 [shaloong.com](https://www.shaloong.com/) 分享工具与灵感。欢迎提交 Issue/PR，一起把 Lamp 打磨成写作者得心应手的创作伙伴。
