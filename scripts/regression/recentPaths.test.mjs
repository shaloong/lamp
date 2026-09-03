import test from 'node:test'
import assert from 'node:assert/strict'

import {
  forgetRecentPath,
  readLastWorkspace,
  readRecentPaths,
  rememberRecentPath,
  rememberWorkspace,
} from '../../src/lib/recentPaths.js'

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

test('recent paths are normalized, deduplicated, and newest first', () => {
  const storage = createStorage()

  rememberRecentPath(storage, 'E:\\novel\\chapter-1.md')
  rememberRecentPath(storage, 'E:/novel/chapter-2.md')
  rememberRecentPath(storage, 'E:/novel/chapter-1.md')

  assert.deepEqual(readRecentPaths(storage), [
    'E:/novel/chapter-1.md',
    'E:/novel/chapter-2.md',
  ])
})

test('invalid persisted recent data is ignored', () => {
  const storage = createStorage({ 'lamp:recent-files': '{broken json' })

  assert.deepEqual(readRecentPaths(storage), [])
})

test('recent files can be forgotten after a missing-path failure', () => {
  const storage = createStorage()
  rememberRecentPath(storage, 'E:/novel/missing.md')
  rememberRecentPath(storage, 'E:/novel/current.md')

  forgetRecentPath(storage, 'E:\\novel\\missing.md')

  assert.deepEqual(readRecentPaths(storage), ['E:/novel/current.md'])
})

test('last workspace path is normalized and persisted independently', () => {
  const storage = createStorage()

  rememberWorkspace(storage, 'E:\\novel')

  assert.equal(readLastWorkspace(storage), 'E:/novel')
})
