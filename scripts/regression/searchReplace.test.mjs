import test from 'node:test'
import assert from 'node:assert/strict'

import {
  replaceEditorSearchMatches,
  replaceTextOccurrences,
} from '../../src/lib/searchReplace.js'

function createPlainTextEditorAdapter(initialContent) {
  let content = initialContent

  return {
    getDocumentSearchMatches(query, options = {}) {
      const needle = options.caseSensitive ? query : query.toLowerCase()
      const source = options.caseSensitive ? content : content.toLowerCase()
      const matches = []
      let start = 0
      while (start <= source.length) {
        const index = source.indexOf(needle, start)
        if (index === -1) break
        matches.push({ from: index, to: index + needle.length })
        start = index + 1
      }
      return matches
    },
    replaceDocumentSearchMatch(match, replacement) {
      content = content.slice(0, match.from) + replacement + content.slice(match.to)
    },
    getHTML() {
      return content
    },
  }
}

test('replaceTextOccurrences can replace one selected occurrence', () => {
  const result = replaceTextOccurrences(
    'alpha beta alpha',
    'alpha',
    'omega',
    { caseSensitive: false, wholeWord: false },
    { all: false, occurrenceIndex: 1 },
  )

  assert.equal(result, 'alpha beta omega')
})

test('replaceTextOccurrences respects whole-word boundaries', () => {
  const result = replaceTextOccurrences(
    'cat scatter cat',
    'cat',
    'dog',
    { caseSensitive: false, wholeWord: true },
    { all: true },
  )

  assert.equal(result, 'dog scatter dog')
})

test('replaceEditorSearchMatches applies workspace replacement to the current open draft', () => {
  const editor = createPlainTextEditorAdapter('unsaved old draft and old saved text')

  const result = replaceEditorSearchMatches(
    editor,
    'old',
    'new',
    { caseSensitive: false, wholeWord: false },
    { all: true },
  )

  assert.equal(result.changed, true)
  assert.equal(result.replaced, 2)
  assert.equal(result.content, 'unsaved new draft and new saved text')
})
