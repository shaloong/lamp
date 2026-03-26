// ============================================================
// Built-in Plugin: AI Writing Assistant
// Contributes: bubble menu items + menu items for AI operations
// NOTE: This plugin is disableable (builtin: true, disableable: true).
// It provides AI-powered writing tools via the plugin system.
// ============================================================

import type { Editor } from '@tiptap/core';
import { pluginHost } from '../../plugins/index';

/** Wraps an async AI action with loading state — shows a loading overlay while running */
async function withLoading(
  ctx: ReturnType<typeof pluginHost.getContext>,
  actionLabel: string,
  fn: () => Promise<void>,
): Promise<void> {
  if (!ctx) return;
  ctx.ai.startLoading(actionLabel);
  try {
    await fn();
  } catch (err) {
    ctx.ai.setError(err instanceof Error ? err.message : String(err));
  } finally {
    ctx.ai.stopLoading();
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

  onLoad(_ctx): PluginContributions {
    return {
      bubbleMenu: [
        {
          id: 'polish',
          label: '润色',
          icon: '#icon-edit',
          priority: 80,
          requireSelection: true,
          action: async (editor: Editor) => {
            const sel = editor.state.selection.empty
              ? ''
              : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
            if (!sel.trim()) return;
            const ctx = pluginHost.getContext('lamp.ai-actions');
            await withLoading(ctx, '润色中', async () => {
              const result = await ctx!.ai.chat(
                '你是一位专业的中文写作润色专家。请对用户提供的文本进行润色，使其更加流畅、准确、优美。保持原文的风格和含义，但用词更加精炼。直接返回润色后的文本，不要添加任何解释。',
                sel
              );
              editor.chain().focus().insertContent(result).run();
            });
          },
        },
        {
          id: 'expand',
          label: '扩写',
          icon: '#icon-expand',
          priority: 70,
          requireSelection: true,
          action: async (editor: Editor) => {
            const sel = editor.state.selection.empty
              ? ''
              : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
            if (!sel.trim()) return;
            const ctx = pluginHost.getContext('lamp.ai-actions');
            await withLoading(ctx, '扩写中', async () => {
              const result = await ctx!.ai.chat(
                '你是一位专业的中文写作助手。请对用户提供的文本进行合理扩写，增加细节描写和环境渲染，使内容更加丰富生动。保持原文的核心思想和风格。直接返回扩写后的文本，不要添加任何解释。',
                sel
              );
              editor.chain().focus().insertContent(result).run();
            });
          },
        },
        {
          id: 'continue',
          label: '续写',
          icon: '#icon-continue',
          priority: 60,
          requireSelection: false,
          action: async (editor: Editor) => {
            const sel = editor.state.selection.empty
              ? ''
              : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
            const text = sel.trim() || editor.getText();
            if (!text.trim()) return;
            const ctx = pluginHost.getContext('lamp.ai-actions');
            await withLoading(ctx, '续写中', async () => {
              const result = await ctx!.ai.chat(
                '你是一位专业的中文作家。请根据上文续写内容，保持相同的风格和叙事节奏，自然流畅地衔接上文。直接返回续写内容，不要添加任何解释。',
                text
              );
              editor.chain().focus().insertContent(result).run();
            });
          },
        },
        {
          id: 'summarize',
          label: '概述',
          icon: '#icon-summary',
          priority: 50,
          requireSelection: true,
          action: async (editor: Editor) => {
            const sel = editor.state.selection.empty
              ? ''
              : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
            if (!sel.trim()) return;
            const ctx = pluginHost.getContext('lamp.ai-actions');
            await withLoading(ctx, '概述中', async () => {
              const result = await ctx!.ai.chat(
                '你是一位专业的文本总结专家。请对用户提供的文本进行简洁准确的概述，提取核心观点，去除冗余信息。直接返回概述内容，不要添加任何解释。',
                sel
              );
              editor.chain().focus().insertContent(result).run();
            });
          },
        },
      ],

      menuItems: [
        {
          id: 'polish',
          where: 'edit',
          label: '润色',
          icon: '#icon-edit',
          priority: 60,
          action: async (editor: Editor) => {
            const sel = editor.state.selection.empty
              ? ''
              : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
            if (!sel.trim()) return;
            const ctx = pluginHost.getContext('lamp.ai-actions');
            await withLoading(ctx, '润色中', async () => {
              const result = await ctx!.ai.chat(
                '你是一位专业的中文写作润色专家。请对用户提供的文本进行润色，使其更加流畅、准确、优美。保持原文的风格和含义，但用词更加精炼。直接返回润色后的文本，不要添加任何解释。',
                sel
              );
              editor.chain().focus().insertContent(result).run();
            });
          },
        },
        {
          id: 'expand',
          where: 'edit',
          label: '扩写',
          icon: '#icon-expand',
          priority: 59,
          action: async (editor: Editor) => {
            const sel = editor.state.selection.empty
              ? ''
              : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
            if (!sel.trim()) return;
            const ctx = pluginHost.getContext('lamp.ai-actions');
            await withLoading(ctx, '扩写中', async () => {
              const result = await ctx!.ai.chat(
                '你是一位专业的中文写作助手。请对用户提供的文本进行合理扩写，增加细节描写和环境渲染，使内容更加丰富生动。保持原文的核心思想和风格。直接返回扩写后的文本，不要添加任何解释。',
                sel
              );
              editor.chain().focus().insertContent(result).run();
            });
          },
        },
        {
          id: 'continue',
          where: 'edit',
          label: '续写',
          icon: '#icon-continue',
          priority: 58,
          action: async (editor: Editor) => {
            const text = editor.getText();
            if (!text.trim()) return;
            const ctx = pluginHost.getContext('lamp.ai-actions');
            await withLoading(ctx, '续写中', async () => {
              const result = await ctx!.ai.chat(
                '你是一位专业的中文作家。请根据上文续写内容，保持相同的风格和叙事节奏，自然流畅地衔接上文。直接返回续写内容，不要添加任何解释。',
                text
              );
              editor.chain().focus().insertContent(result).run();
            });
          },
        },
        {
          id: 'summarize',
          where: 'edit',
          label: '概述',
          icon: '#icon-summary',
          priority: 57,
          action: async (editor: Editor) => {
            const sel = editor.state.selection.empty
              ? ''
              : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
            if (!sel.trim()) return;
            const ctx = pluginHost.getContext('lamp.ai-actions');
            await withLoading(ctx, '概述中', async () => {
              const result = await ctx!.ai.chat(
                '你是一位专业的文本总结专家。请对用户提供的文本进行简洁准确的概述，提取核心观点，去除冗余信息。直接返回概述内容，不要添加任何解释。',
                sel
              );
              editor.chain().focus().insertContent(result).run();
            });
          },
        },
      ],
    };
  },
};

