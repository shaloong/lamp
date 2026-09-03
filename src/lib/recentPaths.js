export const RECENT_FILES_KEY = 'lamp:recent-files'
export const LAST_WORKSPACE_KEY = 'lamp:last-workspace'

export function normalizeStoredPath(path) {
  return String(path || '').replace(/\\/g, '/')
}

export function readRecentPaths(storage, limit = 10) {
  if (!storage) return []
  try {
    const parsed = JSON.parse(storage.getItem(RECENT_FILES_KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(path => typeof path === 'string' && path.length > 0)
      .map(normalizeStoredPath)
      .slice(0, limit)
  } catch {
    return []
  }
}

export function rememberRecentPath(storage, path, limit = 10) {
  if (!storage) return []
  const normalized = normalizeStoredPath(path)
  if (!normalized) return readRecentPaths(storage, limit)

  const paths = [
    normalized,
    ...readRecentPaths(storage, limit).filter(existing => existing !== normalized),
  ].slice(0, limit)
  try {
    storage.setItem(RECENT_FILES_KEY, JSON.stringify(paths))
  } catch {
    // Keep the in-memory list useful when persistence is unavailable.
  }
  return paths
}

export function forgetRecentPath(storage, path, limit = 10) {
  const normalized = normalizeStoredPath(path)
  const paths = readRecentPaths(storage, limit).filter(existing => existing !== normalized)
  try {
    storage?.setItem(RECENT_FILES_KEY, JSON.stringify(paths))
  } catch {
    // Ignore unavailable or full storage.
  }
  return paths
}

export function rememberWorkspace(storage, path) {
  const normalized = normalizeStoredPath(path)
  if (!storage || !normalized) return normalized
  try {
    storage.setItem(LAST_WORKSPACE_KEY, normalized)
  } catch {
    // Workspace activation should not fail because persistence is unavailable.
  }
  return normalized
}

export function readLastWorkspace(storage) {
  if (!storage) return ''
  try {
    return normalizeStoredPath(storage.getItem(LAST_WORKSPACE_KEY) || '')
  } catch {
    return ''
  }
}
