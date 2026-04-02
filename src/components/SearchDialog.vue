<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSearchStore } from '@/stores/search'
import { useWorkspaceStore } from '@/stores/workspace'
import { getLampAPI } from '@/lib/lampApi'
import { Search, Replace, ChevronDown, ChevronRight, FileText, X } from 'lucide-vue-next'

const { t } = useI18n()
const searchStore = useSearchStore()
const workspaceStore = useWorkspaceStore()

const emit = defineEmits(['update:modelValue', 'navigate', 'replace'])

const searchInputRef = ref(null)
const replaceInputRef = ref(null)
const panelRef = ref(null)
const showReplace = ref(true)
const panelPos = ref({ x: 0, y: 80 })
const isDragging = ref(false)
const dragState = ref({ pointerId: null, dx: 0, dy: 0 })

const query = ref('')
const replaceText = ref('')
const mode = ref('document')
const caseSensitive = ref(false)
const wholeWord = ref(false)
const expandedFiles = ref(new Set())

const workspaceResults = ref([])
const isSearching = ref(false)
const searchError = ref('')
const selectedMatchIndex = ref(-1)

const flatMatches = computed(() => {
  return workspaceResults.value.flatMap(file =>
    file.matches.map(m => ({ ...m, filePath: file.path, fileName: file.name }))
  )
})
const totalMatchCount = computed(() => flatMatches.value.length)
const hasResults = computed(() => workspaceResults.value.length > 0)
const documentMatchLabel = computed(() => {
  const total = Number(searchStore.documentTotalMatches) || 0
  const current = Number(searchStore.documentCurrentMatch) || 0
  if (!query.value) return ''
  return t('search.documentSummary', { current, total })
})
const headerStatusLabel = computed(() => {
  if (mode.value === 'document') return documentMatchLabel.value
  if (isSearching.value) return `${t('search.searching')}…`
  if (searchError.value) return searchError.value
  if (query.value && !hasResults.value) return t('search.noResults')
  if (!query.value) return ''
  return `${workspaceResults.value.length} ${t('search.files')}, ${totalMatchCount.value} ${t('search.matches')}`
})

// Sync from store
watch(() => searchStore.isOpen, (open) => {
  if (open) {
    query.value = searchStore.query
    replaceText.value = searchStore.replaceText
    mode.value = searchStore.mode
    caseSensitive.value = searchStore.options.caseSensitive
    wholeWord.value = searchStore.options.wholeWord
    selectedMatchIndex.value = -1
    workspaceResults.value = []
    searchError.value = ''
    panelPos.value = { x: Math.max((window.innerWidth - 460) / 2, 12), y: 80 }
    showReplace.value = searchStore.forceShowReplace || !!searchStore.replaceText
    nextTick(() => {
      searchInputRef.value?.focus()
      searchInputRef.value?.select()
    })
  }
}, { immediate: true })

watch(query, v => searchStore.setQuery(v))
watch(replaceText, v => searchStore.setReplaceText(v))
watch(query, (q) => {
  if (mode.value !== 'document') return
  emit('navigate', { type: 'document', query: q, direction: 'current' })
})
watch(mode, v => {
  searchStore.setMode(v)
  if (v === 'workspace') doWorkspaceSearch()
  if (v === 'document') {
    emit('navigate', { type: 'document', query: query.value, direction: 'current' })
  }
})
watch([caseSensitive, wholeWord], () => {
  searchStore.setOptions({
    caseSensitive: caseSensitive.value,
    wholeWord: wholeWord.value,
  })
  if (mode.value === 'document') {
    emit('navigate', { type: 'document', query: query.value, direction: 'current' })
  }
  if (mode.value === 'workspace' && query.value) doWorkspaceSearch()
})

let searchTimer = null
watch([query, mode], ([q, m]) => {
  if (m === 'workspace' && q.length > 0) {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => doWorkspaceSearch(), 300)
  }
})

watch(() => searchStore.refreshNonce, () => {
  if (mode.value === 'workspace' && query.value) {
    doWorkspaceSearch()
  }
})

async function doWorkspaceSearch() {
  if (!query.value) return
  if (!workspaceStore.isOpen) {
    searchError.value = t('search.noWorkspace')
    workspaceResults.value = []
    return
  }
  isSearching.value = true
  searchError.value = ''
  selectedMatchIndex.value = -1
  try {
    const api = getLampAPI()
    if (!api || typeof api.searchWorkspace !== 'function') {
      throw new Error(t('search.apiUnavailable'))
    }
    const results = await api.searchWorkspace(workspaceStore.rootPath, query.value, {
      caseSensitive: caseSensitive.value,
      wholeWord: wholeWord.value,
      maxResults: 500,
    })
    workspaceResults.value = results || []
    if (results && results.length > 0) {
      expandedFiles.value.add(results[0].path)
    }
  } catch (err) {
    // Gracefully handle — don't crash the dialog
    searchError.value = t('search.searchFailed')
    workspaceResults.value = []
  } finally {
    isSearching.value = false
  }
}

function emitNavigate() {
  if (query.value) emit('navigate', { type: 'document', query: query.value, direction: 'next' })
}

function navigateToMatch(match) {
  emit('navigate', {
    type: 'workspace',
    filePath: match.filePath,
    lineNumber: match.lineNumber,
    query: query.value,
  })
}

function emitReplace(opts = {}) {
  if (!replaceText.value) return
  if (mode.value === 'workspace') {
    const match = flatMatches.value[selectedMatchIndex.value]
    if (!match && !opts.all) return
    emit('replace', {
      type: 'workspace',
      filePath: match?.filePath,
      oldText: query.value,
      newText: replaceText.value,
      ...opts,
    })
  } else {
    emit('replace', {
      type: 'document',
      oldText: query.value,
      newText: replaceText.value,
      ...opts,
    })
  }
}

function toggleFile(path) {
  const s = new Set(expandedFiles.value)
  if (s.has(path)) s.delete(path)
  else s.add(path)
  expandedFiles.value = s
}

function close() {
  stopDragging()
  searchStore.close()
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function highlightLine(line, matchStart, matchEnd) {
  if (matchStart == null) return escapeHtml(line)
  return escapeHtml(line.slice(0, matchStart))
    + '<mark>' + escapeHtml(line.slice(matchStart, matchEnd)) + '</mark>'
    + escapeHtml(line.slice(matchEnd))
}

function navigateNext() {
  if (mode.value === 'workspace') {
    if (flatMatches.value.length === 0) return
    selectedMatchIndex.value = (selectedMatchIndex.value + 1) % flatMatches.value.length
    navigateToMatch(flatMatches.value[selectedMatchIndex.value])
    return
  }
  if (!query.value) return
  emit('navigate', { type: 'document', query: query.value, direction: 'next' })
}

function navigatePrev() {
  if (mode.value === 'workspace') {
    if (flatMatches.value.length === 0) return
    selectedMatchIndex.value = selectedMatchIndex.value <= 0
      ? flatMatches.value.length - 1
      : selectedMatchIndex.value - 1
    navigateToMatch(flatMatches.value[selectedMatchIndex.value])
    return
  }
  emit('navigate', { type: 'document', query: query.value, direction: 'prev' })
}

function isSelected(filePath, m) {
  const idx = flatMatches.value.findIndex(
    fm => fm.filePath === filePath && fm.lineNumber === m.lineNumber && fm.matchStart === m.matchStart
  )
  return idx === selectedMatchIndex.value
}

function handleKeydown(e) {
  if (e.key === 'Escape') { close(); e.preventDefault(); return }
  if (e.key === 'F3') {
    if (mode.value === 'workspace') {
      if (e.key === 'F3' && e.shiftKey) navigatePrev()
      else navigateNext()
    } else {
      if (e.shiftKey) navigatePrev()
      else emitNavigate()
    }
    e.preventDefault()
    return
  }
  if (e.key === 'Enter' && e.shiftKey) {
    navigatePrev()
    e.preventDefault()
    return
  }
  if (e.key === 'Enter') {
    navigateNext()
    e.preventDefault()
    return
  }
  // Tab from search to replace
  if (e.key === 'Tab' && !e.shiftKey && document.activeElement === searchInputRef.value) {
    e.preventDefault()
    replaceInputRef.value?.focus()
    replaceInputRef.value?.select()
  }
}

function isInteractiveTarget(target) {
  if (!(target instanceof Element)) return false
  return !!target.closest('input, button, label, textarea, select, a, [role="button"], [data-no-drag="true"]')
}

function onPanelPointerDown(event) {
  if (event.button !== 0) return
  if (isInteractiveTarget(event.target)) return
  if (!panelRef.value) return
  const rect = panelRef.value.getBoundingClientRect()
  isDragging.value = true
  dragState.value = {
    pointerId: event.pointerId,
    dx: event.clientX - rect.left,
    dy: event.clientY - rect.top,
  }
  panelRef.value.setPointerCapture?.(event.pointerId)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(event) {
  if (!isDragging.value) return
  const width = panelRef.value?.offsetWidth || 580
  const maxX = Math.max(window.innerWidth - width - 12, 12)
  const x = Math.min(Math.max(event.clientX - dragState.value.dx, 12), maxX)
  const y = Math.max(event.clientY - dragState.value.dy, 12)
  panelPos.value = { x, y }
}

function onPointerUp() {
  stopDragging()
}

function stopDragging() {
  if (!isDragging.value) return
  isDragging.value = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

const resultsTop = computed(() => {
  const _expanded = showReplace.value
  void _expanded
  const panelHeight = panelRef.value?.offsetHeight || 120
  return panelPos.value.y + panelHeight + 4
})

onBeforeUnmount(() => {
  stopDragging()
  clearTimeout(searchTimer)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="searchStore.isOpen"
      class="search-overlay"
      @click.self="close"
      @keydown.capture="handleKeydown"
    >
      <!-- Search Bar -->
      <div
        ref="panelRef"
        class="search-bar"
        :style="{ left: `${panelPos.x}px`, top: `${panelPos.y}px` }"
        @pointerdown="onPanelPointerDown"
      >
        <div class="mode-row">
          <div class="mode-tabs">
            <button
              class="tab"
              :class="{ active: mode === 'document' }"
              data-no-drag="true"
              @click="mode = 'document'"
            >{{ t('search.document') }}</button>
            <button
              class="tab"
              :class="{ active: mode === 'workspace' }"
              data-no-drag="true"
              @click="mode = 'workspace'"
              :disabled="!workspaceStore.isOpen"
            >{{ t('search.workspace') }}</button>
          </div>
          <span class="match-count">{{ headerStatusLabel }}</span>
        </div>

        <div class="row search-row">
          <button
            class="icon-btn"
            :title="showReplace ? t('search.hideReplace') : t('search.showReplace')"
            data-no-drag="true"
            @click="showReplace = !showReplace"
          >
            <component :is="showReplace ? ChevronDown : ChevronRight" :size="13" />
          </button>
          <Search :size="14" class="row-icon" />
          <input
            ref="searchInputRef"
            v-model="query"
            class="row-input"
            :placeholder="t('search.placeholder')"
            autocomplete="off"
            spellcheck="false"
          />
          <button
            class="icon-btn"
            :class="{ active: caseSensitive }"
            :title="t('search.caseSensitive')"
            data-no-drag="true"
            @click="caseSensitive = !caseSensitive"
          >Aa</button>
          <button
            class="icon-btn"
            :class="{ active: wholeWord }"
            :title="t('search.wholeWord')"
            data-no-drag="true"
            @click="wholeWord = !wholeWord"
          >W</button>
          <button
            class="icon-btn"
            :title="t('search.previous')"
            data-no-drag="true"
            @click="navigatePrev"
          >
            <ChevronDown :size="13" style="transform: scaleY(-1)" />
          </button>
          <button
            class="icon-btn"
            :title="t('search.next')"
            data-no-drag="true"
            @click="navigateNext"
          >
            <ChevronDown :size="13" />
          </button>
          <button class="row-close" @click="close" :title="t('common.close')">
            <X :size="14" />
          </button>
        </div>

        <div v-if="showReplace" class="row replace-row">
          <Replace :size="14" class="row-icon" />
          <input
            ref="replaceInputRef"
            v-model="replaceText"
            class="row-input"
            :placeholder="t('search.replacePlaceholder')"
            autocomplete="off"
            spellcheck="false"
          />
          <button
            class="action-btn"
            @click="emitReplace({ all: false })"
            :disabled="!replaceText || (mode === 'workspace' && selectedMatchIndex < 0)"
            :title="t('search.replace')"
          >{{ t('search.replace') }}</button>
          <button
            class="action-btn action-btn-primary"
            @click="emitReplace({ all: true })"
            :disabled="!replaceText || (mode === 'workspace' && !hasResults)"
            :title="t('search.replaceAll')"
          >{{ t('search.replaceAll') }}</button>
        </div>

      </div>

      <!-- Results panel -->
      <div
        v-if="mode === 'workspace' && hasResults"
        class="results-panel"
        :style="{ left: `${panelPos.x}px`, top: `${resultsTop}px` }"
      >
        <div
          v-for="file in workspaceResults"
          :key="file.path"
          class="result-group"
        >
          <!-- File header -->
          <button class="file-header" @click="toggleFile(file.path)">
            <component :is="expandedFiles.has(file.path) ? ChevronDown : ChevronRight" :size="12" class="chevron" />
            <FileText :size="13" class="file-icon" />
            <span class="file-name">{{ file.name }}</span>
            <span class="file-path" :title="file.path">{{ file.path }}</span>
            <span class="file-count">{{ file.matches.length }}</span>
          </button>

          <!-- Matches -->
          <div v-if="expandedFiles.has(file.path)" class="match-list">
            <button
              v-for="(match, i) in file.matches"
              :key="i"
              class="match-item"
              :class="{ selected: isSelected(file.path, match) }"
              @click="navigateToMatch({ ...match, filePath: file.path, fileName: file.name })"
            >
              <span class="line-num">{{ match.lineNumber }}</span>
              <span class="line-text" v-html="highlightLine(match.line, match.matchStart, match.matchEnd)" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
}

.search-bar {
  width: 460px;
  position: fixed;
  background: var(--popover);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 6px 20px color-mix(in oklab, var(--foreground) 14%, transparent);
  overflow: hidden;
  pointer-events: all;
  display: flex;
  flex-direction: column;
  user-select: none;
}

.search-bar :is(input, textarea, [contenteditable="true"]) {
  user-select: text;
}

.row {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  border-bottom: 1px solid var(--border);
  min-height: 34px;
}

.row:last-child {
  border-bottom: none;
}

.search-row {
  cursor: move;
}

.replace-row {
  cursor: move;
}

.mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--border);
  cursor: move;
}

.row-icon {
  color: var(--muted-foreground);
  flex-shrink: 0;
}

.row-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--foreground);
  font-size: 13px;
  outline: none;
  padding: 6px 0;
  min-width: 0;
}

.row-input::placeholder {
  color: var(--muted-foreground);
}

.match-count {
  font-size: 11px;
  color: var(--muted-foreground);
  flex-shrink: 0;
  font-weight: 400;
}

.row-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.1s, color 0.1s;
}

.row-close:hover {
  background: oklch(0 0 0 / 0.08);
  color: var(--foreground);
}

.icon-btn {
  width: 22px;
  height: 22px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--muted-foreground);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
}

.icon-btn:hover {
  background: oklch(0 0 0 / 0.08);
  color: var(--foreground);
}

.icon-btn.active {
  border-color: var(--border);
  background: oklch(0 0 0 / 0.08);
  color: var(--foreground);
}

.action-btn {
  padding: 3px 8px;
  font-size: 11px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.1s;
}

.action-btn:hover:not(:disabled) {
  background: oklch(0 0 0 / 0.08);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn-primary {
  background: var(--primary);
  color: var(--primary-foreground);
  border-color: var(--primary);
}

.action-btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.mode-tabs {
  display: flex;
  background: oklch(0 0 0 / 0.05);
  border-radius: 5px;
  padding: 2px;
  gap: 2px;
  flex-shrink: 0;
}

.tab {
  padding: 2px 7px;
  font-size: 11px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.tab.active {
  background: var(--background);
  color: var(--foreground);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.status-bar {
  padding: 2px 10px;
  min-height: 22px;
  display: flex;
  align-items: center;
  cursor: move;
}

.status {
  font-size: 10px;
  color: var(--muted-foreground);
}

.status.searching { color: var(--primary); }
.status.error { color: oklch(0.55 0.22 27); }
.status.empty { color: var(--muted-foreground); }

.status.hint {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Results panel */
.results-panel {
  width: 460px;
  max-height: 320px;
  position: fixed;
  margin-top: 0;
  background: var(--popover);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 6px 20px color-mix(in oklab, var(--foreground) 14%, transparent);
  overflow-y: auto;
  pointer-events: all;
}

.result-group {
  border-bottom: 1px solid var(--border);
}

.result-group:last-child {
  border-bottom: none;
}

.file-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: oklch(0 0 0 / 0.02);
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 12px;
  color: var(--foreground);
  transition: background 0.1s;
}

.file-header:hover {
  background: oklch(0 0 0 / 0.05);
}

.chevron {
  color: var(--muted-foreground);
  flex-shrink: 0;
}

.file-icon {
  color: var(--muted-foreground);
  flex-shrink: 0;
}

.file-name {
  font-weight: 500;
  flex-shrink: 0;
}

.file-path {
  flex: 1;
  color: var(--muted-foreground);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-count {
  font-size: 11px;
  color: var(--primary);
  background: oklch(0.5788 0.232 259.64 / 0.10);
  padding: 1px 6px;
  border-radius: 8px;
  flex-shrink: 0;
}

.match-list {
  padding: 2px 0;
}

.match-item {
  width: 100%;
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 4px 14px 4px 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-size: 12px;
  font-family: 'SF Mono', Menlo, monospace;
  line-height: 1.6;
  color: var(--foreground);
  transition: background 0.08s;
}

.match-item:hover {
  background: oklch(0 0 0 / 0.04);
}

.match-item.selected {
  background: oklch(0.5788 0.232 259.64 / 0.10);
}

.line-num {
  color: var(--muted-foreground);
  min-width: 30px;
  text-align: right;
  flex-shrink: 0;
  user-select: none;
  font-size: 11px;
}

.line-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.line-text :deep(mark) {
  background: oklch(0.85 0.19 85 / 0.45);
  color: var(--foreground);
  border-radius: 2px;
  padding: 0 1px;
}
</style>
