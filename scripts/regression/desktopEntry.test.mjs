import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync(new URL('../../src-tauri/tauri.conf.json', import.meta.url), 'utf8'))

test('the main desktop window opens the bundled frontend entry', () => {
  const mainWindow = config.app.windows.find(window => window.label === 'main')
  assert.ok(mainWindow, 'The main window must be configured')
  assert.equal(mainWindow.url ?? 'index.html', 'index.html')
})

test('the development server and production assets have separate build settings', () => {
  assert.equal(config.build.devUrl, 'http://localhost:1086')
  assert.equal(config.build.frontendDist, '../dist')
  assert.equal(config.build.beforeBuildCommand, 'pnpm run build')
})
