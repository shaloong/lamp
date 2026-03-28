// ============================================================
// Built-in Plugin: AI Writing Assistant
// Contributes: bubble menu items + menu items for AI operations
// NOTE: This plugin is disableable (builtin: true, disableable: true).
// It provides AI-powered writing tools via the plugin system.
// ============================================================

import type { Editor } from '@tiptap/core';
import { pluginHost } from '../../plugins/index';
import type { AISuggestion, PluginContributions } from '../../plugins/types';
import { messages } from './messages';

// Compute namespace prefix from manifest.id using the same logic as I18nService._pluginNamespace.
function pluginNs(id: string): string {
  return 'plugins.' + id.replace(/\./g, '-') + '.';
}

export const manifest = {
  id: 'lamp.ai-actions',
  name: pluginNs('lamp.ai-actions') + 'name',
  version: '1.0.0',
  builtin: true,
  disableable: true,
};

// Short prefix for referencing plugin keys in contributions
const P = manifest.name.slice(0, -4); // strip 'name' suffix → 'plugins.lamp-ai-actions.'

/** Default prompts for each AI action */
const DEFAULT_PROMPTS = {
  polish: '你是一位专业的中文写作润色专家。请对用户提供的文本进行润色，使其更加流畅、准确、优美。保持原文的风格和含义，但用词更加精炼。直接返回润色后的文本，不要添加任何解释。',
  expand: '你是一位专业的中文写作助手。请对用户提供的文本进行合理扩写，增加细节描写和环境渲染，使内容更加丰富生动。保持原文的核心思想和风格。直接返回扩写后的文本，不要添加任何解释。',
  continue: '你是一位专业的中文作家。请根据上文续写内容，保持相同的风格和叙事节奏，自然流畅地衔接上文。直接返回续写内容，不要添加任何解释。',
  summarize: '你是一位专业的文本总结专家。请对用户提供的文本进行简洁准确的概述，提取核心观点，去除冗余信息。直接返回概述内容，不要添加任何解释。',
} as const;

/** Resolve effective prompt: user override from storage, or default */
function getPrompt(ctx: ReturnType<typeof pluginHost.getContext>, id: keyof typeof DEFAULT_PROMPTS): string {
  return ((ctx as unknown as { storage: { get: (k: string) => string | undefined } })?.storage.get(id) as string | undefined) ?? DEFAULT_PROMPTS[id];
}

/** Returns the text content of the current editor selection */
function getSelection(editor: Editor): string {
  return editor.state.selection.empty
    ? ''
    : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
}

async function aiSuggest(
  ctx: ReturnType<typeof pluginHost.getContext>,
  actionLabel: string,
  fn: () => Promise<AISuggestion>,
): Promise<void> {
  if (!ctx) return;
  ctx.ai.startLoading(actionLabel);
  try {
    const suggestion = await fn();
    ctx.ai.showSuggestion(suggestion);
  } catch (err) {
    ctx.ai.setError(err instanceof Error ? err.message : String(err));
  }
}

// Re-export so builtins/index.ts can collect them
export { messages };

export default {
  manifest,

  onLoad(_ctx: unknown): PluginContributions {
    const makeAction = (
      id: keyof typeof DEFAULT_PROMPTS,
      loadingLabelKey: string,
      getInput: (editor: Editor) => { text: string; from: number; to: number },
      insertMode: 'replace' | 'append',
    ) => {
      return async (editor: Editor) => {
        const ctx = pluginHost.getContext('lamp.ai-actions');
        const { text, from, to } = getInput(editor);
        if (!text.trim()) return;
        await aiSuggest(ctx, loadingLabelKey, async () => ({
          actionLabel: loadingLabelKey,
          content: await ctx!.ai.chat(getPrompt(ctx, id), text),
          insertMode,
          from,
          to,
        }));
      };
    };

    const bubbleFrom = (editor: Editor) => ({
      text: getSelection(editor),
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    });

    return {
      bubbleMenu: [
        {
          id: 'polish',
          label: P + 'polish',
          icon: '#icon-mobang',
          priority: 80,
          requireSelection: true,
          action: makeAction('polish', P + 'polishing', bubbleFrom, 'replace'),
        },
        {
          id: 'expand',
          label: P + 'expand',
          icon: '#icon-wenben-kuoxie',
          priority: 70,
          requireSelection: true,
          action: makeAction('expand', P + 'expanding', bubbleFrom, 'replace'),
        },
        {
          id: 'continue',
          label: P + 'continue',
          icon: '#icon-xuxie',
          priority: 60,
          requireSelection: false,
          action: makeAction('continue', P + 'continuing', bubbleFrom, 'append'),
        },
        {
          id: 'summarize',
          label: P + 'summarize',
          icon: '#icon-wenben-suoxie',
          priority: 50,
          requireSelection: true,
          action: makeAction('summarize', P + 'summarizing', bubbleFrom, 'replace'),
        },
      ],

      menuItems: [
        {
          id: 'polish',
          where: 'edit',
          label: P + 'polish',
          icon: '#icon-mobang',
          priority: 60,
          action: makeAction('polish', P + 'polishing', bubbleFrom, 'replace'),
        },
        {
          id: 'expand',
          where: 'edit',
          label: P + 'expand',
          icon: '#icon-wenben-kuoxie',
          priority: 59,
          action: makeAction('expand', P + 'expanding', bubbleFrom, 'replace'),
        },
        {
          id: 'continue',
          where: 'edit',
          label: P + 'continue',
          icon: '#icon-xuxie',
          priority: 58,
          action: makeAction('continue', P + 'continuing', (editor: Editor) => ({
            text: editor.getText(),
            from: editor.state.selection.from,
            to: editor.state.selection.to,
          }), 'append'),
        },
        {
          id: 'summarize',
          where: 'edit',
          label: P + 'summarize',
          icon: '#icon-wenben-suoxie',
          priority: 57,
          action: makeAction('summarize', P + 'summarizing', bubbleFrom, 'replace'),
        },
      ],

      // ── Settings: prompt template customization ─────────────────
      settings: [
        {
          id: 'prompts',
          label: P + 'prompts',
          priority: 50,
          items: [
            {
              id: 'polish',
              type: 'textarea',
              label: P + 'polish',
              description: P + 'polishDesc',
              defaultValue: DEFAULT_PROMPTS.polish,
            },
            {
              id: 'expand',
              type: 'textarea',
              label: P + 'expand',
              description: P + 'expandDesc',
              defaultValue: DEFAULT_PROMPTS.expand,
            },
            {
              id: 'continue',
              type: 'textarea',
              label: P + 'continue',
              description: P + 'continueDesc',
              defaultValue: DEFAULT_PROMPTS.continue,
            },
            {
              id: 'summarize',
              type: 'textarea',
              label: P + 'summarize',
              description: P + 'summarizeDesc',
              defaultValue: DEFAULT_PROMPTS.summarize,
            },
          ],
        },
      ],
    };
  },
};
