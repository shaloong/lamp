import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getFileExtension,
  htmlToPlainText,
  plainTextToHtml,
} from '../../src/lib/documentFormats.js'

test('detects file extensions without case sensitivity', () => {
  assert.equal(getFileExtension('E:/novel/CHAPTER.MD'), 'md')
  assert.equal(getFileExtension('E:/novel/notes.TXT'), 'txt')
  assert.equal(getFileExtension('E:/novel/no-extension'), '')
})

test('plain text round-trips markup-like characters as literal text', () => {
  const source = '<chapter one> & "quoted"\r\n第二行'
  const html = plainTextToHtml(source)

  assert.match(html, /&lt;chapter one&gt;/)
  assert.match(html, /&amp;/)
  assert.equal(htmlToPlainText(html), '<chapter one> & "quoted"\n第二行')
})

test('plain text round-trips leading, trailing, and repeated line breaks', () => {
  const source = '\nfirst\n\nthird\n'

  assert.equal(htmlToPlainText(plainTextToHtml(source)), source)
})

test('HTML conversion preserves editor line breaks and decodes entities', () => {
  const html = '<p>A&nbsp;&amp;&nbsp;B<br>next</p><p>&lt;end&gt;</p>'

  assert.equal(htmlToPlainText(html), 'A & B\nnext\n<end>')
})
