<template>
  <div class="shortcut-settings">
    <!-- 搜索框 -->
    <div class="search-bar">
      <div class="search-input-wrap">
        <svg class="search-icon" viewBox="0 0 1024 1024" fill="currentColor">
          <path
            d="M480.8 137.6c-88.8 0-171.4 34.6-232.5 95.7-61.1 61.1-95.7 143.7-95.7 232.5 0 88.8 34.6 171.4 95.7 232.5 61.1 61.1 143.7 95.7 232.5 95.7 88.8 0 171.4-34.6 232.5-95.7 61.1-61.1 95.7-143.7 95.7-232.5 0-88.8-34.6-171.4-95.7-232.5C652.2 172.2 569.6 137.6 480.8 137.6zM480.8 32c248.4 0 448 199.6 448 448S729.2 928 480.8 928 32 728.4 32 480 231.6 32 480.8 32zM397.9 166.3c-54.5 54.5-84.6 127.9-84.6 205.5 0 77.6 30.1 151 84.6 205.5 54.5 54.5 127.9 84.6 205.5 84.6 77.6 0 151-30.1 205.5-84.6 54.5-54.5 84.6-127.9 84.6-205.5 0-77.6-30.1-151-84.6-205.5-54.5-54.5-127.9-84.6-205.5-84.6-77.6 0-151 30.1-205.5 84.6z" />
        </svg>
        <input v-model="searchQuery" class="search-input" :placeholder="t('shortcuts.searchPlaceholder')"
          @keydown.esc="searchQuery = ''" />
      </div>
      <button class="reset-all-btn" @click="handleResetAll">
        {{ t('shortcuts.resetAll') }}
      </button>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredGroups.length === 0" class="shortcuts-empty">
      <svg viewBox="0 0 1024 1024" fill="currentColor" class="empty-icon">
        <path d="M576 192v64H448v64h128v64H320v-64h128v-64H320v-64h256zM192 768V64h640v704H192z" />
      </svg>
      <p>{{ t('shortcuts.empty') }}</p>
    </div>

    <!-- 分组列表 -->
    <div v-else class="shortcuts-groups">
      <div v-for="group in filteredGroups" :key="group.pluginId" class="shortcut-group">
        <div class="group-header">
          {{ group.pluginId === 'lamp.app' ? t('commands.app.title') : (group.pluginId === 'builtin' ? t('shortcuts.builtin') : group.pluginId) }}
        </div>
        <div class="group-items">
          <div v-for="item in group.items" :key="item.id" class="shortcut-row" :class="{
            'is-recording': recordingId === item.id,
            'has-conflict': conflictId === item.id,
          }" @click="startRecording(item)">
            <div class="shortcut-info">
              <span class="shortcut-label">{{ resolveLabel(item.label) }}</span>
            </div>
            <div class="shortcut-control">
              <!-- 录制中 -->
              <template v-if="recordingId === item.id">
                <span class="recording-hint">{{ t('shortcuts.recording') }}</span>
                <button class="cancel-btn" @click.stop="cancelRecording">
                  <svg viewBox="0 0 1024 1024" fill="currentColor" width="14" height="14">
                    <path
                      d="M810.7 273.4L691.6 392.5l119.1 119.1-119.1 119.1L691.6 630.7l119.1-119.1L691.6 392.5l119.1-119.1z" />
                  </svg>
                </button>
              </template>
              <!-- 冲突提示 -->
              <template v-else-if="conflictId === item.id">
                <span class="conflict-hint">
                  <svg viewBox="0 0 1024 1024" fill="currentColor" width="12" height="12">
                    <path
                      d="M512 85.3L85.3 512l426.7 426.7L896 576 469.3 149.3 896 85.3 832 21.3 512 341.3 192 21.3z" />
                  </svg>
                  {{ t('shortcuts.conflict') }}
                </span>
                <button class="cancel-btn" @click.stop="conflictId = null">
                  <svg viewBox="0 0 1024 1024" fill="currentColor" width="14" height="14">
                    <path
                      d="M810.7 273.4L691.6 392.5l119.1 119.1-119.1 119.1L691.6 630.7l119.1-119.1L691.6 392.5l119.1-119.1z" />
                  </svg>
                </button>
              </template>
              <!-- 正常状态 -->
              <template v-else>
                <kbd class="shortcut-key">{{ item.effectiveAccelerator || '—' }}</kbd>
                <button class="reset-btn" :title="t('shortcuts.reset')" @click.stop="handleReset(item.id)">
                  <svg viewBox="0 0 1024 1024" fill="currentColor" width="12" height="12">
                    <path
                      d="M512 170.7c-188.2 0-341.3 153.2-341.3 341.3S323.8 853.3 512 853.3 853.3 700.2 853.3 512 700.2 170.7 512 170.7zM512 768c-141.4 0-256-114.6-256-256S370.6 256 512 256s256 114.6 256 256-114.6 256-256 256zM298.7 554.7L213.3 640l85.4 85.3 85.3-85.3L469.3 640 384 554.7l-85.3-85.3z" />
                  </svg>
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { pluginHost } from '@/plugins/index'

const { t } = useI18n()

/** Resolve a label that may be either an i18n key or a plain string */
function resolveLabel(label) {
  return label && String(label).includes('.') ? t(label) : label
}

const searchQuery = ref('')
const recordingId = ref(null)
const conflictId = ref(null)
const conflictName = ref('')
let recordingHandler = null

// Collect all commands with keybindings from ShortcutService (has label + keybinding)
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

// Group by pluginId
const grouped = computed(() => {
  const map = new Map()
  for (const s of allShortcuts.value) {
    if (!map.has(s.pluginId)) {
      map.set(s.pluginId, [])
    }
    map.get(s.pluginId).push(s)
  }
  return map
})

// Filter by search query
const filteredGroups = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q) {
    return [...grouped.value.entries()].map(([pluginId, items]) => ({ pluginId, items }))
  }
  const result = []
  for (const [pluginId, items] of grouped.value.entries()) {
    const filtered = items.filter(item =>
      (item.label || '').toLowerCase().includes(q) ||
      (item.effectiveAccelerator || '').toLowerCase().includes(q) ||
      (item.defaultAccelerator || '').toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q)
    )
    if (filtered.length > 0) {
      result.push({ pluginId, items: filtered })
    }
  }
  return result
})

function startRecording(item) {
  if (recordingId.value) return
  recordingId.value = item.id
  conflictId.value = null

  recordingHandler = (e) => {
    // Build accelerator string from event
    const parts = []
    if (e.ctrlKey && !e.metaKey) parts.push('Ctrl')
    if (e.metaKey) parts.push('Cmd')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')

    const key = e.key
    if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
      return // Wait for a real key
    }
    if (key === 'Escape') {
      cancelRecording()
      return
    }

    // Normalize key name
    let keyName = ''
    if (key.length === 1) {
      keyName = key.toUpperCase()
    } else if (key === ' ') {
      keyName = 'Space'
    } else if (key.startsWith('Arrow')) {
      keyName = key.replace('Arrow', '')
    } else if (key === 'Backspace') {
      keyName = 'Backspace'
    } else if (key === 'Delete') {
      keyName = 'Delete'
    } else if (key === 'Enter') {
      keyName = 'Enter'
    } else if (key === 'Tab') {
      keyName = 'Tab'
    } else {
      keyName = key.charAt(0).toUpperCase() + key.slice(1)
    }

    const acc = [...parts, keyName].join('+')
    if (!acc) return

    // Check conflict
    const conflictCmdId = pluginHost.shortcutService.checkConflict(acc, item.id)
    if (conflictCmdId) {
      const conflictingCmd = pluginHost.commandService.getAll().find(c => c.id === conflictCmdId)
      conflictId.value = item.id
      conflictName.value = conflictingCmd?.label || conflictCmdId
      return
    }

    // Save override
    pluginHost.shortcutService.setOverride(item.id, acc)
    recordingId.value = null
    window.removeEventListener('keydown', recordingHandler)
    recordingHandler = null
  }

  window.addEventListener('keydown', recordingHandler)
}

function cancelRecording() {
  recordingId.value = null
  if (recordingHandler) {
    window.removeEventListener('keydown', recordingHandler)
    recordingHandler = null
  }
}

function handleReset(id) {
  pluginHost.shortcutService.resetToDefault(id)
}

function handleResetAll() {
  pluginHost.shortcutService.resetAll()
}

onBeforeUnmount(() => {
  if (recordingHandler) {
    window.removeEventListener('keydown', recordingHandler)
  }
})
</script>

<style lang="scss" scoped>
.shortcut-settings {
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 100%;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--lamp-grey-15);
  margin-bottom: 16px;
}

.search-input-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  width: 14px;
  height: 14px;
  color: var(--lamp-color-neutral-grey);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 7px 10px 7px 32px;
  border: 1px solid var(--lamp-grey-15);
  border-radius: 6px;
  background: var(--lamp-grey-05);
  font-size: 13px;
  color: var(--lamp-color-neutral-dark);
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: var(--lamp-color-primary);
  }

  &::placeholder {
    color: var(--lamp-color-neutral-grey);
  }
}

.reset-all-btn {
  flex-shrink: 0;
  padding: 6px 12px;
  border: 1px solid var(--lamp-grey-15);
  border-radius: 6px;
  background: transparent;
  font-size: 12px;
  color: var(--lamp-color-neutral-grey);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;

  &:hover {
    background-color: var(--lamp-grey-08);
    color: var(--lamp-color-neutral-dark);
  }
}

.shortcuts-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
  color: var(--lamp-color-neutral-grey);
  font-size: 13px;

  .empty-icon {
    width: 32px;
    height: 32px;
    opacity: 0.4;
  }
}

.shortcuts-groups {
  overflow-y: auto;
  flex: 1;
}

.shortcut-group {
  margin-bottom: 20px;
}

.group-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--lamp-color-neutral-grey);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  padding: 0 2px;
}

.group-items {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--lamp-grey-15);
  border-radius: 8px;
  overflow: hidden;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  gap: 12px;
  border-bottom: 1px solid var(--lamp-grey-08);
  cursor: pointer;
  transition: background-color 0.12s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: var(--lamp-grey-05);
  }

  &.is-recording {
    background-color: rgba(64, 158, 255, 0.08);
    outline: 1px solid var(--lamp-color-primary);
  }

  &.has-conflict {
    background-color: rgba(245, 108, 108, 0.06);
    outline: 1px solid #f56c6c;
  }
}

.shortcut-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shortcut-label {
  font-size: 13px;
  color: var(--lamp-color-neutral-dark);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shortcut-control {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.shortcut-key {
  display: inline-block;
  padding: 3px 8px;
  border: 1px solid var(--lamp-grey-15);
  border-radius: 4px;
  background: var(--lamp-grey-05);
  font-size: 11px;
  font-family: inherit;
  color: var(--lamp-color-neutral-dark);
  white-space: nowrap;
  min-width: 60px;
  text-align: center;
  letter-spacing: 0.02em;
}

.recording-hint {
  font-size: 12px;
  color: var(--lamp-color-primary);
  animation: blink 1s ease-in-out infinite;
}

.conflict-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #f56c6c;
}

.cancel-btn,
.reset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: var(--lamp-color-neutral-grey);
  padding: 0;
  transition: background-color 0.12s, color 0.12s;

  &:hover {
    background-color: var(--lamp-grey-10);
    color: var(--lamp-color-neutral-dark);
  }
}

@keyframes blink {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }
}
</style>
