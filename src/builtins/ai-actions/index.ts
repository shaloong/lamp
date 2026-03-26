// ============================================================
// Built-in Plugin: AI Writing Assistant
// Contributes: bubble menu items + menu items for AI operations
// NOTE: This plugin is disableable (builtin: true, disableable: true).
// It provides AI-powered writing tools via the plugin system.
// ============================================================

import type { Editor } from '@tiptap/core';
import { pluginHost } from '../../plugins/index';
import type { AISuggestion, PluginContributions } from '../../plugins/types';

/** Prompts for each AI action */
const PROMPTS = {
  polish: '你是一位专业的中文写作润色专家。请对用户提供的文本进行润色，使其更加流畅、准确、优美。保持原文的风格和含义，但用词更加精炼。直接返回润色后的文本，不要添加任何解释。',
  expand: '你是一位专业的中文写作助手。请对用户提供的文本进行合理扩写，增加细节描写和环境渲染，使内容更加丰富生动。保持原文的核心思想和风格。直接返回扩写后的文本，不要添加任何解释。',
  continue: '你是一位专业的中文作家。请根据上文续写内容，保持相同的风格和叙事节奏，自然流畅地衔接上文。直接返回续写内容，不要添加任何解释。',
  summarize: '你是一位专业的文本总结专家。请对用户提供的文本进行简洁准确的概述，提取核心观点，去除冗余信息。直接返回概述内容，不要添加任何解释。',
} as const;

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
    // Store in aiState; Editor.vue watches this and calls editor.setAISuggestion()
    ctx.ai.showSuggestion(suggestion);
  } catch (err) {
    ctx.ai.setError(err instanceof Error ? err.message : String(err));
  }
}

export const manifest = {
  id: 'lamp.ai-actions',
  name: 'AI 写作助手',
  version: '1.0.0',
  builtin: true,
  disableable: true,
};

export default {
  manifest,

  onLoad(_ctx: any): PluginContributions {
    // ── Shared action factory ──────────────────────────────────────
    // NOTE: getContext is called at action-execution time (not definition time),
    // because during onLoad the plugin has not yet been added to _loaded.
    const makeAction = (
      id: keyof typeof PROMPTS,
      actionLabel: string,
      getInput: (editor: Editor) => { text: string; from: number; to: number },
      insertMode: 'replace' | 'append',
    ) => {
      return async (editor: Editor) => {
        const ctx = pluginHost.getContext('lamp.ai-actions');
        const { text, from, to } = getInput(editor);
        if (!text.trim()) return;
        await aiSuggest(ctx, actionLabel, async () => ({
          actionLabel,
          content: await ctx!.ai.chat(PROMPTS[id], text),
          insertMode,
          from,
          to,
        }));
      };
    };

    // ── Bubble menu items ─────────────────────────────────────────
    // requireSelection: true → 润色 / 扩写 / 概述 — 替换所选内容
    // requireSelection: false → 续写 — 在所选内容之后追加
    const bubbleFrom = (editor: Editor) => ({
      text: getSelection(editor),
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    });

    return {
      bubbleMenu: [
        {
          id: 'polish',
          label: '润色',
          icon: '#icon-mobang',
          priority: 80,
          requireSelection: true,
          action: makeAction('polish', '润色中', bubbleFrom, 'replace'),
        },
        {
          id: 'expand',
          label: '扩写',
          icon: '#icon-wenben-kuoxie',
          priority: 70,
          requireSelection: true,
          action: makeAction('expand', '扩写中', bubbleFrom, 'replace'),
        },
        {
          id: 'continue',
          label: '续写',
          icon: '#icon-xuxie',
          priority: 60,
          requireSelection: false,
          action: makeAction('continue', '续写中', bubbleFrom, 'append'),
        },
        {
          id: 'summarize',
          label: '概述',
          icon: '#icon-wenben-suoxie',
          priority: 50,
          requireSelection: true,
          action: makeAction('summarize', '概述中', bubbleFrom, 'replace'),
        },
      ],

      // ── Menu bar items ──────────────────────────────────────────
      // 润色 / 扩写 / 概述 → 替换所选内容
      // 续写 → 追加到全文末尾（因为菜单没有上下文 selection）
      menuItems: [
        {
          id: 'polish',
          where: 'edit',
          label: '润色',
          icon: '#icon-mobang',
          priority: 60,
          action: makeAction('polish', '润色中', bubbleFrom, 'replace'),
        },
        {
          id: 'expand',
          where: 'edit',
          label: '扩写',
          icon: '#icon-wenben-kuoxie',
          priority: 59,
          action: makeAction('expand', '扩写中', bubbleFrom, 'replace'),
        },
        {
          id: 'continue',
          where: 'edit',
          label: '续写',
          icon: '#icon-xuxie',
          priority: 58,
          action: makeAction('continue', '续写中', (editor: Editor) => ({
            text: editor.getText(),
            from: editor.state.selection.from,
            to: editor.state.selection.to,
          }), 'append'),
        },
        {
          id: 'summarize',
          where: 'edit',
          label: '概述',
          icon: '#icon-wenben-suoxie',
          priority: 57,
          action: makeAction('summarize', '概述中', bubbleFrom, 'replace'),
        },
      ],
    };
  },
};
