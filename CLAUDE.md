# Development Guide

Repository guidance for contributors and coding agents. Product context lives in [docs/PRD.md](docs/PRD.md); plugin contracts and implementation limits live in [docs/PLUGIN_SYSTEM.md](docs/PLUGIN_SYSTEM.md).

## Project Overview

Lamp is a local-first desktop editor for novels and long-form writing, built with Tauri 2, Vue 3, and TipTap 3. AI assistance is optional.

The frontend mixes JavaScript, TypeScript, and Vue single-file components. Follow the language and patterns of the module being changed; do not describe the project as JavaScript-only.

## Commands

Use pnpm for all JavaScript dependency and script operations. Use Node.js 24, the pnpm version pinned in [package.json](package.json), stable Rust, and the platform dependencies required by Tauri.

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm tauri dev
pnpm run check
pnpm tauri build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --locked --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --locked --manifest-path src-tauri/Cargo.toml --all-targets
```

- `pnpm dev` starts Vite only. Port `1086` is fixed with `strictPort: true`; desktop IPC requires `pnpm tauri dev`.
- `pnpm run check` checks application versions, runs Oxlint with warnings denied, runs Node regression tests, and builds the frontend.
- `pnpm run test` uses Node's built-in test runner for `scripts/regression/*.test.mjs`. Rust tests are separate.
- `pnpm run test:e2e` builds the production frontend and tests real Vue/TipTap document flows with a simulated desktop bridge. Install Chromium first with `pnpm exec playwright install chromium`; `LAMP_TEST_BROWSER=msedge` uses an installed Edge locally.
- `pnpm run test:desktop` (Windows) builds and installs an isolated NSIS package, tests real IPC/configuration/recovery, and uninstalls it. It uses a separate application identifier and temporary files, not normal Lamp user data. Both suites run in CI; there is no dedicated TypeScript type-check step.
- `pnpm tauri build` builds the current platform. Default output is `src-tauri/target/release/`, with installers under `bundle/`. Explicit Rust targets add a target-triple directory.
- Vite's production frontend output is `dist/`. The main window loads `index.html`; only development uses `http://localhost:1086`.

## Architecture

### Frontend

- Vue 3 and Pinia manage UI and application state; Vite builds the frontend.
- Shared components are in `src/components/ui/`, using Reka UI and Tailwind CSS with additional CSS/SCSS. Element Plus is not a current dependency.
- Lucide supplies icons. Reuse the existing icon maps and controls.
- Design tokens are in `src/index.css`; prefer existing variables over hardcoded values.
- Pinia stores in `src/stores/` cover files, workspace, settings, and search. Store state alone does not imply persistence.

### Files and Editor

- [src/App.vue](src/App.vue) orchestrates tabs, dirty state, save/close flows, recovery, and host UI events.
- [src/components/Editor.vue](src/components/Editor.vue) creates TipTap in `initEditor()`, called from `mounted()`.
- Core extensions include StarterKit, Typography, Highlight, Focus, TextAlign, and Markdown, followed by plugin-contributed extensions. BubbleMenu is rendered by the Vue menu component.
- [src/lib/documentDirtyState.js](src/lib/documentDirtyState.js) separates editor normalization, saved baselines, and edits made during an in-flight save.
- [src/lib/documentFormats.js](src/lib/documentFormats.js) contains text/HTML conversion helpers; Markdown serialization also depends on the editor's Markdown support.
- [src/lib/searchReplace.js](src/lib/searchReplace.js) contains shared search/replace helpers.
- [src/composables/workspaceExplorerMethods.js](src/composables/workspaceExplorerMethods.js) manages workspace activation, restoration, watching, and file-tree actions.

`.lmph` and `.html` contain HTML. Markdown is parsed into editor content and serialized on save; `.txt` is escaped on import and converted back to plain text on save. Do not promise arbitrary Markdown/HTML source round-trip fidelity.

Automatic recovery copies are not normal document saves. Preserve pending edits when a save finishes, do not silently overwrite externally changed files, and do not close tabs after a canceled or failed save. Maintain regression coverage when changing these flows.

### Desktop Bridge

The frontend imports [src/preload.js](src/preload.js), which exposes Tauri IPC through `window.lampAPI`. This is not an Electron application. [src/lib/lampApi.ts](src/lib/lampApi.ts) provides the bridge access helper.

Command registration and backend implementations currently live in [src-tauri/src/lib.rs](src-tauri/src/lib.rs). The separate `src-tauri/src/preload.js` file is not the frontend entry imported by `src/main.js`; verify the active bridge before editing IPC.

Document saves and configuration writes use the backend's atomic-write helper. Ordinary document saves also compare the expected disk content; direct plugin writes and Save As do not share the same document-conflict flow.

### Plugins

Built-ins are registered in [src/builtins/index.ts](src/builtins/index.ts):

- `lamp.core-toolbar`: formatting toolbar.
- `lamp.ai-actions`: AI actions, prompts, and suggestion extension.
- `lamp.writing-stats`: writing counters, goals, history, and feedback.

Plugin features belong entirely under their plugin directory, including translations and components. Plugins use `ctx` instead of importing application stores or UI internals. The application consumes contributions and public host state; it must not import a built-in plugin's private feature state.

Keep plugin messages local. The host collects module messages through `registerBuiltin()` or dynamic loading, and [src/main.js](src/main.js) installs the i18n service. Use `ctx.i18n.key()` for deferred labels and `ctx.i18n.t()` for immediate translation. Do not write plugin keys into `src/locales/`.

Workspace plugins are under `<workspace>/.lamp/plugins/`; user plugins are under the Tauri application data directory's `plugins/`. External entries must be built browser-compatible ESM. The loader does not compile TypeScript or Vue source at runtime.

Read the [plugin guide](docs/PLUGIN_SYSTEM.md) before relying on lifecycle hooks, contribution fields, permissions, or cleanup. Both built-ins and external plugins run `onActivate`; commands/listeners are automatically cleaned up, and other resources use `ctx.onDispose` and `ctx.signal`. Some declared interfaces are partial; capability declarations are not a security sandbox.

### UI Integration

- [EditorToolbar.vue](src/components/editor/EditorToolbar.vue) and [EditorBubbleMenu.vue](src/components/editor/EditorBubbleMenu.vue) render editor contributions.
- [EditorAiDialog.vue](src/components/editor/EditorAiDialog.vue) and [useAISuggestToolbar.js](src/composables/useAISuggestToolbar.js) consume shared AI state.
- [AppMenu.vue](src/components/AppMenu.vue) renders [menu/config.js](src/components/menu/config.js); keep command IDs and labels in the schema.
- [PluginPanelHost.vue](src/components/layout/PluginPanelHost.vue) renders plugin-provided component objects.
- [useSettingsDialogState.js](src/composables/useSettingsDialogState.js), [useShortcutSettings.js](src/composables/useShortcutSettings.js), and [useCommandPalette.js](src/composables/useCommandPalette.js) manage their respective UI workflows.

## Persistence

- Documents: user-selected paths.
- Recovery copies: `<app-data>/autosave/*.autosave`, containing recovery metadata and editor content.
- General/editor/AI settings: `<app-data>/config.json`, managed by [config.rs](src-tauri/src/config.rs). When absent, migrate an existing executable-adjacent config first, then a working-directory config. Original files are preserved; subsequent launches always use app data. Invalid or unreadable settings are reported without overwriting them. Failed writes do not change live settings.
- API keys: stored in plaintext configuration; a masked input is not encryption. Never commit local configuration or credentials.
- Plugin settings/history, shortcut overrides, recent files, last workspace, and sidebar preferences: WebView `localStorage`, managed by their respective services.
- Workspace project metadata, export presets, and AI analysis-cache files are not implemented.

## Versions and CI

Application versions are synchronized across `package.json`, `src-tauri/Cargo.toml`, the root package entry in `src-tauri/Cargo.lock`, and `src-tauri/tauri.conf.json`. Use `pnpm run version:set -- <version>` to update them and `pnpm run version:check` to verify them. Plugin versions and `PluginContext.version` are separate contracts.

[CI](.github/workflows/ci.yml) runs frontend checks, production-browser document tests, Rust fmt/Clippy/tests, and a Windows installed-package smoke test on pushes and PRs targeting `main` or `develop`. The smoke build uses an isolated identity and is not a distributable release. macOS/Linux installed-app UI tests are not yet automated.

[Release](.github/workflows/release.yml) runs for `v*` tags or manual dispatch of an existing tag. It validates the tag against the application version, builds Windows/macOS/Linux for x64 and arm64, and prepares a draft release. The current workflow does not configure signing, notarization, or updater metadata.

Uploaded assets follow `Lamp-v<version>-<system>-<architecture>[-setup]<extension>`. This is a release-upload rename, not a change to Tauri's local bundle filenames.

Use matching major/minor versions for Tauri Rust/JavaScript package pairs. Do not assume their independently released patch versions must be equal.

## Working Conventions

- Read the implementation before updating a behavior claim or API example.
- Keep changes scoped, preserve unrelated work, and use focused Conventional Commits.
- Scale tests with risk. A successful build is not evidence that every desktop workflow or platform was tested.
- Update existing documentation when behavior changes; avoid checked-in temporary QA reports or duplicated status documents.
- Keep PRD directions separate from implementation status. Do not assign features to versions, dates, or acceptance gates without an explicit product decision.
