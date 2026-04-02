<template>
  <div class="editor-area h-full">
    <div class="editor-body h-full">
      <EditorToolbar :editor="editor" :resolve-label="resolveLabel" :invoke-action="invokeAction" />
      <EditorBubbleMenu :editor="editor" :resolve-label="resolveLabel" :invoke-action="invokeAction" />
      <editor-content :editor="editor" :class="editorContentClass" />
      <div class="character-count" v-if="editor">
        {{ getCharacterCount() }} 个字符
      </div>
    </div>
    <AISuggestToolbar :editor="editor" />
    <EditorAiDialog :resolve-label="resolveLabel" />
  </div>
</template>

<script>
import StarterKit from '@tiptap/starter-kit'
import Typography from '@tiptap/extension-typography'
import Highlight from '@tiptap/extension-highlight'
import Focus from '@tiptap/extension-focus'
import { Editor, EditorContent } from '@tiptap/vue-3'
import TextAlign from "@tiptap/extension-text-align"
import { pluginHost } from '../plugins/index'
import { i18n } from '../i18n'
import { resolveI18nLabel } from '@/lib/resolveI18nLabel'
import { useSettingsStore } from '@/stores/settings'
import AISuggestToolbar from './AISuggestToolbar.vue'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import EditorBubbleMenu from '@/components/editor/EditorBubbleMenu.vue'
import EditorAiDialog from '@/components/editor/EditorAiDialog.vue'

export default {
  components: {
    EditorContent,
    EditorToolbar,
    EditorBubbleMenu,
    EditorAiDialog,
    AISuggestToolbar,
  },

  props: {
    modelValue: {
      type: String,
      default: '',
    },
  },

  methods: {
    initEditor() {
      if (this.editor) {
        this.editor.destroy();
        this.editor = null;
      }

      // Plugin extensions may be either Extension.create(...) instances or constructors.
      const pluginExtensions = pluginHost.contributions.sortedTipTapExtensions
        .map((def) => {
          const ext = def.ExtensionClass
          if (typeof ext === "function") {
            return new ext()
          }
          return ext
        })
        .filter(Boolean)

      const extensions = [
        Focus.configure({
          className: "has-focus",
          mode: "all",
        }),
        StarterKit,
        Typography,
        Highlight,
        TextAlign.configure({
          types: ["heading", "paragraph"],
          defaultAlignment: "left",
        }),
        ...pluginExtensions,
      ]

      this.editor = new Editor({
        editorProps: {
          attributes: {
            style: "width:100%; height:100%; outline:none;",
          },
        },
        extensions,
        content: this.modelValue,
        autofocus: true,
        onUpdate: () => {
          this.$emit("update:modelValue", this.editor.getHTML())
        },
      })
      pluginHost.setEditorInstance(this.editor)
    },

    getCharacterCount() {
      const text = this.editor.getText();
      return text.length;
    },
    /**
     * Resolve a label that may be either a plain string or an i18n key.
     * Keys containing a dot (e.g. "ai.polish", "editor.bold") are resolved via t();
     * plain strings are returned as-is.
     */
    resolveLabel(label) {
      return resolveI18nLabel(i18n.global.t, label);
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

  computed: {
    editorContentClass() {
      return useSettingsStore().focusMode ? 'content-area focus-mode' : 'content-area'
    },
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
    this.initEditor();
  },

  beforeUnmount() {
    pluginHost.setEditorInstance(null)
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
  },
}
</script>

<style>
:focus-visible {
  outline: none;
}

.has-focus {
  color: var(--foreground);
}

/* Basic editor styles */
.tiptap>*+* {
  margin-top: 0.75em;
}

.tiptap ul,
.tiptap ol {
  padding: 0 1rem;
}

.tiptap h1,
.tiptap h2,
.tiptap h3,
.tiptap h4,
.tiptap h5,
.tiptap h6 {
  line-height: 1.1;
}

.tiptap code {
  background-color: rgba(97, 97, 97, 0.1);
  color: #616161;
}

.tiptap pre {
  background: #0D0D0D;
  color: #FFF;
  font-family: 'JetBrainsMono', monospace;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
}

.tiptap pre code {
  color: inherit;
  padding: 0;
  background: none;
  font-size: 0.8rem;
}

.tiptap img {
  max-width: 100%;
  height: auto;
}

.tiptap blockquote {
  padding-left: 1rem;
  border-left: 2px solid rgba(13, 13, 13, 0.1);
}

.tiptap hr {
  border: none;
  border-top: 2px solid rgba(13, 13, 13, 0.1);
  margin: 2rem 0;
}

.tiptap em {
  font-synthesis: style;
}

.toolbar-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-shrink: 0;
  margin: 1px 0;
  padding: 0 2px;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.toolbar-area>button {
  padding: 4px 8px;
  color: var(--muted-foreground);
  font-size: 14px;
  cursor: pointer;
  border: none;
  border-radius: 4px;
  background: transparent;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.toolbar-area>button:hover:not(:disabled) {
  color: var(--accent-foreground);
  background-color: color-mix(in oklab, var(--foreground) 9%, transparent);
}

.toolbar-area>button:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--ring) 55%, transparent);
  outline-offset: 1px;
}

.toolbar-area>button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.toolbar-area>button.is-active {
  background-color: color-mix(in oklab, var(--foreground) 14%, transparent);
  color: var(--foreground);
}

.content-area {
  height: calc(100% - 55px);
  flex-grow: 1;
  overflow-y: scroll;
  min-height: 0;
  padding: 0 0 0 15px;
  box-sizing: border-box;
  color: var(--foreground);
}

.focus-mode {
  color: var(--muted-foreground);
}

.character-count {
  background-color: var(--muted);
  position: absolute;
  bottom: 0;
  height: 29px;
  width: 100%;
  font-size: 12px;
  text-align: left;
  color: var(--muted-foreground);
  padding: 4px 12px 4px 12px;
  user-select: none;
  box-sizing: border-box;
  border-top: 1px solid var(--border);
}

/* Scrollbar */
.content-area::-webkit-scrollbar {
  width: 6px;
}

.content-area::-webkit-scrollbar-track {
  background-color: transparent;
}

.content-area::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 6px;
}

.content-area::-webkit-scrollbar-thumb:hover {
  background: var(--muted-foreground);
}

/* Bubble menu */
.menu-select {
  display: flex;
  flex-direction: column;
  list-style: none;
  padding: 4px 6px;
  border-radius: 8px;
  background-color: var(--popover);
  border: 1px solid var(--border);
  box-shadow: 0 8px 20px color-mix(in oklab, var(--foreground) 18%, transparent);
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  gap: 6px;
}

.menu-select .button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  font-size: 13px;
  color: var(--foreground);
  background-color: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.menu-select .button .icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--foreground);
}

.menu-select .button .label {
  white-space: nowrap;
}

.menu-select .button:hover {
  background-color: color-mix(in oklab, var(--foreground) 10%, transparent);
  color: var(--accent-foreground);
}

/* ── AI Inline Ghost Text ────────────────────────────────────── */

.ai-suggest-inline {
  pointer-events: none !important;
  color: var(--primary) !important;
  font-style: italic !important;
  background: rgba(0, 110, 255, 0.08) !important;
  border-bottom: 2.5px dotted var(--primary) !important;
  border-radius: 2px !important;
  cursor: text !important;
  padding: 1px 2px !important;
}

/* ── AI To-Be-Replaced Original Text ──────────────────────────── */

.ai-suggest-replace {
  text-decoration: line-through !important;
  background: oklch(0.577 0.245 27.325 / 0.08) !important;
  color: var(--destructive) !important;
  border-radius: 2px !important;
}

/* Transition */
.ai-loading-enter-active,
.ai-loading-leave-active {
  transition: opacity 0.15s ease;
}

.ai-loading-enter-from,
.ai-loading-leave-to {
  opacity: 0;
}
</style>