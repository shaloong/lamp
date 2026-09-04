import test from 'node:test'
import assert from 'node:assert/strict'
import { createI18n } from 'vue-i18n'
import '../helpers/register-typescript.mjs'

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: () => null, setItem: () => {} },
})
globalThis.window = { lampAPI: { getUserPluginsDir: async () => '/user/plugins' } }

const { PluginHost } = await import('../../src/plugins/index.ts')

test('reload removes stale translations and follows the application locale with fallback', async () => {
  const host = new PluginHost()
  const i18n = createI18n({ legacy: false, locale: 'zh-CN', fallbackLocale: 'en-US', messages: { 'zh-CN': {}, 'en-US': {}, fr: {} } })
  host.i18nService.install(i18n)
  const plugin = builtin('test.locale', { messages: { 'en-US': { label: 'Hello', stale: 'Old' }, 'zh-CN': { label: 'Chinese' } } })
  host.registerBuiltin(plugin.manifest.id, plugin)
  await host.start()
  assert.equal(host.getContext(plugin.manifest.id).i18n.t('label'), 'Chinese')
  i18n.global.locale.value = 'fr'
  assert.equal(host.getContext(plugin.manifest.id).i18n.t('label'), 'Hello')
  plugin.messages = { 'en-US': { label: 'New' } }
  await host.reload(plugin.manifest.id)
  assert.equal(host.getContext(plugin.manifest.id).i18n.t('label'), 'New')
  assert.equal(i18n.global.te('plugins.test-locale.stale', 'en-US'), false)
  await host.deactivate(plugin.manifest.id)
  assert.equal(i18n.global.te('plugins.test-locale.label', 'en-US'), false)
})

test('command ownership and shortcut overrides survive reload without stale watchers', async () => {
  const host = new PluginHost()
  const watchers = new Map()
  host.shortcutService.setExternalRegister((id, accelerator) => {
    watchers.set(id, accelerator)
    return () => watchers.delete(id)
  })
  host.shortcutService.startListening()
  let staleDispose
  const plugin = builtin('test.owner', { onLoad(ctx) {
    staleDispose ??= ctx.commands.register({ id: 'test.command', label: 'Test', keybinding: 'Ctrl+K', handler() {} })
  } })
  host.registerBuiltin(plugin.manifest.id, plugin)
  await host.start()
  host.shortcutService.setOverride('test.command', 'Ctrl+J')
  assert.equal(watchers.get('test.command'), 'Ctrl+J')
  assert.throws(() => host.commandService.register('test.other', { id: 'test.command', label: 'Other', handler() {} }))
  host.commandService.unregisterOwned('test.other', 'test.command')
  assert.equal(host.commandService.getAll().length, 1)
  await host.deactivate(plugin.manifest.id)
  assert.equal(watchers.size, 0)
  plugin.onLoad = ctx => { ctx.commands.register({ id: 'test.command', label: 'New', keybinding: 'Ctrl+K', handler() {} }) }
  await host.activate(plugin.manifest, 'builtin')
  staleDispose()
  assert.equal(watchers.get('test.command'), 'Ctrl+J')
  assert.equal(host.commandService.getAll().length, 1)
  await host.deactivate(plugin.manifest.id)
  host.shortcutService.stopListening()
})

test('tracked cleanup is awaited in reverse order and late cleanup still runs', async () => {
  const host = new PluginHost()
  const calls = []
  let ctx
  host.registerBuiltin('test.disposal', builtin('test.disposal', { onLoad(context) {
    ctx = context
    ctx.onDispose(() => { calls.push('first') })
    ctx.onDispose(async () => { await Promise.resolve(); calls.push('second') })
  } }))
  await host.start()
  await host.deactivate('test.disposal')
  assert.deepEqual(calls, ['second', 'first'])
  ctx.onDispose(() => { calls.push('late') })
  await Promise.resolve()
  assert.deepEqual(calls, ['second', 'first', 'late'])
})

function builtin(id, hooks) {
  return { manifest: { id, name: id, version: '1.0.0', builtin: true }, ...hooks }
}

test('built-in contributions register synchronously and activation runs exactly once', async () => {
  const host = new PluginHost()
  const calls = []
  host.registerBuiltin('test.start', builtin('test.start', {
    onLoad: () => { calls.push('load'); return { statusBarItems: [{ id: 'status', text: 'ready' }] } },
    onActivate: async () => { calls.push('activate') },
  }))
  const ready = host.start()
  assert.equal(host.contributions.sortedStatusBarItems.length, 1)
  await ready
  await host.start()
  assert.deepEqual(calls, ['load', 'activate'])
  await host.deactivate('test.start')
})

for (const phase of ['onLoad', 'onActivate']) {
  test(`${phase} failure rolls back commands, subscriptions and contributions`, async () => {
    const host = new PluginHost()
    let disposed = 0
    const plugin = builtin(`test.${phase}`, {
      onLoad(ctx) {
        ctx.commands.register({ id: `test.${phase}.command`, label: 'Test', handler() {} })
        ctx.event.on('test.changed', () => {})
        ctx.event.once('test.once', () => {})
        if (phase === 'onLoad') throw new Error('expected load failure')
        return { statusBarItems: [{ id: 'status', text: 'test' }] }
      },
      onActivate() { throw new Error('expected activation failure') },
      onDeactivate() { disposed++ },
    })
    host.registerBuiltin(plugin.manifest.id, plugin)
    await host.start()
    assert.equal(host.pluginCount, 0)
    assert.equal(host.commandService.getAll().length, 0)
    assert.equal(host.events.listenerCount('test.changed'), 0)
    assert.equal(host.events.listenerCount('test.once'), 0)
    assert.equal(host.contributions.sortedStatusBarItems.length, 0)
    assert.equal(disposed, 1)
  })
}

test('deactivation cleans host resources even when the plugin cleanup throws', async () => {
  const host = new PluginHost()
  let ctx
  host.registerBuiltin('test.cleanup', builtin('test.cleanup', {
    onLoad(context) {
      ctx = context
      ctx.commands.register({ id: 'test.cleanup.command', label: 'Test', handler() {} })
      ctx.event.on('test.event', () => {})
      return { statusBarItems: [{ id: 'status', text: 'test' }] }
    },
    onDeactivate() { throw new Error('expected cleanup failure') },
  }))
  await host.start()
  await host.deactivate('test.cleanup')
  assert.equal(host.pluginCount, 0)
  assert.equal(host.commandService.getAll().length, 0)
  assert.equal(host.events.listenerCount('test.event'), 0)
  assert.equal(ctx.signal.aborted, true)
  assert.throws(() => ctx.commands.register({ id: 'test.late', label: 'Late', handler() {} }))
})

test('external reload uses the loader again and replaces the previous instance', async () => {
  let loaded = 0
  let cleaned = 0
  const manifest = { id: 'test.external', name: 'External', version: '1.0.0', main: 'index.js', pluginRoot: '/plugins/example' }
  const loader = {
    scanPlugins: async () => [],
    readManifest: async () => manifest,
    loadModule: async () => {
      const generation = ++loaded
      return { default: {
        onLoad(ctx) {
          ctx.commands.register({ id: 'test.external.command', label: 'Test', handler() {} })
          return { statusBarItems: [{ id: 'generation', text: String(generation) }] }
        },
        onDeactivate() { cleaned++ },
      } }
    },
  }
  const host = new PluginHost(loader)
  await Promise.all([host.activate(manifest, 'user'), host.activate(manifest, 'user')])
  assert.equal(loaded, 1)
  await host.reload(manifest.id)
  assert.equal(loaded, 2)
  assert.equal(cleaned, 1)
  assert.equal(host.contributions.sortedStatusBarItems[0].text, '2')
  assert.equal(host.commandService.getAll().length, 1)
  await host.deactivate(manifest.id)
})

test('workspace close waits for discovery and leaves no stale workspace plugin', async () => {
  let release
  const gate = new Promise(resolve => { release = resolve })
  const manifest = { id: 'test.workspace', name: 'Workspace', version: '1.0.0', main: 'index.js', pluginRoot: '/workspace/.lamp/plugins/example' }
  const loader = {
    scanPlugins: async path => path.includes('/workspace/') ? [manifest] : [],
    loadModule: async () => { await gate; return { default: { onLoad: () => ({ statusBarItems: [{ id: 'status', text: 'test' }] }) } } },
  }
  const host = new PluginHost(loader)
  const opening = host.setWorkspaceState(true, '/workspace', 'Workspace')
  const closing = host.setWorkspaceState(false, '', '')
  release()
  await Promise.all([opening, closing])
  assert.equal(host.pluginCount, 0)
  assert.equal(host.contributions.sortedStatusBarItems.length, 0)
})
