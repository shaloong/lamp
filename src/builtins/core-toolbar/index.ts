// ============================================================
// Built-in Plugin: Core Editor Toolbar
// Contributes: editorToolbar items for basic text formatting
// ============================================================

import type { PluginContributions } from '../../plugins/types';
import { pluginI18nKey } from '../../plugins/PluginI18nService';
import { messages } from './messages';

export const manifest = {
  id: 'lamp.core-toolbar',
  name: pluginI18nKey('lamp.core-toolbar', 'name'),
  version: '1.0.0',
  builtin: true,
};

// Short prefix for referencing plugin keys in contributions
const label = (key: string) => pluginI18nKey(manifest.id, key);

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
  messages,

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onLoad(_ctx: any): PluginContributions {
    return {
      editorToolbar: [
        {
          id: 'bold',
          label: label('bold'),
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
          label: label('italic'),
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
          label: label('strike'),
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
          label: label('align'),
          type: 'dropdown',
          group: 'align',
          priority: 78,
          action: cmd('setTextAlign', 'left'),
          isDisabled: () => false,
          children: [
            {
              id: 'alignLeft',
              label: label('alignLeft'),
              icon: 'AlignLeft',
              action: cmd('setTextAlign', 'left'),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive({ textAlign: 'left' }),
            },
            {
              id: 'alignCenter',
              label: label('alignCenter'),
              icon: 'AlignCenter',
              action: cmd('setTextAlign', 'center'),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive({ textAlign: 'center' }),
            },
            {
              id: 'alignRight',
              label: label('alignRight'),
              icon: 'AlignRight',
              action: cmd('setTextAlign', 'right'),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive({ textAlign: 'right' }),
            },
            {
              id: 'alignJustify',
              label: label('alignJustify'),
              icon: 'AlignJustify',
              action: cmd('setTextAlign', 'justify'),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive({ textAlign: 'justify' }),
            },
          ],
        },
        {
          id: 'heading',
          label: label('heading'),
          type: 'dropdown',
          group: 'heading',
          priority: 76,
          action: cmd('setParagraph'),
          isDisabled: () => false,
          children: [
            {
              id: 'paragraph',
              label: label('paragraph'),
              icon: 'Pilcrow',
              action: cmd('setParagraph'),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('paragraph'),
            },
            {
              id: 'heading1',
              label: label('heading1'),
              icon: 'Heading1',
              action: cmd('toggleHeading', { level: 1 }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('heading', { level: 1 }),
            },
            {
              id: 'heading2',
              label: label('heading2'),
              icon: 'Heading2',
              action: cmd('toggleHeading', { level: 2 }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('heading', { level: 2 }),
            },
            {
              id: 'heading3',
              label: label('heading3'),
              icon: 'Heading3',
              action: cmd('toggleHeading', { level: 3 }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('heading', { level: 3 }),
            },
            {
              id: 'heading4',
              label: label('heading4'),
              icon: 'Heading4',
              action: cmd('toggleHeading', { level: 4 }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('heading', { level: 4 }),
            },
            {
              id: 'heading5',
              label: label('heading5'),
              icon: 'Heading5',
              action: cmd('toggleHeading', { level: 5 }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('heading', { level: 5 }),
            },
            {
              id: 'heading6',
              label: label('heading6'),
              icon: 'Heading6',
              action: cmd('toggleHeading', { level: 6 }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isActive: (editor: any) => editor.isActive('heading', { level: 6 }),
            },
          ],
        },
        {
          id: 'bulletList',
          label: label('bulletList'),
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
          label: label('orderedList'),
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
          label: label('horizontalRule'),
          icon: 'Minus',
          type: 'button',
          group: 'insert',
          priority: 40,
          action: cmd('setHorizontalRule'),
        },
        {
          id: 'clearFormat',
          label: label('clearFormat'),
          icon: 'RemoveFormatting',
          type: 'button',
          group: 'clear',
          priority: 30,
          action: cmd('unsetAllMarks'),
        },
        {
          id: 'undo',
          label: label('undo'),
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
          label: label('redo'),
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
