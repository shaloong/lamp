export function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function createSearchRegex(text, options = {}) {
  const flags = `g${options.caseSensitive ? '' : 'i'}u`
  const escaped = escapeRegex(text)
  if (!options.wholeWord) {
    return new RegExp(escaped, flags)
  }
  return new RegExp(`(^|[^\\p{L}\\p{N}_])(${escaped})(?=$|[^\\p{L}\\p{N}_])`, flags)
}

export function replaceTextOccurrences(
  content,
  oldText,
  newText,
  options = {},
  { all, occurrenceIndex = 0 } = {},
) {
  if (!oldText || newText === undefined || newText === null) {
    return content
  }

  const regex = createSearchRegex(oldText, options)
  let seen = 0
  const replaceMatch = (...args) => {
    const match = args[0]
    const prefix = options.wholeWord ? args[1] : ''
    const shouldReplace = all || seen === occurrenceIndex
    seen += 1
    if (!shouldReplace) return match
    return `${prefix}${newText}`
  }

  return String(content).replace(regex, replaceMatch)
}

export function replaceEditorSearchMatches(
  editorAdapter,
  oldText,
  newText,
  searchOptions = {},
  { all, occurrenceIndex = 0 } = {},
) {
  if (!editorAdapter || !oldText || newText === undefined || newText === null) {
    return { changed: false, replaced: 0, content: undefined }
  }

  const matches = editorAdapter.getDocumentSearchMatches?.(oldText, searchOptions) || []
  if (matches.length === 0) {
    return { changed: false, replaced: 0, content: editorAdapter.getHTML?.() }
  }

  const targets = all
    ? [...matches].reverse()
    : [matches[Math.max(0, Math.min(occurrenceIndex, matches.length - 1))]]

  for (const match of targets) {
    editorAdapter.replaceDocumentSearchMatch?.(match, newText)
  }

  return {
    changed: targets.length > 0,
    replaced: targets.length,
    content: editorAdapter.getHTML?.(),
  }
}
