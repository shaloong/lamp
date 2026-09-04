import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from '@playwright/test'
import { appendText, attachApp, documentState, openDocument } from './e2e/desktop-fixture.mjs'

assert.equal(process.platform, 'win32', 'The installed-package smoke test currently supports Windows only')
assert.ok(process.env.npm_execpath, 'Run this script with pnpm run test:desktop')
const root = fileURLToPath(new URL('../', import.meta.url))
const temp = await mkdtemp(path.join(tmpdir(), 'lamp-smoke-'))
const identifier = `com.shaloong.lamp.smoke-${path.basename(temp).slice('lamp-smoke-'.length).toLowerCase()}`
const installDir = path.join(temp, 'install')
const artifacts = path.join(root, 'test-results', 'desktop')
let appData
let processHandle
let browser
let page
let installed = false

async function run(command, args, options = {}) {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', windowsHide: true, ...options })
  const [code] = await once(child, 'exit')
  assert.equal(code, 0, `${path.basename(command)} exited with ${code}`)
}

async function start(cwd) {
  const socket = createServer()
  socket.listen(0, '127.0.0.1')
  await once(socket, 'listening')
  const port = socket.address().port
  await new Promise(resolve => socket.close(resolve))
  const exe = (await readdir(installDir)).find(name => name.endsWith('.exe') && !/uninstall/i.test(name))
  assert.ok(exe, 'Installed application executable is missing')
  processHandle = spawn(path.join(installDir, exe), [], {
    cwd, windowsHide: true, stdio: 'ignore',
    env: {
      ...process.env,
      WEBVIEW2_USER_DATA_FOLDER: path.join(temp, 'webview'),
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`,
    },
  })
  processHandle.on('error', error => { console.error(error) })
  const endpoint = `http://127.0.0.1:${port}`
  let connected = false
  for (let attempt = 0; attempt < 120; attempt++) {
    assert.equal(processHandle.exitCode, null, 'Application exited before its WebView was ready')
    try {
      const response = await fetch(`${endpoint}/json/version`)
      if (response.ok) { connected = true; break }
    } catch { /* WebView2 is still starting. */ }
    await delay(500)
  }
  assert.ok(connected, 'WebView2 debugging endpoint did not become ready')
  browser = await chromium.connectOverCDP(endpoint)
  const context = browser.contexts()[0]
  page = context.pages()[0] || await context.waitForEvent('page')
  page.setDefaultTimeout(30000)
  await attachApp(page)
  assert.equal(await page.evaluate(() => typeof window.__TAURI_INTERNALS__?.invoke), 'function')
  const dataPath = await page.evaluate(() => window.lampAPI.getAppDataDir())
  assert.equal(path.basename(dataPath), identifier, 'Smoke test must not use the real application data directory')
  appData = dataPath
  return page
}

async function stop(crash = false) {
  if (processHandle && processHandle.exitCode === null) {
    const exited = once(processHandle, 'exit')
    if (crash) processHandle.kill()
    else await page.evaluate(() => window.lampAPI.closeWindow()).catch(() => {})
    await Promise.race([exited, delay(15000).then(() => { throw new Error('Application did not close') })])
  }
  await browser?.close().catch(() => {})
  browser = undefined
  processHandle = undefined
}

try {
  console.log('Building an isolated Windows NSIS package...')
  await run(process.execPath, [process.env.npm_execpath, 'tauri', 'build', '--ci', '--bundles', 'nsis', '--config', JSON.stringify({ identifier, productName: 'Lamp Smoke' })])
  const bundleDir = path.join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis')
  const installer = (await readdir(bundleDir)).find(name => name.startsWith('Lamp Smoke_') && name.endsWith('-setup.exe'))
  assert.ok(installer, 'NSIS installer was not produced')
  await run(path.join(bundleDir, installer), ['/S', `/D=${installDir}`])
  installed = true
  const legacy = JSON.stringify({ general: { language: 'en-US', autoSave: true, autoSaveInterval: 30, restoreOnStart: true, openLastWorkspace: false, theme: 'light' } })
  await writeFile(path.join(installDir, 'config.json'), legacy)
  await start(temp)
  assert.equal(JSON.parse(await readFile(path.join(appData, 'config.json'), 'utf8')).general.theme, 'light')
  await page.evaluate(async () => {
    const settings = await window.lampAPI.getGeneralSettings()
    await window.lampAPI.saveGeneralSettings({ ...settings, theme: 'dark' })
  })
  assert.equal(JSON.parse(await readFile(path.join(appData, 'config.json'), 'utf8')).general.theme, 'dark')
  assert.equal(await readFile(path.join(installDir, 'config.json'), 'utf8'), legacy)

  const pluginDir = path.join(appData, 'plugins', 'smoke-example')
  await mkdir(pluginDir, { recursive: true })
  await writeFile(path.join(pluginDir, 'manifest.json'), JSON.stringify({ id: 'smoke.example', name: 'Smoke Example', version: '1.0.0', main: 'index.js' }))
  const pluginSource = generation => `
    export const messages = { 'en-US': { label: '${generation}' } };
    export default {
      onLoad(ctx) {
        ctx.commands.register({ id: 'smoke.example.command', label: ctx.i18n.key('label'), handler() {} });
        ctx.onDispose(() => ctx.storage.set('cleaned', '${generation}'));
      },
      onActivate(ctx) { ctx.storage.set('generation', '${generation}'); }
    };
  `
  await writeFile(path.join(pluginDir, 'index.js'), pluginSource('first'))
  await page.evaluate(() => window.__lampTestApp.pluginHost.startDynamic())
  assert.equal(await page.evaluate(() => window.__lampTestApp.pluginHost.getContext('smoke.example')?.storage.get('generation')), 'first')
  await writeFile(path.join(pluginDir, 'index.js'), pluginSource('second'))
  await page.evaluate(() => window.__lampTestApp.pluginHost.reload('smoke.example'))
  assert.deepEqual(await page.evaluate(() => {
    const ctx = window.__lampTestApp.pluginHost.getContext('smoke.example')
    return [ctx.storage.get('generation'), ctx.storage.get('cleaned'), ctx.i18n.t('label')]
  }), ['second', 'first', 'second'])
  await page.evaluate(() => window.__lampTestApp.pluginHost.deactivate('smoke.example'))
  assert.equal(await page.evaluate(() => window.__lampTestApp.pluginHost.commandService.getAll().some(command => command.id === 'smoke.example.command')), false)

  for (const [extension, content] of Object.entries({ md: '# Chapter\n\n1. first\n2. second\n\n```js\nconst x = "<tag>";\n```', txt: '\n  literal <tag>  text\n\n' })) {
    const target = path.join(temp, `chapter.${extension}`).replaceAll('\\', '/')
    await openDocument(page, target, content)
    assert.equal((await documentState(page)).dirty, false)
    await page.locator('.editor-tab .close-button').click()
    assert.equal(await readFile(target, 'utf8'), content)
    await page.evaluate(target => window.__lampTestApp.openSpecificFile(target), target)
    await appendText(page, ' saved')
    const edited = await documentState(page)
    assert.equal(await page.evaluate(() => window.__lampTestApp.fileSave()), true)
    await page.locator('.editor-tab .close-button').click()
    await page.evaluate(target => window.__lampTestApp.openSpecificFile(target), target)
    assert.deepEqual((await documentState(page)).json, edited.json)
    await page.locator('.editor-tab .close-button').click()
  }
  const recoveryPath = path.join(temp, 'recovery.md').replaceAll('\\', '/')
  await openDocument(page, recoveryPath, 'Original')
  await appendText(page, ' recovered')
  const beforeCrash = await documentState(page)
  await page.evaluate(() => { const app = window.__lampTestApp; return app.doAutoSave(app.tabs[app.activeTab].id) })
  assert.equal(await readFile(recoveryPath, 'utf8'), 'Original')
  await stop(true)

  const otherCwd = path.join(temp, 'other-cwd')
  await mkdir(otherCwd)
  await writeFile(path.join(otherCwd, 'config.json'), 'unrelated invalid JSON')
  await start(otherCwd)
  assert.equal(await page.evaluate(async () => (await window.lampAPI.getGeneralSettings()).theme), 'dark')
  await page.waitForFunction(() => window.__lampTestApp.dialogRecovery)
  await page.evaluate(() => { const app = window.__lampTestApp; return app.recoverFile(app.recoveryFiles[0]) })
  assert.deepEqual((await documentState(page)).json, beforeCrash.json)
  assert.equal((await documentState(page)).dirty, true)
  assert.equal(await page.evaluate(() => window.__lampTestApp.fileSave()), true)
  assert.deepEqual(await page.evaluate(() => window.lampAPI.listAutoSaveFiles()), [])
  await stop()
  console.log('PASS: installed package, settings migration/restart, external plugin reload, Markdown/TXT round-trips, crash recovery and real IPC saves')
} catch (error) {
  await mkdir(artifacts, { recursive: true })
  await page?.screenshot({ path: path.join(artifacts, 'failure.png') }).catch(() => {})
  throw error
} finally {
  await stop(true)
  if (installed) {
    const uninstaller = (await readdir(installDir)).find(name => /uninstall.*\.exe$/i.test(name))
    if (uninstaller) await run(path.join(installDir, uninstaller), ['/S', `_?=${installDir}`])
  }
  if (appData && path.basename(appData) === identifier) await rm(appData, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 })
  assert.equal(path.dirname(temp), path.resolve(tmpdir()))
  assert.ok(path.basename(temp).startsWith('lamp-smoke-'))
  await rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 })
}
