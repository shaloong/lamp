<template>
  <div class="toolbar-dropdown">
    <!-- 触发按钮：显示当前激活项的图标 + 下拉箭头 -->
    <button class="trigger" :class="{ 'is-active': hasActiveChild }" :disabled="isDisabled" :title="label"
      @click="toggle">
      <!-- 有激活子项时显示其图标；无激活时显示默认 label -->
      <svg v-if="activeChild?.icon" class="icon" aria-hidden="true">
        <use :xlink:href="activeChild.icon"></use>
      </svg>
      <span v-else class="btn-label">{{ label }}</span>
      <!-- 下拉箭头（CSS 三角） -->
      <span class="arrow-icon" aria-hidden="true"></span>
    </button>

    <!-- 下拉菜单 -->
    <div v-if="isOpen" class="dropdown-menu">
      <button v-for="child in children" :key="child.id" class="dropdown-item"
        :class="{ 'is-active': child.isActive ? child.isActive(editor) : false }" @click="selectChild(child)">
        <svg v-if="child.icon" class="icon" aria-hidden="true">
          <use :xlink:href="child.icon"></use>
        </svg>
        <span>{{ resolveLabel(child.label) }}</span>
        <span v-if="child.keybinding" class="keybinding">{{ child.keybinding }}</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import type { Editor } from '@tiptap/core';
import type { DropdownItem } from '../plugins/types';
import { i18n } from '../i18n';

export default {
  name: 'ToolbarDropdown',

  props: {
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
  },

  data() {
    return {
      isOpen: false,
    };
  },

  computed: {
    activeChild(): DropdownItem | null {
      if (!this.editor || !this.children) return null;
      return (
        this.children.find(c => c.isActive?.(this.editor as Editor)) ?? null
      );
    },
    hasActiveChild(): boolean {
      return this.activeChild !== null;
    },
  },

  mounted() {
    this._onDocClick = (e: MouseEvent) => {
      const el = this.$el as HTMLElement;
      if (!el.contains(e.target as Node)) {
        this.isOpen = false;
      }
    };
    document.addEventListener('mousedown', this._onDocClick);
  },

  beforeUnmount() {
    document.removeEventListener('mousedown', this._onDocClick);
  },

  methods: {
    toggle() {
      if (this.isDisabled) return;
      this.isOpen = !this.isOpen;
    },
    selectChild(child: DropdownItem) {
      if (!this.editor) return;
      try {
        child.action(this.editor);
      } catch (err) {
        console.error('[ToolbarDropdown] Child action error:', err);
      }
      this.isOpen = false;
    },
    /**
     * Resolve a label that may be either a plain string or an i18n key.
     */
    resolveLabel(label: string): string {
      return label && label.includes('.') ? i18n.global.t(label) : label;
    },
  },
};
</script>

<style lang="scss" scoped>
.toolbar-dropdown {
  position: relative;
  display: inline-flex;
  align-items: center;
  vertical-align: top;
  user-select: none;

  .trigger {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 5px 10px;
    color: #333;
    font-size: 14px;
    cursor: pointer;
    background: transparent;
    border: none;
    border-radius: 4px;

    .icon {
      width: 16px;
      height: 16px;
    }

    .arrow-icon {
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

    &:hover:not(:disabled) {
      background-color: var(--lamp-grey-10);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
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
    background-color: var(--lamp-color-neutral-light);
    border: 1px solid var(--lamp-grey-20);
    border-radius: 8px;
    box-shadow: 2px 4px 12px 2px var(--lamp-grey-15);

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      font-size: 13px;
      color: var(--lamp-color-neutral-dark);
      cursor: pointer;
      background: transparent;
      border: none;
      border-radius: 4px;
      text-align: left;

      .icon {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
      }

      .keybinding {
        margin-left: auto;
        font-size: 11px;
        opacity: 0.5;
        font-family: monospace;
      }

      &:hover {
        background-color: var(--lamp-grey-15);
      }

      &.is-active {
        color: var(--lamp-color-primary);
        background-color: var(--lamp-primary-10);
      }
    }
  }
}
</style>
