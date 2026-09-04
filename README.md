# Lamp

Lamp is an open-source desktop editor for novels and long-form writing, built with Tauri, Vue, and TipTap. It combines a focused editing experience with local file management and writing progress tracking.

[简体中文](docs/README_zh-CN.md) | [Download](https://github.com/shaloong/lamp/releases) | [Report an issue](https://github.com/shaloong/lamp/issues)

## Features

- **Focused editing**: rich-text formatting, paragraph focus mode, and light, dark, or system themes.
- **Document management**: folder workspaces, document tabs, and find and replace within a document or across a workspace.
- **Draft recovery**: automatic recovery copies and startup recovery for unfinished drafts.
- **Writing progress**: word counts, daily goals, streaks, a contribution heatmap, and goal completion celebrations.
- **Local files**: support for Lamp documents (`.lmph`), Markdown (`.md`), plain text (`.txt`), and HTML (`.html`). Core writing works offline without an account.
- **Optional AI assistance**: polish, expand, continue, or summarize text through a provider you configure, with suggestions you can accept or reject.
- **Plugins**: extend the editor with commands, panels, tools, themes, and AI actions.

## Download and Install

Choose a build for your system from [Releases](https://github.com/shaloong/lamp/releases).

| System | Architecture | Packages |
| --- | --- | --- |
| Windows | x64 / arm64 | `.exe` installer, `.msi` |
| macOS | x64 (Intel) / arm64 (Apple Silicon) | `.dmg` |
| Linux | x64 / arm64 | `.AppImage`, `.deb`, `.rpm` |

For Intel or AMD computers, choose `x64`; for ARM devices, including Apple Silicon Macs, choose `arm64`. Available packages are listed with each release.

Files are named by version, system, and architecture, for example `Lamp-v1.0.0-Windows-x64-setup.exe`.

## Usage

Create or open a document to start writing, or open a folder as a workspace to organize chapters. Use document tabs to switch between drafts and search across your workspace when revising.

Documents are stored locally. Automatic recovery copies help recover interrupted work; save your documents normally and keep backups of important writing.

To enable AI assistance, configure a provider in **Settings > AI**. Text included in an AI request is sent to that provider. AI is not required for editing or saving documents.

## Development

### Requirements

- Node.js 24 and the pnpm version specified in [package.json](package.json).
- Stable Rust and the [Tauri prerequisites for your platform](https://v2.tauri.app/start/prerequisites/).

### Run and Build

From the repository root:

```bash
pnpm install
pnpm tauri dev       # Run the desktop app in development
pnpm run check       # Check versions, lint, test, and build the frontend
pnpm tauri build     # Build the desktop app and installers
```

`pnpm dev` starts only the frontend server on port `1086`. Use `pnpm tauri dev` for desktop features such as local file access. Build output is written to `src-tauri/target/release/`, with installers under `bundle/`.

### Project Structure

- `src/`: Vue frontend, editor, and application state.
- `src/plugins/`: plugin host and public APIs; `src/builtins/`: built-in plugins.
- `src-tauri/`: Rust desktop backend and platform configuration.
- `scripts/`: version tooling and regression tests.

### Releases

Run `pnpm run version:set -- <version>` to synchronize application versions, run the checks, and commit the changes. Push the matching `v<version>` tag to trigger the [release workflow](.github/workflows/release.yml), which builds the six system/architecture combinations above and prepares a draft release for review.

## Plugin Development

Built-in and external plugins use the same contribution system. Plugins own their settings and translations and access application capabilities through the plugin API.

See the [plugin guide](docs/PLUGIN_SYSTEM.md) for the API, lifecycle, and contribution points.

## Contributing

Bug reports, feature suggestions, code, and translations are welcome. When [opening an issue](https://github.com/shaloong/lamp/issues), include your operating system, Lamp version, and steps to reproduce the problem. For code changes, run `pnpm run check` before submitting a pull request.

## License

[MIT](LICENSE)
