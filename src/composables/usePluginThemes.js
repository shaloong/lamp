import { watch } from 'vue'

function isAbsoluteStylesheet(value) {
  return /^(https?:|file:|data:|blob:|\/)/i.test(value) || /^[A-Za-z]:[\\/]/.test(value)
}

function isUrlLike(value) {
  return /^(https?:|file:|data:|blob:)/i.test(value)
}

function normalizeStylesheetHref(value) {
  if (!value) return ''
  if (/^[A-Za-z]:[\\/]/.test(value)) {
    return `file:///${String(value).replace(/\\/g, '/')}`
  }
  return String(value)
}

function getPluginRoot(pluginHost, pluginId) {
  if (!pluginId) return ''
  const loaded = pluginHost.plugins?.get?.(pluginId)
  return loaded?.manifest?.pluginRoot || ''
}

function resolveRelativeStylesheet(pluginHost, pluginId, stylesheet) {
  const root = getPluginRoot(pluginHost, pluginId)
  if (!root) return ''

  if (isUrlLike(root)) {
    try {
      const base = root.endsWith('/') ? root : `${root}/`
      return new URL(stylesheet, base).toString()
    } catch {
      return ''
    }
  }

  const normalizedRoot = String(root).replace(/\\/g, '/').replace(/\/+$/, '')
  const normalizedAsset = String(stylesheet).replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '')
  if (!normalizedRoot || !normalizedAsset) return ''
  return `${normalizedRoot}/${normalizedAsset}`
}

export function setupPluginThemes(pluginHost) {
  const root = document.documentElement
  const appliedTokenKeys = new Set()
  const styleNodes = new Map()

  function applyTokens(themes) {
    const nextTokens = {}
    for (const theme of themes) {
      if (!theme?.tokens || typeof theme.tokens !== 'object') continue
      for (const [token, value] of Object.entries(theme.tokens)) {
        if (!token) continue
        nextTokens[token] = String(value)
      }
    }

    for (const key of appliedTokenKeys) {
      if (!(key in nextTokens)) {
        root.style.removeProperty(`--${key}`)
      }
    }

    for (const [key, value] of Object.entries(nextTokens)) {
      root.style.setProperty(`--${key}`, value)
    }

    appliedTokenKeys.clear()
    for (const key of Object.keys(nextTokens)) {
      appliedTokenKeys.add(key)
    }
  }

  function applyStylesheets(themes) {
    const next = new Map()

    for (const theme of themes) {
      const rawHref = theme?.stylesheet
      if (!rawHref) continue

      const key = `${theme.pluginId || 'host'}:${theme.id}`
      let resolvedHref = rawHref

      if (!isAbsoluteStylesheet(rawHref)) {
        resolvedHref = resolveRelativeStylesheet(pluginHost, theme.pluginId, rawHref)
        if (!resolvedHref) {
          console.warn(`[PluginThemes] Failed to resolve relative stylesheet "${rawHref}" for theme "${theme.id}" from plugin "${theme.pluginId}".`)
          continue
        }
      }

      next.set(key, normalizeStylesheetHref(resolvedHref))
    }

    for (const [key, node] of styleNodes.entries()) {
      if (!next.has(key)) {
        node.remove()
        styleNodes.delete(key)
      }
    }

    for (const [key, href] of next.entries()) {
      const existing = styleNodes.get(key)
      if (existing) {
        if (existing.getAttribute('href') !== href) {
          existing.setAttribute('href', href)
        }
        continue
      }

      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.dataset.lampTheme = key
      document.head.appendChild(link)
      styleNodes.set(key, link)
    }
  }

  function applyThemes() {
    const themes = pluginHost.contributions.sortedThemes
    applyTokens(themes)
    applyStylesheets(themes)
  }

  const stopWatch = watch(
    () => pluginHost.contributions.sortedThemes,
    () => applyThemes(),
    { deep: true, immediate: true },
  )

  const offActivated = pluginHost.events.on('lamp.plugin.activated', applyThemes)
  const offDeactivated = pluginHost.events.on('lamp.plugin.deactivated', applyThemes)
  const offReady = pluginHost.events.on('lamp.plugins.ready', applyThemes)

  return () => {
    stopWatch()
    offActivated()
    offDeactivated()
    offReady()
  }
}
