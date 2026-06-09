<template>
  <div ref="rootRef" class="toolbar-dropdown">
    <!-- 触发按钮：显示当前激活项的图标 + 下拉箭头 -->
    <button class="trigger" :class="{ 'is-active': hasActiveChild }" :disabled="isDisabled" :title="label"
      @click="toggle">
      <!-- 有激活子项时显示其图标；无激活时显示默认 label -->
      <component v-if="activeChild?.icon && lucideIconMap[activeChild.icon]" :is="lucideIconMap[activeChild.icon]"
        :size="16" class="icon" aria-hidden="true" />
      <span v-else class="btn-label">{{ label }}</span>
      <!-- 下拉箭头（CSS 三角） -->
      <span class="arrow-icon" aria-hidden="true"></span>
    </button>

    <!-- 下拉菜单 -->
    <div v-if="isOpen" class="dropdown-menu">
      <button v-for="child in children" :key="child.id" class="dropdown-item"
        :class="{ 'is-active': child.isActive ? child.isActive(editor) : false }" @click="selectChild(child)">
        <component v-if="child.icon && lucideIconMap[child.icon]" :is="lucideIconMap[child.icon]" :size="16"
          class="icon" aria-hidden="true" />
        <span>{{ resolveLabel(child.label) }}</span>
        <span v-if="child.keybinding" class="keybinding">{{ child.keybinding }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Editor } from '@tiptap/core';
import type { DropdownItem } from '../plugins/types';
import { lucideIconMap } from './editor/icons';
import { useI18n } from 'vue-i18n'
import { useClickOutside } from '@/composables/useClickOutside'
import { resolveI18nLabel } from '@/lib/resolveI18nLabel'

const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  children: {
    type: Array as () => DropdownItem[],
    required: true,
  },
  editor: {
    type: Object as () => Editor | null,
    default: null,
  },
  isDisabled: {
    type: Boolean,
    default: false,
  },
})

const { t } = useI18n()
const rootRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const activeChild = computed<DropdownItem | null>(() => {
  if (!props.editor || !props.children) return null
  return props.children.find(c => c.isActive?.(props.editor as Editor)) ?? null
})

const hasActiveChild = computed(() => activeChild.value !== null)

function toggle() {
  if (props.isDisabled) return
  isOpen.value = !isOpen.value
}

function selectChild(child: DropdownItem) {
  if (!props.editor) return
  try {
    child.action(props.editor)
  } catch (err) {
    console.error('[ToolbarDropdown] Child action error:', err)
  }
  isOpen.value = false
}

function resolveLabel(label: string): string {
  return resolveI18nLabel(t, label)
}

useClickOutside(rootRef, () => {
  isOpen.value = false
})
</script>

<style scoped>
.toolbar-dropdown {
  position: relative;
  display: inline-flex;
  align-items: center;
  vertical-align: top;
  user-select: none;
}

.trigger {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  color: var(--muted-foreground);
  font-size: 14px;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.trigger .icon {
  width: 16px;
  height: 16px;
}

.trigger .arrow-icon {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: 3px;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
  opacity: 0.5;
  flex-shrink: 0;
}

.trigger:hover:not(:disabled) {
  color: var(--accent-foreground);
  background-color: color-mix(in oklab, var(--foreground) 9%, transparent);
}

.trigger:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--ring) 55%, transparent);
  outline-offset: 1px;
}

.trigger.is-active {
  color: var(--foreground);
  background-color: color-mix(in oklab, var(--foreground) 14%, transparent);
}

.trigger:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  min-width: 160px;
  padding: 4px 6px;
  background-color: var(--popover);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 20px color-mix(in oklab, var(--foreground) 18%, transparent);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  font-size: 13px;
  color: var(--foreground);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
  text-align: left;
}

.dropdown-item .icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.dropdown-item .keybinding {
  margin-left: auto;
  font-size: 11px;
  opacity: 0.5;
  font-family: monospace;
}

.dropdown-item:hover {
  background-color: color-mix(in oklab, var(--foreground) 10%, transparent);
  color: var(--accent-foreground);
}

.dropdown-item.is-active {
  color: var(--foreground);
  background-color: color-mix(in oklab, var(--foreground) 14%, transparent);
}
</style>
