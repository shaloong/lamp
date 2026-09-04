import { test, expect } from '@playwright/test'
import { appendText, attachApp, documentState, installBrowserFileAPI, openDocument } from './desktop-fixture.mjs'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(installBrowserFileAPI)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await attachApp(page)
})

const formats = {
  md: '# Chapter\n\n1. first\n2. second\n\n```js\nconst value = "<tag>";\n```\n\n> quoted text\n\nA **bold** ending & a [link](https://example.com).\n',
  txt: '\n  <title> & literal  **text**\n\nlast line\n',
  html: '<h1>Chapter</h1>\n<p>A <strong>bold</strong> ending &amp; text.</p>\n',
  lmph: '<h1>Chapter</h1>\n<p>A <em>quiet</em> ending.</p>\n',
}

for (const [ending, content] of Object.entries({ code: '```js\nconst value = 1;\n```', list: '1. first\n2. last', rule: 'Text\n\n---', heading: '# Last heading' })) {
  test(`Markdown ending in ${ending} stays clean after focus and cursor movement`, async ({ page }) => {
    await openDocument(page, `/documents/${ending}.md`, content)
    await page.locator('.tiptap:visible').click()
    await page.keyboard.press('ControlOrMeta+End')
    expect((await documentState(page)).dirty).toBe(false)
    await page.locator('.editor-tab .close-button').click()
    await expect(page.locator('.editor-tab')).toHaveCount(0)
  })
}

for (const [extension, content] of Object.entries(formats)) {
  test(`${extension}: opening and closing without edits neither prompts nor rewrites`, async ({ page }) => {
    const path = `/documents/chapter.${extension}`
    await openDocument(page, path, content)
    expect((await documentState(page)).dirty).toBe(false)
    await page.locator('.editor-tab .close-button').click()
    await expect(page.locator('.editor-tab')).toHaveCount(0)
    expect((await documentState(page)).closeDialog).toBe(false)
    expect(await page.evaluate(path => window.lampAPI.readTextFile(path), path)).toBe(content)
  })

  test(`${extension}: edited content survives save and reopening through the real editor`, async ({ page }) => {
    const path = `/documents/chapter.${extension}`
    await openDocument(page, path, content)
    await appendText(page)
    const edited = await documentState(page)
    expect(edited.dirty).toBe(true)
    expect(await page.evaluate(() => window.__lampTestApp.fileSave())).toBe(true)
    expect((await documentState(page)).dirty).toBe(false)
    await page.locator('.editor-tab .close-button').click()
    await page.evaluate(path => window.__lampTestApp.openSpecificFile(path), path)
    await page.locator('.tiptap:visible').waitFor()
    expect((await documentState(page)).json).toEqual(edited.json)
  })
}

test('save failure and canceled Save As keep the draft and close confirmation open', async ({ page }) => {
  await openDocument(page, '/documents/failure.md', 'Original')
  await appendText(page)
  await page.locator('.editor-tab .close-button').click()
  await page.evaluate(async () => {
    window.__lampTestControls.failWrites = true
    await window.__lampTestApp.handleSave()
  })
  expect(await documentState(page)).toMatchObject({ count: 1, dirty: true, closeDialog: true })
  await expect(page.getByRole('alert').filter({ hasText: 'Simulated disk write failure' }).last()).toBeVisible()
  await page.evaluate(async () => {
    window.__lampTestControls.failWrites = false
    window.__lampTestApp.cancelPendingClose()
    window.__lampTestApp.newFile()
  })
  await appendText(page, 'new draft')
  await page.locator('.editor-tab .close-button').last().click()
  await page.evaluate(() => window.__lampTestApp.handleSave())
  expect(await documentState(page)).toMatchObject({ count: 2, dirty: true, closeDialog: true })
})

test('external changes require consent before overwriting', async ({ page }) => {
  await openDocument(page, '/documents/conflict.md', 'Original')
  await appendText(page)
  await page.evaluate(() => window.lampAPI.saveInfo('/documents/conflict.md', 'External edit'))
  expect(await page.evaluate(() => window.__lampTestApp.fileSave())).toBe(false)
  expect(await page.evaluate(() => window.lampAPI.readTextFile('/documents/conflict.md'))).toBe('External edit')
  expect((await documentState(page)).dirty).toBe(true)
  await page.evaluate(() => { window.__lampTestControls.overwrite = true })
  expect(await page.evaluate(() => window.__lampTestApp.fileSave())).toBe(true)
})

test('typing during a save does not mark newer edits as saved', async ({ page }) => {
  await openDocument(page, '/documents/race.md', 'Original')
  await appendText(page, ' first')
  await page.evaluate(() => {
    const controls = window.__lampTestControls
    controls.waitForWrite = new Promise(resolve => { controls.releaseWrite = resolve })
    controls.saveResult = window.__lampTestApp.fileSave()
  })
  await appendText(page, ' later')
  await page.evaluate(async () => {
    const controls = window.__lampTestControls
    controls.releaseWrite()
    await controls.saveResult
  })
  expect((await documentState(page)).dirty).toBe(true)
  expect(await page.evaluate(() => window.lampAPI.readTextFile('/documents/race.md'))).not.toContain('later')
})

test('recovery survives reload and remains dirty until explicitly saved', async ({ page }) => {
  await openDocument(page, '/documents/recovery.md', 'Original')
  await appendText(page, ' recover me')
  const edited = await documentState(page)
  await page.evaluate(() => {
    const app = window.__lampTestApp
    return app.doAutoSave(app.tabs[app.activeTab].id)
  })
  expect(await page.evaluate(() => window.lampAPI.readTextFile('/documents/recovery.md'))).toBe('Original')
  await page.reload()
  await attachApp(page)
  await page.waitForFunction(() => window.__lampTestApp.dialogRecovery)
  await page.evaluate(() => {
    const app = window.__lampTestApp
    return app.recoverFile(app.recoveryFiles[0])
  })
  await page.locator('.tiptap:visible').waitFor()
  expect(await documentState(page)).toMatchObject({ dirty: true, json: edited.json })
  expect(await page.evaluate(() => window.__lampTestApp.fileSave())).toBe(true)
  expect(await page.evaluate(() => window.lampAPI.listAutoSaveFiles())).toEqual([])
})

test('canceling window close preserves unsaved documents', async ({ page }) => {
  await openDocument(page, '/documents/close.txt', 'Original')
  await appendText(page)
  await page.evaluate(() => window.__lampTestApp.requestCloseWindow())
  expect((await documentState(page)).closeDialog).toBe(true)
  await page.evaluate(() => window.__lampTestApp.cancelPendingClose())
  expect(await documentState(page)).toMatchObject({ count: 1, dirty: true, closeDialog: false })
  expect(await page.evaluate(() => window.__lampTestControls.windowClosed)).toBe(false)
})

test('search spans inline formatting and replacement is literal text', async ({ page }) => {
  await openDocument(page, '/documents/search.html', '<p>hel<strong>lo</strong> hello</p>')
  expect(await page.evaluate(() => window.__lampTestApp.getDocumentMatches('hello').length)).toBe(2)
  await page.evaluate(() => window.__lampTestApp.handleSearchReplace({
    type: 'document', oldText: 'hello', newText: '<note> & $1', all: true,
  }))
  expect(await page.locator('.tiptap:visible').innerText()).toBe('<note> & $1 <note> & $1')
  expect((await documentState(page)).dirty).toBe(true)
})

test('replace all uses non-overlapping matches and supports deletion', async ({ page }) => {
  await openDocument(page, '/documents/search.txt', 'aaa aaa')
  await page.evaluate(() => window.__lampTestApp.handleSearchReplace({
    type: 'document', oldText: 'aa', newText: 'x', all: true,
  }))
  expect(await page.locator('.tiptap:visible').innerText()).toBe('xa xa')
  await page.evaluate(() => window.__lampTestApp.handleSearchReplace({
    type: 'document', oldText: 'x', newText: '', all: true,
  }))
  expect(await page.locator('.tiptap:visible').innerText()).toBe('a a')
})
