# Lamp Plugin System

Lamp plugins are independent modules. The main app only reads plugin contributions from
`pluginHost.contributions`; plugins only talk to Lamp through the `ctx` API passed to
`onLoad` and `onActivate`.

This rule applies to built-in plugins too. A built-in plugin lives entirely under
`src/builtins/<plugin-id>/` and should not put labels, settings, prompts, or feature
data into the main app locale files or components.

## Recommended Structure

```text
my-plugin/
  manifest.json
  index.ts
  messages.ts
  components/
  assets/
```

For built-ins:

```text
src/builtins/lamp-example/
  index.ts
  messages.ts
  manifest.json
  components/
```

## Plugin Entry

```ts
import type { LampPlugin } from '@/plugins/types'
import { messages } from './messages'

export const manifest = {
  id: 'acme.example',
  name: 'plugins.acme-example.name',
  version: '1.0.0',
  main: 'index.js',
}

export default {
  manifest,
  messages,

  onLoad(ctx) {
    return {
      editorToolbar: [
        {
          id: 'hello',
          label: ctx.i18n.key('hello'),
          icon: 'Sparkles',
          action: () => ctx.ui.notification({ message: ctx.i18n.t('hello') }),
        },
      ],
    }
  },
} satisfies LampPlugin
```

## I18n

Plugins own their messages. Do not add plugin keys to `src/locales/`.

`messages.ts` can use local keys; the host automatically namespaces them under
`plugins.<plugin-id-with-dashes>`.

```ts
export const messages = {
  'zh-CN': {
    name: '示例插件',
    hello: '你好',
  },
  'en-US': {
    name: 'Example Plugin',
    hello: 'Hello',
  },
}
```

Use `ctx.i18n.key('hello')` for contribution labels and `ctx.i18n.t('hello')`
for immediate strings. If a plugin does not provide the current app locale, Lamp
falls back to the plugin fallback locale or the first locale the plugin provides.

## Contribution Boundary

Plugins return contributions during `onLoad`. Components render sorted contribution
arrays from `pluginHost.contributions`.

Plugins should not import `pluginHost`, app stores, app components, or main locale
files. If a plugin needs something, add it to `ctx` deliberately.

## Useful `ctx` APIs

- `ctx.editor`: selection, content, insert/replace, formatting, undo/redo, raw editor escape hatch.
- `ctx.file`: read/write, open/save dialogs, workspace search, app/user plugin dirs, file watch.
- `ctx.workspace`: current workspace state, open/close, path containment.
- `ctx.ai`: chat, settings, loading/error/suggestion state.
- `ctx.ui`: dialog, notification, command palette.
- `ctx.commands`: register/execute/unregister commands.
- `ctx.storage`: plugin-scoped persistent storage.
- `ctx.event`: host event bus.
- `ctx.i18n`: plugin namespace keys, translation, locale message registration.
- `ctx.shortcuts`: shortcut listing and user overrides.
