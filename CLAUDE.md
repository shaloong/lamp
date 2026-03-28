# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lamp is a cross-platform, distraction-free desktop editor for writers. Built with Tauri 2.x (Rust) + Vue 3 + TipTap editor.

## Build Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start Vite dev server (port 1086)
pnpm tauri dev        # Start full Tauri + Vite dev environment
pnpm build            # Build Vue frontend to dist/
pnpm tauri build      # Build production Tauri app (output: src-tauri/target/release/bundle/)
```

The dev server runs on port 1086 with `strictPort: true` — nothing else can use that port during development.

## Architecture

### Stack

- **Desktop shell**: Tauri 2.x (Rust)
- **Frontend**: Vue 3 (plain JS, not TypeScript), Vite 7.x, Pinia for state
- **Editor**: TipTap 3.x (ProseMirror-based)
- **UI components**: Element Plus 2.x with custom SCSS styling

### Plugin System (Core Architecture)

The plugin system is central to Lamp's design. All extensibility goes through it. Plugins and the main application are **fully independent** — neither should directly reference the other's internals.

**Core principle**: The main application only consumes plugin contributions through the `pluginHost.contributions` registry. Plugins only reference the main app through the `PluginContext` API (`ctx.editor`, `ctx.ai`, etc.). Even built-in plugins live in `src/builtins/` and must not scatter their code or data into main app files.

```
PluginHost (src/plugins/index.ts — singleton)
├── Built-in plugins (loaded synchronously, in src/builtins/)
│   ├── lamp.core-toolbar   — Editor formatting toolbar
│   └── lamp.ai-actions      — AI writing assistant
├── Workspace plugins        — <workspace>/.lamp/plugins/
└── User plugins             — ~/.lamp/plugins/
```

**Plugin lifecycle:**

1. `onLoad(ctx)` — synchronous registration of contributions
2. `onActivate(ctx)` — async startup
3. `onDeactivate()` — cleanup

**Contribution points** (the only bridge between plugin and app):

- `editorToolbar` — toolbar buttons
- `bubbleMenu` — text selection popup
- `menuItems` — menu bar items
- `sidebarPanels` — side panel views
- `statusBarItems` — status bar items
- `aiActions` — AI-powered actions
- `settings` — plugin settings sections and items

**PluginContext API** (`ctx` — plugin → main app):

- `ctx.editor` — read/write editor content
- `ctx.file` — file operations
- `ctx.workspace` — workspace info
- `ctx.ai` — AI chat interface
- `ctx.ui` — dialogs, notifications
- `ctx.commands` — register commands
- `ctx.storage` — per-plugin persistent storage
- `ctx.event` — event bus
- `ctx.i18n` — plugin's own locale messages (see below)

**Plugin i18n**: Each plugin owns its own locale messages. Plugins should NOT write keys into `src/locales/`. For built-in plugins, messages are collected in `src/builtins/<plugin>/index.ts` under the `messages` export, then registered via `pluginHost.i18nService.addBuiltinMessages()` in `src/builtins/index.ts`. Dynamic plugins use `ctx.i18n.setLocaleMessages()` at runtime.

**Adding a new feature**: Always ask — does this belong in a plugin or the main app? If it's a plugin feature (even for a built-in plugin), it must live entirely in `src/builtins/<plugin>/`. The main app's role is only to declare a contribution point and consume the contributions registry.

### State Management (Pinia)

Two stores in `src/stores/`:

- **`useFileStore`** (`files.js`) — file tree, open files, temp files
- **`useWorkspaceStore`** (`workspace.js`) — workspace open/closed state, root path, recent workspaces

### Tauri IPC

Frontend accesses Rust via `window.electronAPI`. All commands live in `src-tauri/src/lib.rs`.

Key IPC areas:

- **Window**: `minWindow`, `maxWindow`, `closeWindow`, `isMaximized`
- **File**: `menuFileOpen`, `saveFileAs`, `saveInfo`, `getFolderContent`, `openSpecificFile`, `startWatching`, `stopWatching`
- **AI**: `ai(prompt, message)`, `getAiSettings`, `saveAiSettings`

### TipTap Editor

Editor is in `src/components/Editor.vue`. Extensions are registered in the component's `mounted` hook — add new extensions there. Current extensions: StarterKit, TextAlign, Highlight, Typography, Focus, BubbleMenu.

The toolbar renders dynamically from `pluginHost.contributions.sortedEditorToolbar`.

### File Formats

- `.lmph` — Lamp native document (HTML content)
- `.lampsave` — auto-save temp files
- `.md` — converted to HTML on open
- `.html`, `.txt` — plain text/HTML

### Styling

- Design tokens defined as CSS custom properties in `src/styles/element/index.scss`
- All SCSS components import these tokens via Vite's `additionalData` (configured in `vite.config.js`)
- Use existing CSS variables rather than hardcoding values

## Key Files

| File | Purpose |
|------|---------|
| `src/main.js` | Vue app init, plugin system bootstrap |
| `src/App.vue` | Root component, tab management |
| `src/preload.js` | Tauri IPC bridge |
| `src/plugins/index.ts` | PluginHost singleton |
| `src/builtins/index.ts` | Built-in plugin registry |
| `src/components/Editor.vue` | TipTap editor component |
| `src-tauri/src/lib.rs` | Rust Tauri commands |

## Notes

- **No TypeScript** — the frontend uses plain JavaScript
- **No test framework** — none is currently configured
- **AI settings** — persisted to `config.json` next to the executable
- **Oxlint** is available as a dev dependency for linting
