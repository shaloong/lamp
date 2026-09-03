export function adoptEditorBaseline(tab, normalizedContent) {
  if (!tab || !tab._pendingContentBaseline || tab.isDirty) {
    return false
  }

  tab.content = normalizedContent
  tab.savedContent = normalizedContent
  tab.isDirty = false
  tab._hasUnsavedAutoSave = false
  tab._pendingContentBaseline = false
  return true
}

export function applyEditorContentUpdate(tab, nextContent) {
  if (!tab) {
    return { changed: false, dirty: false, adoptedBaseline: false }
  }

  if (tab.content === nextContent) {
    return { changed: false, dirty: tab.isDirty, adoptedBaseline: false }
  }

  if (adoptEditorBaseline(tab, nextContent)) {
    return { changed: true, dirty: false, adoptedBaseline: true }
  }

  tab._pendingContentBaseline = false
  tab.content = nextContent
  tab.isDirty = tab.content !== tab.savedContent
  tab._hasUnsavedAutoSave = tab.isDirty

  return { changed: true, dirty: tab.isDirty, adoptedBaseline: false }
}

export function commitSavedSnapshot(tab, savedContent) {
  if (!tab) {
    return { clean: false, dirty: false }
  }

  tab.savedContent = savedContent
  tab._pendingContentBaseline = false
  tab.isDirty = tab.content !== savedContent
  tab._hasUnsavedAutoSave = tab.isDirty

  return { clean: !tab.isDirty, dirty: tab.isDirty }
}

export function commitAutoSaveSnapshot(tab, savedContent, tempPath, epoch) {
  if (!tab || tab._autoSaveEpoch !== epoch) {
    return {
      accepted: false,
      previousPath: '',
      needsAnotherSave: !!tab?._hasUnsavedAutoSave,
    }
  }

  const previousPath = tab._autoSavePath || ''
  tab._autoSavePath = tempPath
  tab._hasUnsavedAutoSave = tab.isDirty && tab.content !== savedContent

  return {
    accepted: true,
    previousPath,
    needsAnotherSave: tab._hasUnsavedAutoSave,
  }
}

export function invalidateAutoSave(tab) {
  if (!tab) return ''

  const previousPath = tab._autoSavePath || ''
  tab._autoSaveEpoch = (tab._autoSaveEpoch || 0) + 1
  tab._autoSavePath = ''
  return previousPath
}
