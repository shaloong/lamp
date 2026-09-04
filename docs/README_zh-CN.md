<p align="center">
  <img src="../res/app.png" width="72" height="72" alt="Lamp">
</p>

<h1 align="center">Lamp</h1>

<p align="center">
  <strong>专注写作，让故事继续。</strong><br>
  为小说、长文与日常创作而做的本地优先桌面编辑器。
</p>

<p align="center">
  <a href="https://github.com/shaloong/lamp/releases">获取 Lamp</a> |
  <a href="../README.md">English</a> |
  <a href="https://github.com/shaloong/lamp/issues">反馈建议</a>
</p>

## 把注意力留给故事

- **写得专注。** 简洁的富文本编辑器、段落专注模式，以及浅色、深色和跟随系统的主题。
- **章节井井有条。** 用文件夹管理作品，在标签页间切换文档，支持文档内与整个工作区的查找替换。
- **接着上次继续。** 自动保存恢复副本，启动时找回未完成的草稿，让中断后的继续更从容。
- **看见每天的积累。** 字数统计、每日目标、连续写作记录和写作热力图；达成目标时，给自己一个小小的庆祝。

## 你的文字，你的文件

打开和保存 Lamp 文档（`.lmph`）、Markdown（`.md`）、纯文本（`.txt`）与 HTML（`.html`）。文稿保存在本地，基础写作无需联网，也无需注册账号。

AI 辅助完全可选。在 **设置 > AI** 中接入自己的服务商，即可润色、扩写、续写或总结，再自行决定接受或拒绝建议。使用 AI 时，请求涉及的文本会发送给你配置的服务商。

## 获取 Lamp

在 [Releases](https://github.com/shaloong/lamp/releases) 中查看可用版本，也可以按下方说明从源码运行。

| 系统 | 架构 | 安装包 |
| --- | --- | --- |
| Windows | x64 / arm64 | `-setup.exe`、`.msi` |
| macOS | x64（Intel）/ arm64（Apple Silicon） | `.dmg` |
| Linux | x64 / arm64 | `.AppImage`、`.deb`、`.rpm` |

下载文件统一使用 `Lamp-v<版本>-<系统>-<架构>[-setup]<扩展名>`，例如 `Lamp-v1.0.0-Windows-x64-setup.exe`。

## 按你的习惯扩展

通过插件加入命令、侧栏面板、编辑工具、主题与 AI 操作。内建插件和外部插件使用同一套扩展机制，各自管理设置与翻译。

[了解插件开发](PLUGIN_SYSTEM.md)

<details>
<summary>开发与发布</summary>

基于 **Tauri、Vue 和 TipTap** 构建。开发前请准备 Node.js 24、[package.json](../package.json) 中指定版本的 pnpm、稳定版 Rust，以及 [Tauri 对应平台的依赖](https://v2.tauri.app/start/prerequisites/)。

```bash
pnpm install
pnpm tauri dev       # 启动桌面开发环境
pnpm run check       # 版本检查、代码检查、测试与前端构建
pnpm tauri build     # 为当前平台构建应用和安装包
```

发布前运行 `pnpm run version:set -- <版本>`，完成检查并提交同步后的版本变更，再推送对应的 `v<版本>` tag。CI 会构建六个系统与架构组合，并生成草稿 Release。具体流程见 [发布工作流](../.github/workflows/release.yml)。

</details>

## 一起完善 Lamp

遇到问题，或有让写作更顺手的想法？欢迎[提交 Issue](https://github.com/shaloong/lamp/issues)。代码、翻译和认真使用后的反馈，都能让 Lamp 更好。

免费开源，采用 [MIT 许可证](../LICENSE)。
