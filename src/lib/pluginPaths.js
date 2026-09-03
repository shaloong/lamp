export function resolvePluginEntryPath(pluginRoot, mainEntry) {
  const root = String(pluginRoot || '').replace(/\\/g, '/').replace(/\/+$/, '')
  const entry = String(mainEntry || '').replace(/\\/g, '/')
  if (!root) throw new Error('Plugin root path is required')
  if (!entry) throw new Error('Plugin main entry is required')
  if (/^(?:[a-z]:\/|\/)/i.test(entry)) {
    throw new Error('Plugin main entry must be relative')
  }

  const segments = entry.split('/').filter(segment => segment && segment !== '.')
  if (segments.includes('..')) {
    throw new Error('Plugin main entry must stay inside its plugin directory')
  }
  if (segments.length === 0) {
    throw new Error('Plugin main entry is required')
  }

  return `${root}/${segments.join('/')}`
}
