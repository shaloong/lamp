<template>
  <div class="editor-area">
    <div class="toolbar-area" v-if="editor">
      <!-- 核心工具栏：通过插件系统渲染（lamp.core-toolbar） -->
      <template v-for="item in pluginHost.contributions.sortedEditorToolbar" :key="item.id">
        <!-- 下拉菜单类型 -->
        <ToolbarDropdown
          v-if="item.type === 'dropdown' && item.children"
          :label="item.label"
          :children="item.children"
          :editor="editor"
          :is-disabled="item.isDisabled ? item.isDisabled(editor) : false"
        />
        <!-- 普通按钮类型 -->
        <button
          v-else
          @click="invokeAction(item.pluginId, item.action)"
          :class="{ 'is-active': item.isActive ? item.isActive(editor) : false }"
          :disabled="item.isDisabled ? item.isDisabled(editor) : false"
          :title="item.label + (item.keybinding ? ' (' + item.keybinding + ')' : '')"
        >
          <svg v-if="item.icon" class="icon" aria-hidden="true">
            <use :xlink:href="item.icon"></use>
          </svg>
          <span v-else class="btn-label">{{ item.label }}</span>
        </button>
      </template>
    </div>
    <!-- 气泡菜单（来自插件系统，无内容时不显示） -->
    <menu class="menu-select" v-if="pluginHost.contributions.sortedBubbleMenu.length > 0">
      <li v-for="item in pluginHost.contributions.sortedBubbleMenu" :key="item.id">
        <button @click="invokeAction(item.pluginId, item.action)">{{ item.label }}</button>
      </li>
    </menu>
    <editor-content :editor="editor" class="content-area" />
    <div class="character-count" v-if="editor">
      {{ getCharacterCount() }} 个字符
    </div>
    <!-- AI Suggestion Preview Overlay -->
    <Transition name="ai-loading">
      <div class="ai-loading-overlay" v-if="pluginHost.aiState.suggestion">
        <div class="ai-loading-card ai-suggestion-card">
          <div class="ai-suggestion-header">
            <svg class="ai-suggestion-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
            <span class="ai-suggestion-title">{{ pluginHost.aiState.suggestion?.actionLabel }}结果</span>
          </div>
          <div class="ai-suggestion-preview">
            {{ pluginHost.aiState.suggestion?.content }}
          </div>
          <div class="ai-suggestion-actions">
            <button class="ai-suggestion-reject" @click="dismissSuggestion">放弃</button>
            <button class="ai-suggestion-accept" @click="acceptSuggestion">应用</button>
          </div>
        </div>
      </div>
    </Transition>
    <!-- AI Loading / Error Overlay -->
    <Transition name="ai-loading">
      <div class="ai-loading-overlay" v-if="pluginHost.aiState.isLoading || pluginHost.aiState.error">
        <!-- Loading state -->
        <div class="ai-loading-card" v-if="pluginHost.aiState.isLoading">
          <div class="ai-loading-spinner">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="31.4 31.4" stroke-dashoffset="0"/>
            </svg>
          </div>
          <span class="ai-loading-label">{{ pluginHost.aiState.actionLabel }}</span>
          <span class="ai-loading-hint">请稍候...</span>
        </div>
        <!-- Error state -->
        <div class="ai-loading-card ai-error-card" v-else-if="pluginHost.aiState.error">
          <div class="ai-error-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 7v5M12 16.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
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
import BubbleMenu from "@tiptap/extension-bubble-menu"
import TextAlign from "@tiptap/extension-text-align"
import { pluginHost } from '../plugins/index'
import ToolbarDropdown from './ToolbarDropdown.vue'

export default {
  components: {
    EditorContent,
    ToolbarDropdown,
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
    /** Apply the current AI suggestion to the editor */
    acceptSuggestion() {
      const suggestion = pluginHost.aiState.suggestion;
      if (!suggestion || !this.editor) {
        pluginHost.aiState.suggestion = null;
        return;
      }
      const { content, insertMode, from, to } = suggestion;
      if (insertMode === 'replace') {
        this.editor
          .chain()
          .focus()
          .deleteRange({ from, to })
          .insertContentAt(from, content)
          .setTextSelection(from + content.length)
          .run();
      } else {
        // append — insert at the end of the original selection, no deletion
        this.editor
          .chain()
          .focus()
          .insertContentAt(to, content)
          .setTextSelection(to + content.length)
          .run();
      }
      pluginHost.aiState.suggestion = null;
    },
    /** Discard the current AI suggestion without applying */
    dismissSuggestion() {
      pluginHost.aiState.suggestion = null;
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
      // HTML
      const isSame = this.editor.getHTML() === value

      // JSON
      // const isSame = JSON.stringify(this.editor.getJSON()) === JSON.stringify(value)

      if (isSame) {
        return
      }

      this.editor.commands.setContent(value, false)
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
        BubbleMenu.configure({
          pluginKey: 'selectMenu',
          element: document.querySelector('.menu-select'),
          shouldShow: ({ editor, view, state, oldState, from, to }) => {
            // 只有当有选中内容时才显示菜单
            return from !== to;
          },
        }),
        // BubbleMenu.configure({
        //   pluginKey: 'slashMenu',
        //   element: document.querySelector('.menu-slash'),
        //   shouldShow: ({ editor, view, state, oldState, from, to }) => {
        //     const { doc, selection } = state;
        //     const { $cursor } = selection;
        //
        //     // Check if the selection is a cursor and the text at the cursor position is a slash
        //     if ($cursor) {
        //       const posBeforeCursor = $cursor.pos - 1;
        //       const charBeforeCursor = doc.textBetween(posBeforeCursor, posBeforeCursor + 1);
        //       if (charBeforeCursor === '/') {
        //         // If there is no old state or the old state is undefined
        //         if (!oldState) {
        //           return true; // Show the menu
        //         }
        //
        //         // If the document has changed since the last update
        //         if (!oldState.doc.eq(doc)) {
        //           // Check if a new slash has been inserted
        //           const oldCharBeforeCursor = oldState.doc.textBetween(posBeforeCursor, posBeforeCursor + 1);
        //           if (charBeforeCursor !== oldCharBeforeCursor) {
        //             return true; // Show the menu
        //           }
        //         }
        //       }
        //     }
        //
        //     return false; // Hide the menu
        //   },
        // }),
      ],
      content: this.modelValue,
      autofocus: true,
      onUpdate: () => {
        // HTML
        this.$emit('update:modelValue', this.editor.getHTML())

        // JSON
        // this.$emit('update:modelValue', this.editor.getJSON())
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

menu {
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
}

.menu-select {
  position: absolute;
  z-index: 1000;
  border: 1px solid var(--lamp-grey-20);

  .button {
    padding: 4px 8px;
    font-size: 8px !important;
    color: var(--lamp-color-neutral-dark);
    background-color: transparent;
    border: none;
    cursor: pointer;

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

/* ── AI Suggestion Card ──────────────────────────────────────── */

.ai-suggestion-card {
  width: 480px;
  max-width: calc(100vw - 48px);
  gap: 12px;
  align-items: stretch;
  padding: 20px 24px;
  border-color: rgba(0, 110, 255, 0.2);
}

.ai-suggestion-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-suggestion-icon {
  width: 18px;
  height: 18px;
  color: var(--lamp-color-primary);
  flex-shrink: 0;
}

.ai-suggestion-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--lamp-color-primary);
  letter-spacing: 0.02em;
}

.ai-suggestion-preview {
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--lamp-color-neutral-dark);
  background: rgba(0, 110, 255, 0.04);
  border: 1px solid rgba(0, 110, 255, 0.1);
  border-radius: 8px;
  padding: 12px 14px;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;

  /* Custom scrollbar */
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: var(--lamp-grey-40); border-radius: 4px; }
}

.ai-suggestion-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
}

.ai-suggestion-reject,
.ai-suggestion-accept {
  padding: 7px 20px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease, opacity 0.15s ease;
}

.ai-suggestion-reject {
  color: var(--lamp-color-neutral-dark);
  background: var(--lamp-grey-15);

  &:hover {
    background: var(--lamp-grey-20);
  }
}

.ai-suggestion-accept {
  color: var(--lamp-color-neutral-light);
  background: var(--lamp-color-primary);

  &:hover {
    background: var(--lamp-btn-primary-hover);
  }
}

@keyframes ai-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
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