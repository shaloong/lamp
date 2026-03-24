<script setup>
import { ArrowDown } from '@element-plus/icons-vue'
</script>

<template>
  <div class="editor-area">
    <div class="toolbar-area" v-if="editor">
      <button @click="editor.chain().focus().toggleBold().run()"
        :disabled="!editor.can().chain().focus().toggleBold().run()" :class="{ 'is-active': editor.isActive('bold') }">
        <svg class="icon" aria-hidden="true">
          <use xlink:href="#icon-bold"></use>
        </svg>
      </button>
      <button @click="editor.chain().focus().toggleItalic().run()"
        :disabled="!editor.can().chain().focus().toggleItalic().run()"
        :class="{ 'is-active': editor.isActive('italic') }">
        <svg class="icon" aria-hidden="true">
          <use xlink:href="#icon-italic"></use>
        </svg>
      </button>
      <button @click="editor.chain().focus().toggleStrike().run()"
        :disabled="!editor.can().chain().focus().toggleStrike().run()"
        :class="{ 'is-active': editor.isActive('strike') }">
        <svg class="icon" aria-hidden="true">
          <use xlink:href="#icon-strike"></use>
        </svg>
      </button>
      <el-dropdown>
        <span class="el-dropdown-link" @mouseenter="editor.commands.focus();">
          <svg class="icon" v-show="editor.isActive({ textAlign: 'left' })" aria-hidden="true">
            <use xlink:href="#icon-left-alignment"></use>
          </svg>
          <a v-show="editor.isActive({ textAlign: 'left' })">&nbsp;&nbsp;居左对齐</a>
          <svg class="icon" v-show="editor.isActive({ textAlign: 'center' })" aria-hidden="true">
            <use xlink:href="#icon-center-alignment"></use>
          </svg>
          <a v-show="editor.isActive({ textAlign: 'center' })">&nbsp;&nbsp;居中对齐</a>
          <svg class="icon" v-show="editor.isActive({ textAlign: 'right' })" aria-hidden="true">
            <use xlink:href="#icon-right-alignment"></use>
          </svg>
          <a v-show="editor.isActive({ textAlign: 'right' })">&nbsp;&nbsp;居右对齐</a>
          <svg class="icon" v-show="editor.isActive({ textAlign: 'justify' })" aria-hidden="true">
            <use xlink:href="#icon-justify-alignment"></use>
          </svg>
          <a v-show="editor.isActive({ textAlign: 'justify' })">&nbsp;&nbsp;两端对齐</a>
          <el-icon class="el-icon--right">
            <arrow-down />
          </el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="editor.chain().focus().setTextAlign('left').run()">
              <svg class="icon" aria-hidden="true">
                <use xlink:href="#icon-left-alignment"></use>
              </svg>
              &nbsp;&nbsp;居左对齐
            </el-dropdown-item>
            <el-dropdown-item @click="editor.chain().focus().setTextAlign('center').run()">
              <svg class="icon" aria-hidden="true">
                <use xlink:href="#icon-center-alignment"></use>
              </svg>
              &nbsp;&nbsp;居中对齐
            </el-dropdown-item>
            <el-dropdown-item @click="editor.chain().focus().setTextAlign('right').run()">
              <svg class="icon" aria-hidden="true">
                <use xlink:href="#icon-left-alignment"></use>
              </svg>
              &nbsp;&nbsp;居右对齐
            </el-dropdown-item>
            <el-dropdown-item @click="editor.chain().focus().setTextAlign('justify').run()">
              <svg class="icon" aria-hidden="true">
                <use xlink:href="#icon-justify-alignment"></use>
              </svg>
              &nbsp;&nbsp;两端对齐
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <!--
      <button @click="editor.chain().focus().toggleCode().run()" :disabled="!editor.can().chain().focus().toggleCode().run()" :class="{ 'is-active': editor.isActive('code') }">
        code
      </button>
      -->

      <el-dropdown>
        <span class="el-dropdown-link" @mouseenter="editor.commands.focus();">
          <svg class="icon" v-show="editor.isActive('paragraph')" aria-hidden="true">
            <use xlink:href="#icon-para"></use>
          </svg>
          <a v-show="editor.isActive('paragraph')">&nbsp;&nbsp;段落文本</a>
          <svg class="icon" v-show="editor.isActive('heading', { level: 1 })" aria-hidden="true">
            <use xlink:href="#icon-h1"></use>
          </svg>
          <a v-show="editor.isActive('heading', { level: 1 })">&nbsp;&nbsp;一级标题</a>
          <svg class="icon" v-show="editor.isActive('heading', { level: 2 })" aria-hidden="true">
            <use xlink:href="#icon-h2"></use>
          </svg>
          <a v-show="editor.isActive('heading', { level: 2 })">&nbsp;&nbsp;二级标题</a>
          <svg class="icon" v-show="editor.isActive('heading', { level: 3 })" aria-hidden="true">
            <use xlink:href="#icon-h3"></use>
          </svg>
          <a v-show="editor.isActive('heading', { level: 3 })">&nbsp;&nbsp;三级标题</a>
          <svg class="icon" v-show="editor.isActive('heading', { level: 4 })" aria-hidden="true">
            <use xlink:href="#icon-h4"></use>
          </svg>
          <a v-show="editor.isActive('heading', { level: 4 })">&nbsp;&nbsp;四级标题</a>
          <svg class="icon" v-show="editor.isActive('heading', { level: 5 })" aria-hidden="true">
            <use xlink:href="#icon-h5"></use>
          </svg>
          <a v-show="editor.isActive('heading', { level: 5 })">&nbsp;&nbsp;五级标题</a>
          <svg class="icon" v-show="editor.isActive('heading', { level: 6 })" aria-hidden="true">
            <use xlink:href="#icon-h6"></use>
          </svg>
          <a v-show="editor.isActive('heading', { level: 6 })">&nbsp;&nbsp;六级标题</a>
          <el-icon class="el-icon--right">
            <arrow-down />
          </el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="editor.chain().focus().setParagraph().run()">
              <svg class="icon" aria-hidden="true">
                <use xlink:href="#icon-para"></use>
              </svg>
              &nbsp;&nbsp;段落文本
            </el-dropdown-item>
            <el-dropdown-item @click="editor.chain().focus().toggleHeading({ level: 1 }).run()">
              <svg class="icon" aria-hidden="true">
                <use xlink:href="#icon-h1"></use>
              </svg>
              &nbsp;&nbsp;一级标题
            </el-dropdown-item>
            <el-dropdown-item @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">
              <svg class="icon" aria-hidden="true">
                <use xlink:href="#icon-h2"></use>
              </svg>
              &nbsp;&nbsp;二级标题
            </el-dropdown-item>
            <el-dropdown-item @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">
              <svg class="icon" aria-hidden="true">
                <use xlink:href="#icon-h3"></use>
              </svg>
              &nbsp;&nbsp;三级标题
            </el-dropdown-item>
            <el-dropdown-item @click="editor.chain().focus().toggleHeading({ level: 4 }).run()">
              <svg class="icon" aria-hidden="true">
                <use xlink:href="#icon-h4"></use>
              </svg>
              &nbsp;&nbsp;四级标题
            </el-dropdown-item>
            <el-dropdown-item @click="editor.chain().focus().toggleHeading({ level: 5 }).run()">
              <svg class="icon" aria-hidden="true">
                <use xlink:href="#icon-h5"></use>
              </svg>
              &nbsp;&nbsp;五级标题
            </el-dropdown-item>
            <el-dropdown-item @click="editor.chain().focus().toggleHeading({ level: 6 }).run()">
              <svg class="icon" aria-hidden="true">
                <use xlink:href="#icon-h6"></use>
              </svg>
              &nbsp;&nbsp;六级标题
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <button @click="editor.chain().focus().toggleBulletList().run()"
        :class="{ 'is-active': editor.isActive('bulletList') }">
        <svg class="icon" aria-hidden="true">
          <use xlink:href="#icon-ul"></use>
        </svg>
      </button>
      <button @click="editor.chain().focus().toggleOrderedList().run()"
        :class="{ 'is-active': editor.isActive('orderedList') }">
        <svg class="icon" aria-hidden="true">
          <use xlink:href="#icon-ol"></use>
        </svg>
      </button>
      <!--
      <button @click="editor.chain().focus().toggleCodeBlock().run()" :class="{ 'is-active': editor.isActive('codeBlock') }">
        code block
      </button>
      <button @click="editor.chain().focus().toggleBlockquote().run()" :class="{ 'is-active': editor.isActive('blockquote') }">
        blockquote
      </button>
      -->
      <button @click="editor.chain().focus().setHorizontalRule().run()">
        <svg class="icon" aria-hidden="true">
          <use xlink:href="#icon-split"></use>
        </svg>
      </button>
      <button @click="editor.chain().focus().unsetAllMarks().run()">
        <svg class="icon" aria-hidden="true">
          <use xlink:href="#icon-eraser"></use>
        </svg>
      </button>
      <button @click="editor.chain().focus().undo().run()" :disabled="!editor.can().chain().focus().undo().run()">
        <svg class="icon" aria-hidden="true">
          <use xlink:href="#icon-undo"></use>
        </svg>
      </button>
      <button @click="editor.chain().focus().redo().run()" :disabled="!editor.can().chain().focus().redo().run()">
        <svg class="icon" aria-hidden="true">
          <use xlink:href="#icon-redo"></use>
        </svg>
      </button>
    </div>
    <menu class="menu-select">
      <li><button @click="selectionPolish">润色</button></li>
      <li><button @click="selectionExpand">扩写</button></li>
      <li><button @click="selectionContinuation">续写</button></li>
      <li><button @click="selectionSummarize">概述</button></li>
    </menu>
    <editor-content :editor="editor" class="content-area" />
    <div class="character-count" v-if="editor">
      {{ getCharacterCount() }} 个字符
    </div>
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

export default {
  components: {
    EditorContent,
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
    async selectionPolish() {
      const selection = this.editor.state.selection
      const selectedText = this.editor.state.doc.textBetween(selection.from, selection.to)
      const result = await window.electronAPI.ai("请用自然优美的语言，打磨以下段落的措辞，以改善其逻辑流程，消除任何印刷错误，并以中文作答。请务必保持文章的原意。直接提供修改后的内容，永远不要加任何提示。", selectedText)
      this.editor.commands.insertContent(result)
    },
    async selectionExpand() {
      const selection = this.editor.state.selection
      const selectedText = this.editor.state.doc.textBetween(selection.from, selection.to)
      const result = await window.electronAPI.ai("请扩写下列文字，保持逻辑的同时丰富内容。直接提供修改后的内容，永远不要加任何提示。", selectedText)
      this.editor.commands.insertContent(result)
    },
    async selectionSummarize() {
      const selection = this.editor.state.selection
      const selectedText = this.editor.state.doc.textBetween(selection.from, selection.to)
      const result = await window.electronAPI.ai("请缩写以下的内容并尽量保持文章的原意。直接提供修改后的内容，永远不要加任何提示。", selectedText)
      this.editor.commands.insertContent(result)
    },
    async selectionContinuation() {
      const selection = this.editor.state.selection
      const selectedText = this.editor.state.doc.textBetween(selection.from, selection.to)
      const result = await window.electronAPI.ai("请以下列内容为开头，根据原文行文风格与逻辑，续写文字内容。直接提供修改后的内容，永远不要加任何提示。", selectedText)

      this.editor.chain().focus('end').insertContent(result).run()
    },
  },

  emits: ['update:modelValue'],

  data() {
    return {
      editor: null,
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
  },

  beforeUnmount() {
    this.editor.destroy()
  },
}
</script>

<style lang="scss">
@use "/src/styles/style" as *;

.el-dropdown-link {
  .icon {
    color: $lamp-color-neutral-dark;
  }

  a {
    color: $lamp-color-neutral-dark;
    font-size: 12px;
    padding: 1px 0 0 0;

    &:hover {
      color: $lamp-color-neutral-dark;
    }
  }

  cursor: pointer;
  color: $lamp-color-neutral-dark;
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 8px;

  &:hover {
    background-color: rgba($lamp-color-neutral-grey, 0.2);
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
      color: $lamp-color-neutral-dark;
    }

    &:hover {
      background-color: rgba($lamp-color-neutral-grey, 0.2);
      color: $lamp-color-neutral-dark;
    }
  }
}

:focus-visible {
  outline: none;
}

.has-focus {
  color: $lamp-color-neutral-dark;
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
          background-color: rgba($lamp-color-primary, 0.2);
          color: $lamp-color-primary;
        }
      }
    }

    .content-area {
      grid-row: 2;
      overflow-x: hidden;
      overflow-y: scroll;
      padding: 0 0 0 15px;
      text-align: left;
      color: rgba($lamp-color-neutral-grey, 0.5);
    }

    /* 自定义滚动条样式 */
    .content-area::-webkit-scrollbar {
      width: 6px;
    }

    .content-area::-webkit-scrollbar-track {
      background-color: transparent;
    }

    .content-area::-webkit-scrollbar-thumb {
      background: rgba($lamp-color-neutral-grey, 0.4);
      border-radius: 6px;
    }

    .content-area::-webkit-scrollbar-thumb:hover {
      background: $lamp-color-neutral-grey;
    }
  }
}

menu {
  display: flex;
  flex-direction: column;
  list-style: none;
  padding: 4px 6px;
  border-radius: 8px;
  box-shadow: 2px 4px 6px 2px rgba($lamp-color-neutral-grey, 0.15);
  background-color: $lamp-color-neutral-light;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  gap: 4px;
}

.menu-select {
  position: absolute;
  z-index: 1000;
  border: 1px solid rgba($lamp-color-neutral-grey, 0.2);

  .button {
    padding: 4px 8px;
    font-size: 8px !important;
    color: $lamp-color-neutral-dark;
    background-color: transparent;
    border: none;
    cursor: pointer;

    &:hover {
      background-color: rgba($lamp-color-neutral-grey, 0.2);
      color: $lamp-color-neutral-dark;
    }
  }
}

.character-count {
  grid-row: 3;
  padding-left: 12px;
  height: 20px;
  font-size: 12px;
  text-align: left;
  color: $lamp-color-neutral-grey;
  user-select: none;
}
</style>