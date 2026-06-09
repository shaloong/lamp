/**
 * Locale messages exported for host registration — keyed by locale id.
 * Each plugin uses its own namespace as the top-level key in the messages object.
 * Merge logic: strip the namespace prefix from flat storage keys, then write
 * the remainder at the correct nested path.
 *
 * Namespace → top-level key mapping (computed by I18nService._pluginNamespace):
 *   'lamp.ai-actions'    → 'plugins.lamp-ai-actions'
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
  },
};
