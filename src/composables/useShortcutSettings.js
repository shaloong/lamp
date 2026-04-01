import { computed, onBeforeUnmount, ref } from 'vue'
import { pluginHost } from '@/plugins/index'

export function useShortcutSettings(t) {
  const searchQuery = ref('')
  const recordingId = ref(null)
  const conflictId = ref(null)
  let recordingHandler = null

  function resolveLabel(label) {
    return label && String(label).includes('.') ? t(label) : label
  }

  const allShortcuts = computed(() => {
    const shortcutEntries = pluginHost.shortcutService.getAll()
    const commandPlugins = new Map(
      pluginHost.commandService.getAll().map(c => [c.id, c.pluginId || 'builtin'])
    )

    return shortcutEntries.map(s => ({
      ...s,
      pluginId: commandPlugins.get(s.id) || 'builtin',
    }))
  })

  const filteredGroups = computed(() => {
    const q = searchQuery.value.toLowerCase()
    const map = new Map()

    for (const s of allShortcuts.value) {
      if (q && !(resolveLabel(s.label) || '').toLowerCase().includes(q) &&
        !(s.effectiveAccelerator || '').toLowerCase().includes(q) &&
        !(s.defaultAccelerator || '').toLowerCase().includes(q) &&
        !s.id.toLowerCase().includes(q)) {
        continue
      }

      if (!map.has(s.pluginId)) {
        map.set(s.pluginId, [])
      }
      map.get(s.pluginId).push(s)
    }

    return [...map.entries()].map(([pluginId, items]) => ({ pluginId, items }))
  })

  function detachRecordingHandler() {
    if (recordingHandler) {
      window.removeEventListener('keydown', recordingHandler)
      recordingHandler = null
    }
  }

  function normalizeKeyName(key) {
    if (key.length === 1) return key.toUpperCase()
    if (key === ' ') return 'Space'
    if (key.startsWith('Arrow')) return key.replace('Arrow', '')
    if (key === 'Backspace') return 'Backspace'
    if (key === 'Delete') return 'Delete'
    if (key === 'Enter') return 'Enter'
    if (key === 'Tab') return 'Tab'
    return key.charAt(0).toUpperCase() + key.slice(1)
  }

  function startRecording(item) {
    if (recordingId.value) return

    recordingId.value = item.id
    conflictId.value = null

    recordingHandler = (e) => {
      const parts = []
      if (e.ctrlKey && !e.metaKey) parts.push('Ctrl')
      if (e.metaKey) parts.push('Cmd')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')

      const key = e.key
      if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
        return
      }
      if (key === 'Escape') {
        cancelRecording()
        return
      }

      const acc = [...parts, normalizeKeyName(key)].join('+')
      if (!acc) return

      const conflictCmdId = pluginHost.shortcutService.checkConflict(acc, item.id)
      if (conflictCmdId) {
        conflictId.value = item.id
        return
      }

      pluginHost.shortcutService.setOverride(item.id, acc)
      recordingId.value = null
      detachRecordingHandler()
    }

    window.addEventListener('keydown', recordingHandler)
  }

  function cancelRecording() {
    recordingId.value = null
    detachRecordingHandler()
  }

  function clearConflict() {
    conflictId.value = null
  }

  function handleReset(id) {
    pluginHost.shortcutService.resetToDefault(id)
  }

  function handleResetAll() {
    pluginHost.shortcutService.resetAll()
  }

  onBeforeUnmount(() => {
    detachRecordingHandler()
  })

  return {
    searchQuery,
    recordingId,
    conflictId,
    filteredGroups,
    resolveLabel,
    startRecording,
    cancelRecording,
    clearConflict,
    handleReset,
    handleResetAll,
  }
}
