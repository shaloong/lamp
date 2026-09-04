# Lamp

[English](README.md) | [简体中文](./docs/README_zh-CN.md) | [Official Website](https://www.shaloong.com/lamp/)

Lamp is a modern, cross-platform, distraction-free desktop editor crafted for writers. Born from the Shaloong studio, it combines the elegance of a minimalist WYSIWYG experience with the power of Markdown-inspired tooling, AI assistance, and a Tauri shell that feels native on every desktop OS.

## Highlights

- **Frictionless writing**: Carefully tuned typography and minimal UI chrome keep your focus on ideas, not interface clutter.
- **Lean but capable**: TipTap-based rich text editor, common Markdown shortcuts, inline formatting, document tree, autosave, version snapshots, and AI polish/expand tools.
- **True desktop presence**: One codebase ships to Windows, macOS, and Linux using Tauri.
- **Totally free**: Lamp is open, transparent, and will remain free to download and use.
- **Community powered**: Built atop generous open-source ecosystems; contributions and forks are welcome.

## Quick Start

```bash
pnpm install
pnpm tauri dev
```

The first command installs dependencies. The second boots both the Vite dev server (port 1086) and the Tauri shell. Prefer to run each piece manually?

1. `pnpm dev`
2. `pnpm tauri dev`

## Packaging & Release

```bash
pnpm build           # generate Vite assets in dist/
pnpm tauri build     # invoke Tauri bundler
```

Tauri drops platform-specific artifacts under `src-tauri/target/release/bundle/`. Windows gets NSIS installers, macOS receives a DMG, and Linux exports AppImage and system-package bundles.

Application releases use one SemVer value across `package.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, and `src-tauri/tauri.conf.json`:

```bash
pnpm run version:set -- 1.1.0
pnpm run check
git commit -am "chore(release): prepare v1.1.0"
git tag v1.1.0
git push origin develop v1.1.0
```

Pushing the tag runs the release workflow, builds x64 and ARM64 packages for Linux, Windows, and macOS, and creates a draft GitHub Release with generated release notes. `pnpm run version:check` can be used independently to audit version alignment.

Release downloads use `Lamp-v<version>-<platform>-<architecture>[-setup]<extension>`, for example `Lamp-v1.0.0-Windows-x64-setup.exe` and `Lamp-v1.0.0-macOS-arm64.dmg`. Platform labels are `Windows`, `Linux`, and `macOS`; architecture labels are `x64` (Intel/AMD, including Intel Macs) and `arm64` (including Apple Silicon Macs). Linux ARM64 uses a native runner; Windows ARM64 is cross-compiled with the Visual Studio ARM64 tools. This naming applies to uploaded Release assets; local bundle filenames follow Tauri's defaults. Legacy 32-bit targets and macOS universal bundles are not part of the default matrix.

## AI Configuration

Inside the desktop app open **Settings → AI** and enter your provider's Base URL, Model, and API Key. Lamp persists these values to `config.json` so you only set them once per device.

## Community & Support

Shaloong is currently a passion project rather than a formal company. We publish experiments, tools, and essays at [shaloong.com](https://www.shaloong.com/). Found a bug or want to ship a feature? Open an Issue/PR — every bit of feedback helps Lamp become a better writing companion.
