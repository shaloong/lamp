export function installBrowserFileAPI() {
  const readFiles = () => JSON.parse(localStorage.getItem('lamp:test:files') || '{}')
  const writeFiles = files => localStorage.setItem('lamp:test:files', JSON.stringify(files))
  const controls = window.__lampTestControls = { failWrites: false, overwrite: false, savePath: '', windowClosed: false }
  const save = async (path, content) => {
    if (controls.failWrites) throw new Error('Simulated disk write failure')
    if (controls.waitForWrite) await controls.waitForWrite
    const files = readFiles()
    files[path] = content
    writeFiles(files)
  }
  const read = async path => {
    const files = readFiles()
    if (!(path in files)) throw new Error('File not found')
    return files[path]
  }
  window.lampAPI = {
    saveInfo: save,
    readTextFile: read,
    openSpecificFile: async path => [1, await read(path)],
    saveInfoIfUnchanged: async (path, content, expected) => {
      const current = readFiles()[path] ?? null
      if (current !== expected) return { saved: false, currentContent: current }
      await save(path, content)
      return { saved: true, currentContent: null }
    },
    hasFile: async path => path in readFiles(),
    delFile: async path => { const files = readFiles(); delete files[path]; writeFiles(files); return true },
    saveFileAs: async () => controls.savePath,
    confirmOverwrite: async () => controls.overwrite,
    getAutoSaveDir: async () => '/app-data/autosave',
    listAutoSaveFiles: async () => Object.entries(readFiles()).filter(([path]) => path.endsWith('.autosave')).map(([path, raw]) => {
      const data = JSON.parse(raw)
      return { tab_id: data.tabId, original_path: data.originalPath, temp_path: path, title: data.title, content: data.content, saved_at: data.savedAt }
    }),
    clearAutoSaveFiles: async () => writeFiles(Object.fromEntries(Object.entries(readFiles()).filter(([path]) => !path.endsWith('.autosave')))),
    getGeneralSettings: async () => ({ language: 'en-US', autoSave: true, autoSaveInterval: 30, restoreOnStart: true, openLastWorkspace: false, theme: 'system' }),
    getEditorSettings: async () => ({ focusMode: false }),
    getAiSettings: async () => ({ provider: 'custom', baseUrl: '', apiKey: '', model: '' }),
    saveGeneralSettings: async () => true,
    saveEditorSettings: async () => true,
    saveAiSettings: async () => true,
    getAppDataDir: async () => '/app-data',
    getUserPluginsDir: async () => '/app-data/plugins',
    getFolderContent: async () => [],
    startWatching: async () => {},
    stopWatching: async () => {},
    onFileChange: () => {},
    isFileInDirectory: async (path, root) => path.startsWith(`${root}/`),
    openWorkspace: async () => null,
    menuFileOpen: async () => [-1],
    isMaximized: async () => false,
    onWindowCloseRequest: () => {},
    closeWindow: () => { controls.windowClosed = true },
    openFile: () => {},
    saveFile: () => {},
    newFile: () => {},
  }
}

export async function attachApp(page) {
  await page.waitForFunction(() => {
    const app = document.querySelector('#app')?.__vue_app__
    const instance = app?._instance || app?._container?._vnode?.component
    if (!instance?.proxy) return false
    window.__lampTestApp = instance.proxy
    return true
  })
}

export async function openDocument(page, path, content) {
  await page.evaluate(async ({ path, content }) => {
    await window.lampAPI.saveInfo(path, content)
    await window.__lampTestApp.openSpecificFile(path)
  }, { path, content })
  await page.locator('.tiptap:visible').waitFor()
  await page.waitForFunction(() => !window.__lampTestApp.tabs[window.__lampTestApp.activeTab]._pendingContentBaseline)
}

export async function documentState(page) {
  return page.evaluate(() => {
    const app = window.__lampTestApp
    const tab = app.tabs[app.activeTab]
    return {
      count: app.tabs.length,
      dirty: tab?.isDirty,
      path: tab?.filePath,
      content: tab?.content,
      closeDialog: app.dialogConfirmCloseTab,
      json: app.getActiveEditorInstance()?.editor.getJSON(),
    }
  })
}

export async function appendText(page, text = ' revised') {
  await page.locator('.tiptap:visible').click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.insertText(text)
}
