import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { extractReleaseNotes } from '../release-notes.mjs'

test('extracts only the requested release and keeps subsection headings', () => {
  const changelog = '# Changelog\n\n## [2.0.0]\nNew\n\n## [1.0.0]\n### Highlights\nFirst\n\n## [0.1.0]\nOld'
  assert.equal(extractReleaseNotes(changelog, '1.0.0'), '### Highlights\nFirst')
})

test('rejects missing, duplicate and empty release entries', () => {
  assert.throws(() => extractReleaseNotes('## [2.0.0]\nNew', '1.0.0'))
  assert.throws(() => extractReleaseNotes('## [1.0.0]\nA\n## [1.0.0]\nB', '1.0.0'))
  assert.throws(() => extractReleaseNotes('## [1.0.0]\n\n## [0.1.0]\nOld', '1.0.0'))
})

test('the current application has complete release notes', () => {
  const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
  const changelog = readFileSync(new URL('../../CHANGELOG.md', import.meta.url), 'utf8')
  const body = extractReleaseNotes(changelog, version)
  for (const section of ['Overview', 'Highlights', 'Downloads', 'Installation', 'Known Limitations']) {
    assert.ok(body.includes(`/ ${section}`), `Missing release section: ${section}`)
  }
})
