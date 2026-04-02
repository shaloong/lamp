/**
 * Locale messages exported for host registration — keyed by locale id.
 * Each plugin uses its own namespace as the top-level key in the messages object.
 * Merge logic: strip the namespace prefix from flat storage keys, then write
 * the remainder at the correct nested path.
 *
 * Namespace → top-level key mapping (computed by I18nService._pluginNamespace):
 *   'lamp.ai-actions'    → 'plugins.lamp-ai-actions'
 *   'lamp.core-toolbar'  → 'plugins.lamp-core-toolbar'
 *
 * Plugin keys are simple (no namespace prefix) — the i18nService adds it.
 */
export const messages = {
  'zh-CN': {
    // ── AI Actions plugin ────────────────────────────────────────
    'plugins.lamp-ai-actions.name': 'AI 写作助手',
    'plugins.lamp-ai-actions.polish': '润色',
    'plugins.lamp-ai-actions.polishing': '润色中...',
    'plugins.lamp-ai-actions.expand': '扩写',
    'plugins.lamp-ai-actions.expanding': '扩写中...',
    'plugins.lamp-ai-actions.continue': '续写',
    'plugins.lamp-ai-actions.continuing': '续写中...',
    'plugins.lamp-ai-actions.summarize': '概述',
    'plugins.lamp-ai-actions.summarizing': '概述中...',
    'plugins.lamp-ai-actions.prompts': '提示词模板',

    // ── Core Toolbar plugin ──────────────────────────────────────
    'plugins.lamp-core-toolbar.name': '核心编辑器工具栏',
    'plugins.lamp-core-toolbar.bold': '粗体',
    'plugins.lamp-core-toolbar.italic': '斜体',
    'plugins.lamp-core-toolbar.strike': '删除线',
    'plugins.lamp-core-toolbar.align': '对齐',
    'plugins.lamp-core-toolbar.alignLeft': '居左对齐',
    'plugins.lamp-core-toolbar.alignCenter': '居中对齐',
    'plugins.lamp-core-toolbar.alignRight': '居右对齐',
    'plugins.lamp-core-toolbar.alignJustify': '两端对齐',
    'plugins.lamp-core-toolbar.heading': '标题',
    'plugins.lamp-core-toolbar.paragraph': '段落文本',
    'plugins.lamp-core-toolbar.heading1': '一级标题',
    'plugins.lamp-core-toolbar.heading2': '二级标题',
    'plugins.lamp-core-toolbar.heading3': '三级标题',
    'plugins.lamp-core-toolbar.heading4': '四级标题',
    'plugins.lamp-core-toolbar.heading5': '五级标题',
    'plugins.lamp-core-toolbar.heading6': '六级标题',
    'plugins.lamp-core-toolbar.bulletList': '无序列表',
    'plugins.lamp-core-toolbar.orderedList': '有序列表',
    'plugins.lamp-core-toolbar.horizontalRule': '分割线',
    'plugins.lamp-core-toolbar.clearFormat': '清除格式',
    'plugins.lamp-core-toolbar.undo': '撤销',
    'plugins.lamp-core-toolbar.redo': '重做',
  },
  'en-US': {
    // ── AI Actions plugin ────────────────────────────────────────
    'plugins.lamp-ai-actions.name': 'AI Writing Assistant',
    'plugins.lamp-ai-actions.polish': 'Polish',
    'plugins.lamp-ai-actions.polishing': 'Polishing...',
    'plugins.lamp-ai-actions.expand': 'Expand',
    'plugins.lamp-ai-actions.expanding': 'Expanding...',
    'plugins.lamp-ai-actions.continue': 'Continue',
    'plugins.lamp-ai-actions.continuing': 'Continuing...',
    'plugins.lamp-ai-actions.summarize': 'Summarize',
    'plugins.lamp-ai-actions.summarizing': 'Summarizing...',
    'plugins.lamp-ai-actions.prompts': 'Prompts',

    // ── Core Toolbar plugin ──────────────────────────────────────
    'plugins.lamp-core-toolbar.name': 'Core Editor Toolbar',
    'plugins.lamp-core-toolbar.bold': 'Bold',
    'plugins.lamp-core-toolbar.italic': 'Italic',
    'plugins.lamp-core-toolbar.strike': 'Strikethrough',
    'plugins.lamp-core-toolbar.align': 'Align',
    'plugins.lamp-core-toolbar.alignLeft': 'Align Left',
    'plugins.lamp-core-toolbar.alignCenter': 'Align Center',
    'plugins.lamp-core-toolbar.alignRight': 'Align Right',
    'plugins.lamp-core-toolbar.alignJustify': 'Justify',
    'plugins.lamp-core-toolbar.heading': 'Heading',
    'plugins.lamp-core-toolbar.paragraph': 'Paragraph',
    'plugins.lamp-core-toolbar.heading1': 'Heading 1',
    'plugins.lamp-core-toolbar.heading2': 'Heading 2',
    'plugins.lamp-core-toolbar.heading3': 'Heading 3',
    'plugins.lamp-core-toolbar.heading4': 'Heading 4',
    'plugins.lamp-core-toolbar.heading5': 'Heading 5',
    'plugins.lamp-core-toolbar.heading6': 'Heading 6',
    'plugins.lamp-core-toolbar.bulletList': 'Bullet List',
    'plugins.lamp-core-toolbar.orderedList': 'Numbered List',
    'plugins.lamp-core-toolbar.horizontalRule': 'Divider',
    'plugins.lamp-core-toolbar.clearFormat': 'Clear Format',
    'plugins.lamp-core-toolbar.undo': 'Undo',
    'plugins.lamp-core-toolbar.redo': 'Redo',
  },
};
