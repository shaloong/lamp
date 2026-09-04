# Lamp Plugin System

Plugins keep their implementation, settings, and translations in their own directory. The application renders contributions from `pluginHost.contributions`; plugins use the `ctx` API for host services instead of importing application stores or components.

This is an architectural boundary, not a security sandbox. Plugins execute in the application's WebView. Load only trusted code: capability declarations are currently descriptive and do not restrict access.

## Source of Truth

- [types.ts](../src/plugins/types.ts): API and contribution type definitions.
- [PluginContext.ts](../src/plugins/PluginContext.ts): implemented host APIs.
- [PluginHost](../src/plugins/index.ts): discovery, activation, storage, and commands.
- [ContributionRegistry.ts](../src/plugins/ContributionRegistry.ts): registration and ordering.
- [PluginI18nService.ts](../src/plugins/PluginI18nService.ts): translation registration and fallback.

Some declared fields are not consumed by the UI yet. The limitations below describe current behavior; a type definition alone is not a support guarantee. `ctx.version` identifies the plugin API version, not the application version.

## Plugin Locations

| Scope | Location | Loading |
| --- | --- | --- |
| Built-in | `src/builtins/<plugin>/` | Static imports registered in [src/builtins/index.ts](../src/builtins/index.ts) before Vue mounts |
| Workspace | `<workspace>/.lamp/plugins/<plugin>/` | Scanned when a workspace opens; deactivated when that workspace closes or changes |
| User | `<app-data>/plugins/<plugin>/` | Scanned after the application mounts |

Obtain the user plugin root with `ctx.file.getUserPluginsDir()`; it is not a fixed `~/.lamp/plugins` path. Duplicate IDs are skipped once an ID is loaded. Use globally unique IDs rather than relying on scope precedence.

Current built-ins are `lamp.core-toolbar`, `lamp.ai-actions`, and `lamp.writing-stats`.

## Minimal External Plugin

Each plugin needs a `manifest.json` and a built JavaScript entry. This example needs no bundler:

```text
acme-example/
  manifest.json
  index.js
```

`manifest.json`:

```json
{
  "id": "acme.example",
  "name": "plugins.acme-example.name",
  "version": "1.0.0",
  "main": "index.js"
}
```

`index.js`:

```js
export const messages = {
  'en-US': { name: 'Example Plugin', hello: 'Hello from the plugin' },
  'zh-CN': { name: '示例插件', hello: '来自插件的问候' },
}

export default {
  onLoad(ctx) {
    const sayHello = async () => {
      await ctx.ui.dialog({ message: ctx.i18n.t('hello') })
    }

    ctx.commands.register({
      id: 'acme.example.hello',
      label: ctx.i18n.key('hello'),
      handler: sayHello,
    })

    return {
      menuItems: [{
        id: 'hello',
        where: 'edit',
        label: ctx.i18n.key('hello'),
        action: sayHello,
      }],
    }
  },
}
```

Place the folder in a user or workspace plugin directory, then restart Lamp to load it. Open the command palette or Edit menu to run the command. UI rendering should be checked in `pnpm tauri dev`, not only in the frontend browser preview.

For larger plugins, keep source under `src/` and build to `dist/index.js`. Set `manifest.main` accordingly and ship all imported files. The loader imports ESM through Tauri's asset URL; it does not compile TypeScript, Vue SFCs, or SCSS, resolve npm bare imports, or provide Node.js APIs. Bundle dependencies or use browser-resolvable relative ESM imports. Do not use the app's `@/` alias in external runtime code.

The entry path must stay within the plugin directory; absolute entry paths and parent traversal are rejected. This entry check is not an isolation mechanism for all code a plugin can execute.

## Built-In Plugins

Keep code, components, prompts, manifests, and messages inside `src/builtins/<plugin>/`. Export an object containing its `manifest`, optional `messages`, and lifecycle hooks, then register it in [src/builtins/index.ts](../src/builtins/index.ts).

Built-ins are compiled by Vite and can import their own TypeScript modules and Vue components. A manifest may be defined in the entry or imported from a plugin-owned JSON file. Do not maintain duplicate manifest definitions unnecessarily.

Use [core-toolbar](../src/builtins/core-toolbar/index.ts), [ai-actions](../src/builtins/ai-actions/index.ts), and [writing-stats](../src/builtins/writing-stats/index.ts) as concrete examples. Do not import app stores, app components, or main locale files to implement a plugin feature.

## Lifecycle and Cleanup

- `onLoad(ctx)` is synchronous. Register commands/listeners and return contributions here; an async return is not supported.
- Both built-in and dynamic plugins have `onActivate(ctx)` called and awaited after `onLoad`. Built-in contributions register synchronously before Vue mounts.
- Activation failure rolls back contributions, commands, event subscriptions, and translations. Lifecycle operations are serialized, including workspace switches and reloads.
- `ctx.signal` is aborted before `onDeactivate()`. Pass it to cancellable asynchronous work. Register timers, observers, and other resources with `ctx.onDispose(cleanup)`; cleanup callbacks may be asynchronous and run in reverse order.
- Commands and `ctx.event.on/once` subscriptions are tracked automatically. Commands and `on()` return disposers for early cleanup; `off()` can also cancel a `once()` subscription. A throwing `onDeactivate()` does not prevent host cleanup, and removed plugins cannot register new commands/listeners.
- Built-ins load before an editor exists. `ctx.editor.getRawEditor()` may return `null`; use editor lifecycle events and obtain the current instance when acting.

The plugin settings page lists loaded plugins but has no enable/disable controls. `pluginHost.reload(id)` reloads external manifests and cache-busts the entry module; bundle a single entry for reliable development reloads. Browser-cached relative dependencies and extensions already attached to editors require an application restart. User shortcut overrides survive reload. Dependency version resolution is not implemented. Hooks must settle promptly; cancellation is cooperative, and the host cannot forcibly stop arbitrary plugin code.

## Contributions

Return contributions from `onLoad`. IDs should be unique within their contribution type and plugin. Most UI collections use descending `priority`, defaulting to 50; themes and TipTap extensions use registration order.

| Contribution | Current behavior |
| --- | --- |
| `editorToolbar` | Buttons and dropdowns with actions, active/disabled state, groups, and supported Lucide icon names; custom component paths are not rendered |
| `bubbleMenu` | Actions displayed for a non-empty selection; `requireSelection: false` does not enable an empty-selection menu |
| `menuItems` | Actions in host-rendered menu areas; use an area present in [menu/config.js](../src/components/menu/config.js), not an arbitrary new top-level menu |
| `sidebarPanels` | Renders a supplied Vue component object; string component paths are not loaded |
| `statusBarItems` | Text, tooltip, and click action; currently all render on the right, with no component-path or HTML rendering |
| `settings` | Text, textarea, select, and toggle controls; `type: 'component'` is not rendered |
| `themes` | Applies contributed CSS tokens and stylesheet links; not a theme picker. Use token keys without `--` and precompiled CSS; test asset loading in packaged builds |
| `tipTapExtensions` | Read when an editor is created; no live extension injection into an existing editor |
| `aiActions` | Stored in the registry, but not automatically turned into UI or commands. Current AI built-ins contribute explicit menu and bubble actions |
| `fileHandlers` | Stored in the registry; no application preview/export dispatch consumes them yet |

Toolbar and menu actions receive the current TipTap editor. Status-bar actions receive the plugin context. For available signatures, consult [types.ts](../src/plugins/types.ts) together with the consuming component.

## Internationalization

Each plugin owns its messages; never add plugin keys to `src/locales/`. Export a locale map as `messages` on the entry module or default plugin object. The host registers it before `onLoad`. Built-ins use the same registration service.

Local keys are namespaced under `plugins.<plugin-id-with-dots-replaced-by-dashes>`. For `acme.example`, `ctx.i18n.key('hello')` returns `plugins.acme-example.hello`.

- Use `ctx.i18n.key('hello')` for contribution labels so the UI translates them when rendering.
- Use `ctx.i18n.t('hello', params)` for an immediate string. A string translated once does not change automatically; translate again in the action, render, or reactive computation.
- Use `ctx.i18n.getLocale()` for the current application language and `getFallbackLocale()` for the application's fallback.
- Register or merge messages with `setLocaleMessages(locale, messages)` or `setMessages(messagesByLocale)`.

When an entire requested locale is absent, fallback selection is: the application's configured fallback locale, then `zh-CN`, then `en-US`, then the plugin's first provided locale. There is no per-plugin fallback setting. Missing individual keys follow Vue I18n's configured fallback chain; provide a complete baseline locale instead of assuming arbitrary per-key language merging.

## Host APIs

| Namespace | Implemented surface and caveats |
| --- | --- |
| `ctx.editor` | Read text/HTML/selection, insert/replace/delete, formatting, focus, undo/redo, and raw editor access. `registerTipTapExtension()` only warns; return `tipTapExtensions` instead |
| `ctx.file` | Text read/write/delete/existence, dialogs, directory listing, workspace search, shared file watcher, app-data paths. Direct writes do not update open tabs or run the app's document conflict dialog |
| `ctx.workspace` | Current workspace getters, open/close commands, and path containment check |
| `ctx.ai` | Chat and settings plus shared loading, error, and suggestion state; requests use the user's configured provider |
| `ctx.ui` | Command palette show/hide. `dialog()` uses `window.confirm` and returns the first button value on confirmation or `null`; `notification()` only writes to the console |
| `ctx.commands` | Register, execute, list, and unregister owned commands. Duplicate global IDs are rejected; registrations are automatically disposed |
| `ctx.storage` | Synchronous get/set/remove/keys/clear, namespaced by plugin ID and backed by WebView `localStorage`; use JSON-serializable values, not credentials |
| `ctx.event` | Subscribe, emit, unsubscribe. `on()` and `once()` subscriptions are automatically removed on unload |
| `ctx.i18n` | Namespaced translation, application locale access, and plugin message registration |
| `ctx.shortcuts` | List shortcuts, set user overrides, reset defaults, and check conflicts |

The file watcher is shared with the workspace, not private to a plugin. Calling `watch()` or `unwatch()` can replace or stop workspace watching. The AI state is also shared; plugins must coordinate operations rather than treating it as private state.

Settings values are stored under the plugin ID and item ID. The host normally saves changes and then calls `onChange`; set `manualPersist: true` only when the plugin owns persistence. Avoid duplicate setting IDs across sections.

## Events

| Event | Payload / use |
| --- | --- |
| `lamp.editor.ready` | Obtain the current editor; emitted on creation and active-document switches |
| `lamp.editor.destroy` | Editor reference cleared; stop editor-bound work |
| `lamp.workspace.opened` | `{ rootPath, name }` |
| `lamp.workspace.closed` | `{ rootPath }` |
| `lamp.plugin.activated` | `{ id, scope }` |
| `lamp.plugin.deactivated` | `{ id }` |
| `lamp.sidebar.openPanel` | Emit `{ pluginId: ctx.id, panelId }` to open a contributed panel |

Events are not replayed. Subscribe and also inspect current state when initialization can happen after an event. Namespace custom event names with your plugin ID.

## Verification

Run `pnpm run check` for repository changes and exercise the plugin in the desktop app. Check both application languages, missing-locale fallback, no-editor behavior, document switches, workspace changes, and cleanup. Test external assets in a packaged application as well as development.

Automated regressions cover entry paths, built-in activation, failed activation rollback, cleanup, command ownership, shortcut disposal, external reload, workspace changes, and translation cleanup/fallback. They do not constitute complete third-party plugin compatibility or cross-platform UI coverage.
