<script setup>
import { ref, watch } from 'vue'
import { Editor } from '@tiptap/core'
import { useI18n } from 'vue-i18n'
import { pluginHost } from '../plugins/index'
import { useWorkspaceStore } from '../stores/workspace'
import { resolveI18nLabel } from '@/lib/resolveI18nLabel'
import { Folder, MousePointer2 } from 'lucide-vue-next'

const workspaceStore = useWorkspaceStore()
const { t } = useI18n()
const line = ref(1)
const column = ref(1)

// Track editor cursor position
let editorWatchOff: (() => void) | null = null
const offEditorReady = pluginHost.events.on('lamp.editor.ready', () => {
  editorWatchOff?.();
  // Poll editor selection for line/col — TipTap doesn't expose line numbers natively,
  // but we can track cursor position
})

function resolveContributionValue(value) {
  const raw = typeof value === 'function' ? value() : value
  return resolveI18nLabel(t, raw)
}

function invokeStatusAction(item) {
  if (!item.action) return
  const ctx = item.pluginId ? pluginHost.getContext(item.pluginId) : null
  if (ctx) item.action(ctx)
}
</script>

<template>
  <div class="status-bar">
    <div class="status-left">
      <span class="workspace-indicator">
        <Folder :size="12" class="status-icon" aria-hidden="true" />
        {{ workspaceStore.isOpen ? workspaceStore.name : '临时编辑器' }}
      </span>
    </div>
    <div class="status-right">
      <span class="status-item">
        <MousePointer2 :size="12" class="status-icon" aria-hidden="true" />
        Ln {{ line }}, Col {{ column }}
      </span>
      <span class="status-item">UTF-8</span>
      <template v-for="item in pluginHost.contributions.sortedStatusBarItems" :key="item.id">
        <span class="status-item plugin-status-item" :title="resolveContributionValue(item.tooltip)"
          @click="invokeStatusAction(item)">
          {{ resolveContributionValue(item.text) }}
        </span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 24px;
  padding: 0 12px;
  background-color: oklch(0.5462 0.2451 265.5 / 0.85);
  color: #fff;
  font-size: 11px;
  user-select: none;
  grid-column: 1 / -1;

  .status-left,
  .status-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .workspace-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 500;
    opacity: 0.9;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 3px;
    opacity: 0.85;
  }

  .plugin-status-item {
    cursor: pointer;
    opacity: 0.85;

    &:hover {
      opacity: 1;
      text-decoration: underline;
    }
  }

  .status-icon {
    width: 12px;
    height: 12px;
    stroke: currentColor;
    fill: none;
  }
}
</style>
