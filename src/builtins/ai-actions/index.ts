// ============================================================
// Built-in Plugin: AI Writing Assistant
// Contributes: bubble menu items + menu items for AI operations
// NOTE: This plugin is disableable (builtin: true, disableable: true).
// It provides AI-powered writing tools via the plugin system.
// ============================================================

import type { Editor } from '@tiptap/core';
import { pluginI18nKey } from '../../plugins/PluginI18nService';
import type { AISuggestion, LampHostAPI, PluginContributions } from '../../plugins/types';
import { messages } from './messages';
import { AISuggestExtension } from './ext/AISuggestExtension';

export const manifest = {
  id: 'lamp.ai-actions',
  name: pluginI18nKey('lamp.ai-actions', 'name'),
  version: '1.0.0',
  builtin: true,
  disableable: true,
};

/** Default prompts for each AI action */
const DEFAULT_PROMPTS = {
  polish: '你是一位专业的写作润色专家。请对用户提供的文本进行润色，使其更加流畅、准确、优美。保持原文的风格和含义，但用词更加精炼。直接返回润色后的文本，不要添加任何解释。',
  expand: '你是一位专业的写作助手。请对用户提供的文本进行合理扩写，增加细节描写和环境渲染，使内容更加丰富生动。保持原文的核心思想和风格。直接返回扩写后的文本，不要添加任何解释。',
  continue: '你是一位专业的作家。请根据上文续写内容，保持相同的风格和叙事节奏，自然流畅地衔接上文。直接返回续写内容，不要添加任何解释。',
  summarize: '你是一位专业的文本总结专家。请对用户提供的文本进行简洁准确的概述，提取核心观点，去除冗余信息。直接返回概述内容，不要添加任何解释。',
} as const;

/** Resolve effective prompt: user override from storage, or default */
function getPrompt(ctx: LampHostAPI, id: keyof typeof DEFAULT_PROMPTS): string {
  return ctx.storage.get(id, DEFAULT_PROMPTS[id]) as string;
}

/** Returns the text content of the current editor selection */
function getSelection(editor: Editor): string {
  return editor.state.selection.empty
    ? ''
    : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
}

async function aiSuggest(
  ctx: LampHostAPI,
  actionLabel: string,
  fn: () => Promise<AISuggestion>,
): Promise<void> {
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
  messages,

  onLoad(ctx: LampHostAPI): PluginContributions {
    const label = (key: string) => ctx.i18n.key(key);

    const makeAction = (
      id: keyof typeof DEFAULT_PROMPTS,
      loadingLabelKey: string,
      getInput: (editor: Editor) => { text: string; from: number; to: number },
      insertMode: 'replace' | 'append',
    ) => {
      return async (editor: Editor) => {
        const { text, from, to } = getInput(editor);
        if (!text.trim()) return;
        await aiSuggest(ctx, loadingLabelKey, async () => ({
          actionLabel: loadingLabelKey,
          content: await ctx.ai.chat(getPrompt(ctx, id), text),
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
      tipTapExtensions: [
        {
          name: 'aiSuggest',
          ExtensionClass: AISuggestExtension.configure({
            onClearSuggestion: () => ctx.ai.clearSuggestion(),
          }),
        },
      ],

      bubbleMenu: [
        {
          id: 'polish',
          label: label('polish'),
          icon: 'Sparkles',
          priority: 80,
          requireSelection: true,
          action: makeAction('polish', label('polishing'), bubbleFrom, 'replace'),
        },
        {
          id: 'expand',
          label: label('expand'),
          icon: 'ListChevronsUpDown',
          priority: 70,
          requireSelection: true,
          action: makeAction('expand', label('expanding'), bubbleFrom, 'replace'),
        },
        {
          id: 'continue',
          label: label('continue'),
          icon: 'ArrowDownWideNarrow',
          priority: 60,
          requireSelection: false,
          action: makeAction('continue', label('continuing'), bubbleFrom, 'append'),
        },
        {
          id: 'summarize',
          label: label('summarize'),
          icon: 'ListChevronsDownUp',
          priority: 50,
          requireSelection: true,
          action: makeAction('summarize', label('summarizing'), bubbleFrom, 'replace'),
        },
      ],

      menuItems: [
        {
          id: 'polish',
          where: 'edit',
          label: label('polish'),
          icon: 'Sparkles',
          priority: 60,
          action: makeAction('polish', label('polishing'), bubbleFrom, 'replace'),
        },
        {
          id: 'expand',
          where: 'edit',
          label: label('expand'),
          icon: 'ArrowDownWideNarrow',
          priority: 59,
          action: makeAction('expand', label('expanding'), bubbleFrom, 'replace'),
        },
        {
          id: 'continue',
          where: 'edit',
          label: label('continue'),
          icon: 'ChevronsDown',
          priority: 58,
          action: makeAction('continue', label('continuing'), (editor: Editor) => ({
            text: editor.getText(),
            from: editor.state.selection.from,
            to: editor.state.selection.to,
          }), 'append'),
        },
        {
          id: 'summarize',
          where: 'edit',
          label: label('summarize'),
          icon: 'ListChevronsDownUp',
          priority: 57,
          action: makeAction('summarize', label('summarizing'), bubbleFrom, 'replace'),
        },
      ],

      // ── Settings: prompt template customization ─────────────────
      settings: [
        {
          id: 'prompts',
          label: label('prompts'),
          priority: 50,
          items: [
            {
              id: 'polish',
              type: 'textarea',
              label: label('polish'),
              defaultValue: DEFAULT_PROMPTS.polish,
            },
            {
              id: 'expand',
              type: 'textarea',
              label: label('expand'),
              defaultValue: DEFAULT_PROMPTS.expand,
            },
            {
              id: 'continue',
              type: 'textarea',
              label: label('continue'),
              defaultValue: DEFAULT_PROMPTS.continue,
            },
            {
              id: 'summarize',
              type: 'textarea',
              label: label('summarize'),
              defaultValue: DEFAULT_PROMPTS.summarize,
            },
          ],
        },
      ],
    };
  },
};
