import test from 'node:test'
import assert from 'node:assert/strict'

import {
  adoptEditorBaseline,
  applyEditorContentUpdate,
} from '../../src/lib/documentDirtyState.js'

function cleanTab(content) {
  return {
    content,
    savedContent: content,
    isDirty: false,
    _hasUnsavedAutoSave: false,
    _pendingContentBaseline: true,
  }
}

test('adopts TipTap-normalized HTML as the clean baseline after opening Markdown', () => {
  const openedMarkdownHtml = '<h1>Hello</h1>\n<p>world</p>\n'
  const tiptapNormalizedHtml = '<h1>Hello</h1><p>world</p>'
  const tab = cleanTab(openedMarkdownHtml)

  assert.equal(adoptEditorBaseline(tab, tiptapNormalizedHtml), true)
  assert.equal(tab.content, tiptapNormalizedHtml)
  assert.equal(tab.savedContent, tiptapNormalizedHtml)
  assert.equal(tab.isDirty, false)
  assert.equal(tab._hasUnsavedAutoSave, false)
  assert.equal(tab._pendingContentBaseline, false)
})

test('treats the first editor update during baseline sync as clean', () => {
  const tab = cleanTab('<p>opened</p>\n')

  const result = applyEditorContentUpdate(tab, '<p>opened</p>')

  assert.deepEqual(result, { changed: true, dirty: false, adoptedBaseline: true })
  assert.equal(tab.isDirty, false)
  assert.equal(tab.savedContent, '<p>opened</p>')
})

test('marks later content changes dirty after the baseline is settled', () => {
  const tab = cleanTab('<p>opened</p>')
  adoptEditorBaseline(tab, '<p>opened</p>')

  const result = applyEditorContentUpdate(tab, '<p>opened and edited</p>')

  assert.deepEqual(result, { changed: true, dirty: true, adoptedBaseline: false })
  assert.equal(tab.isDirty, true)
  assert.equal(tab._hasUnsavedAutoSave, true)
})

test('does not overwrite a tab that is already dirty', () => {
  const tab = {
    content: '<p>draft</p>',
    savedContent: '<p>opened</p>',
    isDirty: true,
    _hasUnsavedAutoSave: true,
    _pendingContentBaseline: true,
  }

  assert.equal(adoptEditorBaseline(tab, '<p>normalized</p>'), false)
  assert.equal(tab.content, '<p>draft</p>')
  assert.equal(tab.savedContent, '<p>opened</p>')
  assert.equal(tab.isDirty, true)
})
