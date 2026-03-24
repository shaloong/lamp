// ============================================================
// Built-in Plugin: Core Editor Toolbar
// Contributes: editorToolbar items for basic text formatting
// ============================================================

import type { PluginContext, PluginContributions } from '../../plugins/types';

export const manifest = {
  id: 'lamp.core-toolbar',
  name: '核心工具栏',
  version: '1.1.0',
  builtin: true,
};

// Helper: build an action that calls editor.chain().focus().<command>(...args).run()
function cmd(command: string, ...args: unknown[]) {
  return (editor: { chain: () => { focus: () => { [key: string]: (...a: unknown[]) => { run: () => void } } } }) => {
    if (!editor) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor.chain().focus() as any)[command](...args).run();
  };
}

export default {
  manifest,

  onLoad(_ctx: PluginContext): PluginContributions {
    return {
      editorToolbar: [
        // ════════════════════════════════════════
        // 格式组  priority 100–80
        // ════════════════════════════════════════
        {
          id: 'bold',
          label: '粗体',
          icon: '#icon-bold',
          type: 'button',
          group: 'format',
          priority: 100,
          action: cmd('toggleBold'),
          isActive: (editor) => editor.isActive('bold'),
          isDisabled: (editor) => editor ? !editor.can().chain().focus().toggleBold().run() : true,
        },
        {
          id: 'italic',
          label: '斜体',
          icon: '#icon-italic',
          type: 'button',
          group: 'format',
          priority: 90,
          action: cmd('toggleItalic'),
          isActive: (editor) => editor.isActive('italic'),
          isDisabled: (editor) => editor ? !editor.can().chain().focus().toggleItalic().run() : true,
        },
        {
          id: 'strike',
          label: '删除线',
          icon: '#icon-strike',
          type: 'button',
          group: 'format',
          priority: 80,
          action: cmd('toggleStrike'),
          isActive: (editor) => editor.isActive('strike'),
        },

        // ════════════════════════════════════════
        // 对齐组  priority 78  (下拉菜单)
        // ════════════════════════════════════════
        {
          id: 'textAlign',
          label: '对齐',
          type: 'dropdown',
          group: 'align',
          priority: 78,
          // Default: set left alignment when clicking the trigger
          action: cmd('setTextAlign', 'left'),
          isDisabled: () => false,
          children: [
            {
              id: 'alignLeft',
              label: '居左对齐',
              icon: '#icon-left-alignment',
              action: cmd('setTextAlign', 'left'),
              isActive: (editor) => editor.isActive({ textAlign: 'left' }),
            },
            {
              id: 'alignCenter',
              label: '居中对齐',
              icon: '#icon-center-alignment',
              action: cmd('setTextAlign', 'center'),
              isActive: (editor) => editor.isActive({ textAlign: 'center' }),
            },
            {
              id: 'alignRight',
              label: '居右对齐',
              icon: '#icon-right-alignment',
              action: cmd('setTextAlign', 'right'),
              isActive: (editor) => editor.isActive({ textAlign: 'right' }),
            },
            {
              id: 'alignJustify',
              label: '两端对齐',
              icon: '#icon-justify-alignment',
              action: cmd('setTextAlign', 'justify'),
              isActive: (editor) => editor.isActive({ textAlign: 'justify' }),
            },
          ],
        },

        // ════════════════════════════════════════
        // 段落/标题组  priority 76  (下拉菜单)
        // ════════════════════════════════════════
        {
          id: 'heading',
          label: '标题',
          type: 'dropdown',
          group: 'heading',
          priority: 76,
          // Default: switch to paragraph when clicking the trigger
          action: cmd('setParagraph'),
          isDisabled: () => false,
          children: [
            {
              id: 'paragraph',
              label: '段落文本',
              icon: '#icon-para',
              action: cmd('setParagraph'),
              isActive: (editor) => editor.isActive('paragraph'),
            },
            {
              id: 'heading1',
              label: '一级标题',
              icon: '#icon-h1',
              action: cmd('toggleHeading', { level: 1 }),
              isActive: (editor) => editor.isActive('heading', { level: 1 }),
            },
            {
              id: 'heading2',
              label: '二级标题',
              icon: '#icon-h2',
              action: cmd('toggleHeading', { level: 2 }),
              isActive: (editor) => editor.isActive('heading', { level: 2 }),
            },
            {
              id: 'heading3',
              label: '三级标题',
              icon: '#icon-h3',
              action: cmd('toggleHeading', { level: 3 }),
              isActive: (editor) => editor.isActive('heading', { level: 3 }),
            },
            {
              id: 'heading4',
              label: '四级标题',
              icon: '#icon-h4',
              action: cmd('toggleHeading', { level: 4 }),
              isActive: (editor) => editor.isActive('heading', { level: 4 }),
            },
            {
              id: 'heading5',
              label: '五级标题',
              icon: '#icon-h5',
              action: cmd('toggleHeading', { level: 5 }),
              isActive: (editor) => editor.isActive('heading', { level: 5 }),
            },
            {
              id: 'heading6',
              label: '六级标题',
              icon: '#icon-h6',
              action: cmd('toggleHeading', { level: 6 }),
              isActive: (editor) => editor.isActive('heading', { level: 6 }),
            },
          ],
        },

        // ════════════════════════════════════════
        // 列表组  priority 60–50
        // ════════════════════════════════════════
        {
          id: 'bulletList',
          label: '无序列表',
          icon: '#icon-ul',
          type: 'button',
          group: 'list',
          priority: 60,
          action: cmd('toggleBulletList'),
          isActive: (editor) => editor.isActive('bulletList'),
        },
        {
          id: 'orderedList',
          label: '有序列表',
          icon: '#icon-ol',
          type: 'button',
          group: 'list',
          priority: 50,
          action: cmd('toggleOrderedList'),
          isActive: (editor) => editor.isActive('orderedList'),
        },

        // ════════════════════════════════════════
        // 插入组  priority 40
        // ════════════════════════════════════════
        {
          id: 'horizontalRule',
          label: '分割线',
          icon: '#icon-split',
          type: 'button',
          group: 'insert',
          priority: 40,
          action: cmd('setHorizontalRule'),
        },

        // ════════════════════════════════════════
        // 清除格式  priority 30
        // ════════════════════════════════════════
        {
          id: 'clearFormat',
          label: '清除格式',
          icon: '#icon-eraser',
          type: 'button',
          group: 'clear',
          priority: 30,
          action: cmd('unsetAllMarks'),
        },

        // ════════════════════════════════════════
        // 历史组  priority 20–10
        // ════════════════════════════════════════
        {
          id: 'undo',
          label: '撤销',
          icon: '#icon-undo',
          type: 'button',
          group: 'history',
          priority: 20,
          action: cmd('undo'),
          isDisabled: (editor) => editor ? !editor.can().chain().focus().undo().run() : true,
        },
        {
          id: 'redo',
          label: '重做',
          icon: '#icon-redo',
          type: 'button',
          group: 'history',
          priority: 10,
          action: cmd('redo'),
          isDisabled: (editor) => editor ? !editor.can().chain().focus().redo().run() : true,
        },
      ],
    };
  },
};
