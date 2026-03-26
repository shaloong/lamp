// ============================================================
// Built-in Plugin: Core Editor Toolbar
// Contributes: editorToolbar items for basic text formatting
// ============================================================

import type { PluginContributions } from '../../plugins/types';

/** Locale messages exported for host registration — keyed by locale id */
export const messages = {
  'zh-CN': {
    bold: '粗体',
    italic: '斜体',
    strike: '删除线',
    align: '对齐',
    alignLeft: '居左对齐',
    alignCenter: '居中对齐',
    alignRight: '居右对齐',
    alignJustify: '两端对齐',
    heading: '标题',
    paragraph: '段落文本',
    heading1: '一级标题',
    heading2: '二级标题',
    heading3: '三级标题',
    heading4: '四级标题',
    heading5: '五级标题',
    heading6: '六级标题',
    bulletList: '无序列表',
    orderedList: '有序列表',
    horizontalRule: '分割线',
    clearFormat: '清除格式',
    undo: '撤销',
    redo: '重做',
  },
  'en-US': {
    bold: 'Bold',
    italic: 'Italic',
    strike: 'Strikethrough',
    align: 'Align',
    alignLeft: 'Align Left',
    alignCenter: 'Align Center',
    alignRight: 'Align Right',
    alignJustify: 'Justify',
    heading: 'Heading',
    paragraph: 'Paragraph',
    heading1: 'Heading 1',
    heading2: 'Heading 2',
    heading3: 'Heading 3',
    heading4: 'Heading 4',
    heading5: 'Heading 5',
    heading6: 'Heading 6',
    bulletList: 'Bullet List',
    orderedList: 'Numbered List',
    horizontalRule: 'Divider',
    clearFormat: 'Clear Format',
    undo: 'Undo',
    redo: 'Redo',
  },
};

export const manifest = {
  id: 'lamp.core-toolbar',
  name: 'plugins.lamp-core-toolbar',
  version: '1.0.0',
  builtin: true,
};

// Helper: build an action that calls editor.chain().focus().<command>(...args).run()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cmd(command: string, ...args: any[]): (editor: any) => void {
  return (editor) => {
    if (!editor) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor.chain().focus() as any)[command](...args).run();
  };
}

export default {
  manifest,

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onLoad(_ctx: any): PluginContributions {
    return {
      editorToolbar: [
        {
          id: 'bold',
          label: 'editor.bold',
          icon: '#icon-bold',
          type: 'button',
          group: 'format',
          priority: 100,
          action: cmd('toggleBold'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isActive: (editor: any) => editor.isActive('bold'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isDisabled: (editor: any) => editor ? !editor.can().chain().focus().toggleBold().run() : true,
        },
        {
          id: 'italic',
          label: 'editor.italic',
          icon: '#icon-italic',
          type: 'button',
          group: 'format',
          priority: 90,
          action: cmd('toggleItalic'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isActive: (editor: any) => editor.isActive('italic'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isDisabled: (editor: any) => editor ? !editor.can().chain().focus().toggleItalic().run() : true,
        },
        {
          id: 'strike',
          label: 'editor.strike',
          icon: '#icon-strike',
          type: 'button',
          group: 'format',
          priority: 80,
          action: cmd('toggleStrike'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isActive: (editor: any) => editor.isActive('strike'),
        },
        {
          id: 'textAlign',
          label: 'editor.align',
          type: 'dropdown',
          group: 'align',
          priority: 78,
          action: cmd('setTextAlign', 'left'),
          isDisabled: () => false,
          children: [
            {
              id: 'alignLeft',
              label: 'editor.alignLeft',
              icon: '#icon-left-alignment',
              action: cmd('setTextAlign', 'left'),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive({ textAlign: 'left' }),
            },
            {
              id: 'alignCenter',
              label: 'editor.alignCenter',
              icon: '#icon-center-alignment',
              action: cmd('setTextAlign', 'center'),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive({ textAlign: 'center' }),
            },
            {
              id: 'alignRight',
              label: 'editor.alignRight',
              icon: '#icon-right-alignment',
              action: cmd('setTextAlign', 'right'),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive({ textAlign: 'right' }),
            },
            {
              id: 'alignJustify',
              label: 'editor.alignJustify',
              icon: '#icon-justify-alignment',
              action: cmd('setTextAlign', 'justify'),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive({ textAlign: 'justify' }),
            },
          ],
        },
        {
          id: 'heading',
          label: 'editor.heading',
          type: 'dropdown',
          group: 'heading',
          priority: 76,
          action: cmd('setParagraph'),
          isDisabled: () => false,
          children: [
            {
              id: 'paragraph',
              label: 'editor.paragraph',
              icon: '#icon-para',
              action: cmd('setParagraph'),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('paragraph'),
            },
            {
              id: 'heading1',
              label: 'editor.heading1',
              icon: '#icon-h1',
              action: cmd('toggleHeading', { level: 1 }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('heading', { level: 1 }),
            },
            {
              id: 'heading2',
              label: 'editor.heading2',
              icon: '#icon-h2',
              action: cmd('toggleHeading', { level: 2 }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('heading', { level: 2 }),
            },
            {
              id: 'heading3',
              label: 'editor.heading3',
              icon: '#icon-h3',
              action: cmd('toggleHeading', { level: 3 }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('heading', { level: 3 }),
            },
            {
              id: 'heading4',
              label: 'editor.heading4',
              icon: '#icon-h4',
              action: cmd('toggleHeading', { level: 4 }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('heading', { level: 4 }),
            },
            {
              id: 'heading5',
              label: 'editor.heading5',
              icon: '#icon-h5',
              action: cmd('toggleHeading', { level: 5 }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('heading', { level: 5 }),
            },
            {
              id: 'heading6',
              label: 'editor.heading6',
              icon: '#icon-h6',
              action: cmd('toggleHeading', { level: 6 }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('heading', { level: 6 }),
            },
          ],
        },
        {
          id: 'bulletList',
          label: 'editor.bulletList',
          icon: '#icon-ul',
          type: 'button',
          group: 'list',
          priority: 60,
          action: cmd('toggleBulletList'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isActive: (editor: any) => editor.isActive('bulletList'),
        },
        {
          id: 'orderedList',
          label: 'editor.orderedList',
          icon: '#icon-ol',
          type: 'button',
          group: 'list',
          priority: 50,
          action: cmd('toggleOrderedList'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isActive: (editor: any) => editor.isActive('orderedList'),
        },
        {
          id: 'horizontalRule',
          label: 'editor.horizontalRule',
          icon: '#icon-split',
          type: 'button',
          group: 'insert',
          priority: 40,
          action: cmd('setHorizontalRule'),
        },
        {
          id: 'clearFormat',
          label: 'editor.clearFormat',
          icon: '#icon-eraser',
          type: 'button',
          group: 'clear',
          priority: 30,
          action: cmd('unsetAllMarks'),
        },
        {
          id: 'undo',
          label: 'editor.undo',
          icon: '#icon-undo',
          type: 'button',
          group: 'history',
          priority: 20,
          action: cmd('undo'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isDisabled: (editor: any) => editor ? !editor.can().chain().focus().undo().run() : true,
        },
        {
          id: 'redo',
          label: 'editor.redo',
          icon: '#icon-redo',
          type: 'button',
          group: 'history',
          priority: 10,
          action: cmd('redo'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isDisabled: (editor: any) => editor ? !editor.can().chain().focus().redo().run() : true,
        },
      ],
    };
  },
};
