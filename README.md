# Lamp

[English](README.md) | [简体中文](./doc/README_zh-CN.md) | [Official Website](https://www.shaloong.com/lamp/)

Lamp is a modern, cross-platform, distraction-free editor crafted for writers. Born from the Shaloong studio, it mixes the elegance of a minimalist WYSIWYG experience with the power of Markdown-inspired tooling, AI assistance, and an Electron shell that feels native on every desktop OS.

## Highlights

- **Frictionless writing**: Carefully tuned typography and card-free chrome keep your focus on ideas, not UI clutter.
- **Lean but capable**: TipTap-based editor, inline formatting, document tree, autosave, snapshots, and AI polish/expand tools.
- **True desktop presence**: One codebase ships to Windows, macOS, and Linux using electron-builder.
- **Totally free**: Lamp is open, transparent, and will remain free to download and use.
- **Community powered**: Built atop generous open-source ecosystems; contributions and forks are welcome.

## Quick Start

```bash
pnpm install
pnpm run dev:desktop
```

The first command installs dependencies. The second boots both the Vite dev server (port 1086) and the Electron shell. Prefer to run each piece manually? No problem:

1. `pnpm run dev -- --port 1086`
2. `pnpm run auto-start`

## Packaging & Release

```bash
pnpm run build   # generate Vite assets in dist/
pnpm run dist    # invoke electron-builder installers
```

electron-builder reads the `build` block in `package.json` and drops platform-specific artifacts under `release/<version>/`. Windows gets NSIS installers, macOS receives a DMG, and Linux exports distributable directories (add AppImage/DEB targets if you need them).

## AI Configuration

Inside the desktop app open **Settings → AI 接口** and enter your provider's Base URL, Model, and API Key. Lamp persists these values to `config.json` so you only set them once per device.

## Community & Support

Shaloong is currently a passion project rather than a formal company. We publish experiments, tools, and essays at [shaloong.com](https://www.shaloong.com/). Found a bug or want to ship a feature? Open an Issue/PR—every bit of feedback helps Lamp become a better writing companion.
