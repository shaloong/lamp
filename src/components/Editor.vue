<template>
  <div class="editor-area">
    <div class="toolbar-area" v-if="editor">
      <!-- 核心工具栏：通过插件系统渲染（lamp.core-toolbar） -->
      <template v-for="item in pluginHost.contributions.sortedEditorToolbar" :key="item.id">
        <!-- 下拉菜单类型 -->
        <ToolbarDropdown v-if="item.type === 'dropdown' && item.children" :label="resolveLabel(item.label)" :children="item.children"
          :editor="editor" :is-disabled="item.isDisabled ? item.isDisabled(editor) : false" />
        <!-- 普通按钮类型 -->
        <button v-else @click="invokeAction(item.pluginId, item.action)"
          :class="{ 'is-active': item.isActive ? item.isActive(editor) : false }"
          :disabled="item.isDisabled ? item.isDisabled(editor) : false"
          :title="resolveLabel(item.label) + (item.keybinding ? ' (' + item.keybinding + ')' : '')">
          <svg v-if="item.icon" class="icon" aria-hidden="true">
            <use :xlink:href="item.icon"></use>
          </svg>
          <span v-else class="btn-label">{{ resolveLabel(item.label) }}</span>
        </button>
      </template>
    </div>
    <!-- BubbleMenu (来自插件系统，通过 TipTap Vue 组件自动定位) -->
    <BubbleMenu v-if="editor && pluginHost.contributions.sortedBubbleMenu.length > 0" :editor="editor" :should-show="({ state }) => !state.selection.empty">
      <menu class="menu-select">
        <li v-for="item in pluginHost.contributions.sortedBubbleMenu" :key="item.id">
          <button class="button" @click="invokeAction(item.pluginId, item.action)">
            <svg v-if="item.icon" class="icon" aria-hidden="true">
              <use :xlink:href="item.icon"></use>
            </svg>
            <span class="label">{{ resolveLabel(item.label) }}</span>
          </button>
        </li>
      </menu>
    </BubbleMenu>
    <editor-content :editor="editor" class="content-area" />
    <div class="character-count" v-if="editor">
      {{ getCharacterCount() }} 个字符
    </div>
    <!-- AI Inline Suggestion Toolbar (rendered via Teleport) -->
    <AISuggestToolbar :editor="editor" />
    <!-- AI Loading / Error Overlay -->
    <Transition name="ai-loading">
      <div class="ai-loading-overlay" v-if="pluginHost.aiState.isLoading || pluginHost.aiState.error">
        <!-- Loading state -->
        <div class="ai-loading-card" v-if="pluginHost.aiState.isLoading">
          <div class="ai-loading-spinner">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                stroke-dasharray="31.4 31.4" stroke-dashoffset="0" />
            </svg>
          </div>
          <span class="ai-loading-label">{{ resolveLabel(pluginHost.aiState.actionLabel) }}</span>
          <span class="ai-loading-hint">请稍候...</span>
        </div>
        <!-- Error state -->
        <div class="ai-loading-card ai-error-card" v-else-if="pluginHost.aiState.error">
          <div class="ai-error-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
              <path d="M12 7v5M12 16.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </div>
          <span class="ai-error-title">AI 操作失败</span>
          <span class="ai-error-message">{{ pluginHost.aiState.error }}</span>
          <button class="ai-error-dismiss" @click="dismissAiError">知道了</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import StarterKit from '@tiptap/starter-kit'
import Typography from '@tiptap/extension-typography'
import Highlight from '@tiptap/extension-highlight'
import Focus from '@tiptap/extension-focus'
import { Editor, EditorContent } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import TextAlign from "@tiptap/extension-text-align"
import { pluginHost } from '../plugins/index'
import { i18n } from '../i18n'
import { AISuggestExtension } from '../builtins/ai-actions/ext/AISuggestExtension'
import ToolbarDropdown from './ToolbarDropdown.vue'
import AISuggestToolbar from './AISuggestToolbar.vue'

export default {
  components: {
    EditorContent,
    ToolbarDropdown,
    AISuggestToolbar,
    BubbleMenu,
  },

  props: {
    modelValue: {
      type: String,
      default: '',
    },
  },

  methods: {
    getCharacterCount() {
      const text = this.editor.getText();
      return text.length;
    },
    dismissAiError() {
      pluginHost.aiState.error = null;
    },
    /**
     * Resolve a label that may be either a plain string or an i18n key.
     * Keys containing a dot (e.g. "ai.polish", "editor.bold") are resolved via t();
     * plain strings are returned as-is.
     */
    resolveLabel(label) {
      return label && label.includes('.') ? i18n.global.t(label) : label;
    },
    // pluginHost.contributions 中的 action 以 editor 为参数
    invokeAction(pluginId, action) {
      if (!this.editor) return;
      try {
        const result = action(this.editor);
        if (result instanceof Promise) {
          result.catch(err => {
            pluginHost.aiState.error = err instanceof Error ? err.message : String(err);
          });
        }
      } catch (err) {
        pluginHost.aiState.error = err instanceof Error ? err.message : String(err);
      }
    },
  },

  emits: ['update:modelValue'],

  data() {
    return {
      editor: null,
      pluginHost,
    }
  },

  watch: {
    modelValue(value) {
      const isSame = this.editor.getHTML() === value
      if (isSame) return
      this.editor.commands.setContent(value, false)
    },
    // Bridge: pluginHost.aiState.suggestion → TipTap decoration
    'pluginHost.aiState.suggestion': {
      handler(s) {
        if (!this.editor) return;
        this.editor.commands.setAISuggestion(s);
      },
      deep: true,
    },
  },

  mounted() {
    this.editor = new Editor({
      editorProps: {
        attributes: {
          style: 'width:100%; height:calc(100% - 20px); outline:none;',
        },
      },
      extensions: [
        Focus.configure({
          className: 'has-focus',
          mode: 'all',
        }),
        StarterKit,
        Typography,
        Highlight,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
          defaultAlignment: 'left',
        }),
        AISuggestExtension,
      ],
      content: this.modelValue,
      autofocus: true,
      onUpdate: () => {
        this.$emit('update:modelValue', this.editor.getHTML())
      },
    })
    pluginHost.setEditorInstance(this.editor)
  },

  beforeUnmount() {
    pluginHost.setEditorInstance(null)
    this.editor.destroy()
  },
}
</script>

<style lang="scss">
.el-dropdown-link {
  .icon {
    color: var(--lamp-color-neutral-dark);
  }

  a {
    color: var(--lamp-color-neutral-dark);
    font-size: 12px;
    padding: 1px 0 0 0;

    &:hover {
      color: var(--lamp-color-neutral-dark);
    }
  }

  cursor: pointer;
  color: var(--lamp-color-neutral-dark);
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 8px;

  &:hover {
    background-color: var(--lamp-grey-20);
  }
}

.el-dropdown-menu {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  .el-dropdown-menu__item {
    display: flex;
    align-items: center;
    padding: 6px 10px;

    .icon {
      margin-right: 6px;
      color: var(--lamp-color-neutral-dark);
    }

    &:hover {
      background-color: var(--lamp-grey-20);
      color: var(--lamp-color-neutral-dark);
    }
  }
}

:focus-visible {
  outline: none;
}

.has-focus {
  color: var(--lamp-color-neutral-dark);
}

/* Basic editor styles */
.tiptap {
  >*+* {
    margin-top: 0.75em;
  }

  ul,
  ol {
    padding: 0 1rem;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    line-height: 1.1;
  }

  code {
    background-color: rgba(#616161, 0.1);
    color: #616161;
  }

  pre {
    background: #0D0D0D;
    color: #FFF;
    font-family: 'JetBrainsMono', monospace;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;

    code {
      color: inherit;
      padding: 0;
      background: none;
      font-size: 0.8rem;
    }
  }

  img {
    max-width: 100%;
    height: auto;
  }

  blockquote {
    padding-left: 1rem;
    border-left: 2px solid rgba(#0D0D0D, 0.1);
  }

  hr {
    border: none;
    border-top: 2px solid rgba(#0D0D0D, 0.1);
    margin: 2rem 0;
  }

  em {
    font-synthesis: style;
  }
}

div {
  .editor-area {
    display: grid;
    grid-template-rows: auto 1fr 20px;
    overflow: hidden;

    .toolbar-area {
      grid-row: 1;
      margin: 1px 0;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;

      >button {
        padding: 5px 10px 5px 10px;
        color: #333;
        font-size: 14px;
        cursor: pointer;

        &.is-active {
          background-color: var(--lamp-primary-20);
          color: var(--lamp-color-primary);
        }
      }
    }

    .content-area {
      grid-row: 2;
      overflow-x: hidden;
      overflow-y: scroll;
      padding: 0 0 0 15px;
      text-align: left;
      color: var(--lamp-grey-50);
    }

    /* 自定义滚动条样式 */
    .content-area::-webkit-scrollbar {
      width: 6px;
    }

    .content-area::-webkit-scrollbar-track {
      background-color: transparent;
    }

    .content-area::-webkit-scrollbar-thumb {
      background: var(--lamp-grey-40);
      border-radius: 6px;
    }

    .content-area::-webkit-scrollbar-thumb:hover {
      background: var(--lamp-color-neutral-grey);
    }
  }
}

.menu-select {
  display: flex;
  flex-direction: column;
  list-style: none;
  padding: 4px 6px;
  border-radius: 8px;
  box-shadow: 2px 4px 6px 2px var(--lamp-grey-15);
  background-color: var(--lamp-color-neutral-light);
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  gap: 4px;
  border: 1px solid var(--lamp-grey-20);

  .button {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    font-size: 14px;
    color: var(--lamp-color-neutral-dark);
    background-color: transparent;
    border: none;
    cursor: pointer;

    .icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      color: var(--lamp-color-neutral-dark);
    }

    .label {
      white-space: nowrap;
    }

    &:hover {
      background-color: var(--lamp-grey-20);
      color: var(--lamp-color-neutral-dark);
    }
  }
}

.character-count {
  grid-row: 3;
  padding-left: 12px;
  height: 20px;
  font-size: 12px;
  text-align: left;
  color: var(--lamp-color-neutral-grey);
  user-select: none;
}

/* ── AI Inline Ghost Text ────────────────────────────────────── */

.ai-suggest-inline {
  pointer-events: none !important;
  color: var(--lamp-color-primary) !important;
  font-style: italic !important;
  background: rgba(0, 110, 255, 0.08) !important;
  border-bottom: 2.5px dotted var(--lamp-color-primary) !important;
  border-radius: 2px !important;
  cursor: text !important;
  padding: 1px 2px !important;
}

/* ── AI To-Be-Replaced Original Text ──────────────────────────── */

.ai-suggest-replace {
  text-decoration: line-through !important;
  background: var(--el-color-danger-light-8) !important;
  color: var(--el-color-danger) !important;
  border-radius: 2px !important;
}

/* ── AI Loading Overlay ─────────────────────────────────────── */

.ai-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
}

.ai-loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px 40px;
  background: var(--lamp-color-neutral-light);
  border: 1px solid var(--lamp-grey-20);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  min-width: 140px;
}

.ai-loading-spinner {
  width: 36px;
  height: 36px;
  color: var(--lamp-color-primary);

  svg {
    width: 100%;
    height: 100%;
    animation: ai-spin 0.85s linear infinite;
  }
}

.ai-loading-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--lamp-color-neutral-dark);
  letter-spacing: 0.02em;
}

.ai-loading-hint {
  font-size: 12px;
  color: var(--lamp-color-neutral-grey);
}

/* ── AI Error Card ───────────────────────────────────────────── */

.ai-error-card {
  gap: 8px;
  border-color: rgba(239, 68, 68, 0.25);
}

.ai-error-icon {
  width: 36px;
  height: 36px;
  color: #ef4444;

  svg {
    width: 100%;
    height: 100%;
  }
}

.ai-error-title {
  font-size: 15px;
  font-weight: 600;
  color: #ef4444;
  margin-top: 2px;
}

.ai-error-message {
  font-size: 12px;
  color: var(--lamp-color-neutral-grey);
  text-align: center;
  max-width: 260px;
  line-height: 1.5;
  word-break: break-all;
}

.ai-error-dismiss {
  margin-top: 8px;
  padding: 6px 20px;
  font-size: 13px;
  font-weight: 500;
  color: var(--lamp-color-neutral-light);
  background: var(--lamp-color-neutral-grey);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--lamp-color-neutral-dark);
  }
}

@keyframes ai-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* Transition */
.ai-loading-enter-active,
.ai-loading-leave-active {
  transition: opacity 0.2s ease;
}

.ai-loading-enter-from,
.ai-loading-leave-to {
  opacity: 0;
}
</style>