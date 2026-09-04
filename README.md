<p align="center">
  <img src="res/app.png" width="72" height="72" alt="Lamp">
</p>

<h1 align="center">Lamp</h1>

<p align="center">
  <strong>A quiet place for your next chapter.</strong><br>
  A local-first desktop editor for novels, long-form writing, and a steady writing habit.
</p>

<p align="center">
  <a href="https://github.com/shaloong/lamp/releases">Get Lamp</a> |
  <a href="docs/README_zh-CN.md">简体中文</a> |
  <a href="https://github.com/shaloong/lamp/issues">Feedback</a>
</p>

## Stay With the Story

- **Space to focus.** A clean rich-text editor, paragraph focus mode, and light, dark, or system themes.
- **Keep chapters together.** Folder workspaces, document tabs, and find and replace within a document or across a workspace.
- **Pick up your draft.** Automatic recovery copies and startup recovery help you return to unfinished writing.
- **See your progress.** Word counts, daily goals, writing streaks, and a contribution heatmap. A small celebration when you reach your goal.

## Your Words, Your Files

Open and save Lamp documents (`.lmph`), Markdown (`.md`), plain text (`.txt`), and HTML (`.html`). Documents stay in local files. Core writing works offline and does not require an account.

AI assistance is optional. Connect your own provider in **Settings > AI** to polish, expand, continue, or summarize text, then accept or reject the suggestion. Text used in an AI request is sent to the provider you configure.

## Get Lamp

Browse [Releases](https://github.com/shaloong/lamp/releases) for available builds. You can also run Lamp from source below.

| System | Architecture | Packages |
| --- | --- | --- |
| Windows | x64 / arm64 | `-setup.exe`, `.msi` |
| macOS | x64 (Intel) / arm64 (Apple Silicon) | `.dmg` |
| Linux | x64 / arm64 | `.AppImage`, `.deb`, `.rpm` |

Download names follow `Lamp-v<version>-<system>-<architecture>[-setup]<extension>`, such as `Lamp-v1.0.0-Windows-x64-setup.exe`.

## Make It Yours

Extend Lamp with commands, panels, editor tools, themes, and AI actions. Built-in and external plugins use the same contribution system, with their own settings and translations.

[Explore the plugin guide](docs/PLUGIN_SYSTEM.md)

<details>
<summary>Development and releases</summary>

Built with **Tauri, Vue, and TipTap**. Use Node.js 24, the pnpm version pinned in [package.json](package.json), stable Rust, and the [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/).

```bash
pnpm install
pnpm tauri dev       # Run the desktop app in development
pnpm run check       # Check versions, lint, test, and build the frontend
pnpm tauri build     # Build the app and installers for the current platform
```

For a release, run `pnpm run version:set -- <version>`, run the checks, and commit the synchronized version changes. Push the matching `v<version>` tag to build all six system/architecture targets and prepare a draft Release. See the [release workflow](.github/workflows/release.yml) for details.

</details>

## Contribute

Found a rough edge or have an idea for a better writing experience? [Open an issue](https://github.com/shaloong/lamp/issues). Code, translations, and thoughtful feedback are welcome.

Free and open source under the [MIT License](LICENSE).
