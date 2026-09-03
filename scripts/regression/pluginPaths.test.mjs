import test from 'node:test'
import assert from 'node:assert/strict'

import { resolvePluginEntryPath } from '../../src/lib/pluginPaths.js'

test('resolves a plugin entry relative to its own root directory', () => {
  assert.equal(
    resolvePluginEntryPath('E:\\novel\\.lamp\\plugins\\word-tools', 'dist/index.js'),
    'E:/novel/.lamp/plugins/word-tools/dist/index.js',
  )
})

test('rejects plugin entry paths that escape the plugin root', () => {
  assert.throws(
    () => resolvePluginEntryPath('E:/plugins/word-tools', '../other/index.js'),
    /must stay inside its plugin directory/,
  )
})

test('rejects absolute plugin entry paths', () => {
  assert.throws(
    () => resolvePluginEntryPath('E:/plugins/word-tools', 'C:/temp/index.js'),
    /must be relative/,
  )
  assert.throws(
    () => resolvePluginEntryPath('/plugins/word-tools', '/tmp/index.js'),
    /must be relative/,
  )
})
