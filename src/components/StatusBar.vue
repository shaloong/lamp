<script setup>
import { ref } from 'vue'
import { pluginHost } from '../plugins/index'
import { useWorkspaceStore } from '../stores/workspace'

const workspaceStore = useWorkspaceStore()
const line = ref(1)
const column = ref(1)
</script>

<template>
  <div class="status-bar">
    <div class="status-left">
      <span class="workspace-indicator">
        <svg class="status-icon" aria-hidden="true">
          <use xlink:href="#icon-folder"></use>
        </svg>
        {{ workspaceStore.isOpen ? workspaceStore.name : '临时编辑器' }}
      </span>
    </div>
    <div class="status-right">
      <span class="status-item">
        <svg class="status-icon" aria-hidden="true">
          <use xlink:href="#icon-cursor"></use>
        </svg>
        Ln {{ line }}, Col {{ column }}
      </span>
      <span class="status-item">UTF-8</span>
      <template v-for="item in pluginHost.contributions.sortedStatusBarItems" :key="item.id">
        <span
          class="status-item plugin-status-item"
          :title="item.tooltip"
          @click="item.action && item.action({ editor: { getRawEditor: () => null } })"
        >
          {{ item.text }}
        </span>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 24px;
  padding: 0 12px;
  background-color: var(--lamp-primary-85);
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
    &:hover { opacity: 1; text-decoration: underline; }
  }

  .status-icon {
    width: 12px;
    height: 12px;
    fill: currentColor;
  }
}
</style>
