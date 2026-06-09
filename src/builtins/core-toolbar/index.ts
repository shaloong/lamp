// ============================================================
// Built-in Plugin: Core Editor Toolbar
// Contributes: editorToolbar items for basic text formatting
// ============================================================

import type { PluginContributions } from '../../plugins/types';

// Compute namespace prefix from manifest.id using the same logic as I18nService._pluginNamespace.
// One source of truth: the plugin author only needs to set manifest.id correctly.
function pluginNs(id: string): string {
  return 'plugins.' + id.replace(/\./g, '-') + '.';
}

export const manifest = {
  id: 'lamp.core-toolbar',
  name: pluginNs('lamp.core-toolbar') + 'name',
  version: '1.0.0',
  builtin: true,
};

// Short prefix for referencing plugin keys in contributions
const P = manifest.name.slice(0, -4); // strip 'name' suffix → 'plugins.lamp-core-toolbar.'

// Helper: build an action that calls editor.chain().focus().<command>(...args).run()
function cmd(command: string, ...args: unknown[]): (editor: unknown) => void {
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
          label: P + 'bold',
          icon: 'Bold',
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
          label: P + 'italic',
          icon: 'Italic',
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
          label: P + 'strike',
          icon: 'Strikethrough',
          type: 'button',
          group: 'format',
          priority: 80,
          action: cmd('toggleStrike'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isActive: (editor: any) => editor.isActive('strike'),
        },
        {
          id: 'textAlign',
          label: P + 'align',
          type: 'dropdown',
          group: 'align',
          priority: 78,
          action: cmd('setTextAlign', 'left'),
          isDisabled: () => false,
          children: [
            {
              id: 'alignLeft',
              label: P + 'alignLeft',
              icon: 'AlignLeft',
              action: cmd('setTextAlign', 'left'),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive({ textAlign: 'left' }),
            },
            {
              id: 'alignCenter',
              label: P + 'alignCenter',
              icon: 'AlignCenter',
              action: cmd('setTextAlign', 'center'),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive({ textAlign: 'center' }),
            },
            {
              id: 'alignRight',
              label: P + 'alignRight',
              icon: 'AlignRight',
              action: cmd('setTextAlign', 'right'),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive({ textAlign: 'right' }),
            },
            {
              id: 'alignJustify',
              label: P + 'alignJustify',
              icon: 'AlignJustify',
              action: cmd('setTextAlign', 'justify'),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive({ textAlign: 'justify' }),
            },
          ],
        },
        {
          id: 'heading',
          label: P + 'heading',
          type: 'dropdown',
          group: 'heading',
          priority: 76,
          action: cmd('setParagraph'),
          isDisabled: () => false,
          children: [
            {
              id: 'paragraph',
              label: P + 'paragraph',
              icon: 'Pilcrow',
              action: cmd('setParagraph'),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('paragraph'),
            },
            {
              id: 'heading1',
              label: P + 'heading1',
              icon: 'Heading1',
              action: cmd('toggleHeading', { level: 1 }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('heading', { level: 1 }),
            },
            {
              id: 'heading2',
              label: P + 'heading2',
              icon: 'Heading2',
              action: cmd('toggleHeading', { level: 2 }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('heading', { level: 2 }),
            },
            {
              id: 'heading3',
              label: P + 'heading3',
              icon: 'Heading3',
              action: cmd('toggleHeading', { level: 3 }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('heading', { level: 3 }),
            },
            {
              id: 'heading4',
              label: P + 'heading4',
              icon: 'Heading4',
              action: cmd('toggleHeading', { level: 4 }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('heading', { level: 4 }),
            },
            {
              id: 'heading5',
              label: P + 'heading5',
              icon: 'Heading5',
              action: cmd('toggleHeading', { level: 5 }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('heading', { level: 5 }),
            },
            {
              id: 'heading6',
              label: P + 'heading6',
              icon: 'Heading6',
              action: cmd('toggleHeading', { level: 6 }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('heading', { level: 6 }),
            },
          ],
        },
        {
          id: 'bulletList',
          label: P + 'bulletList',
          icon: 'List',
          type: 'button',
          group: 'list',
          priority: 60,
          action: cmd('toggleBulletList'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isActive: (editor: any) => editor.isActive('bulletList'),
        },
        {
          id: 'orderedList',
          label: P + 'orderedList',
          icon: 'ListOrdered',
          type: 'button',
          group: 'list',
          priority: 50,
          action: cmd('toggleOrderedList'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isActive: (editor: any) => editor.isActive('orderedList'),
        },
        {
          id: 'horizontalRule',
          label: P + 'horizontalRule',
          icon: 'Minus',
          type: 'button',
          group: 'insert',
          priority: 40,
          action: cmd('setHorizontalRule'),
        },
        {
          id: 'clearFormat',
          label: P + 'clearFormat',
          icon: 'RemoveFormatting',
          type: 'button',
          group: 'clear',
          priority: 30,
          action: cmd('unsetAllMarks'),
        },
        {
          id: 'undo',
          label: P + 'undo',
          icon: 'Undo',
          type: 'button',
          group: 'history',
          priority: 20,
          action: cmd('undo'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isDisabled: (editor: any) => editor ? !editor.can().chain().focus().undo().run() : true,
        },
        {
          id: 'redo',
          label: P + 'redo',
          icon: 'Redo',
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
