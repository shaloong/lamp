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
