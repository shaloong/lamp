import type { PluginContributions } from '../../plugins/types';
import { pluginI18nKey } from '../../plugins/PluginI18nService';
import { messages } from './messages';

export const manifest = {
  id: 'lamp.writing-stats',
  name: pluginI18nKey('lamp.writing-stats', 'name'),
  version: '1.0.0',
  builtin: true,
  disableable: true,
};

// ── Counting ─────────────────────────────────────────────────────

function countWords(text: string): number {
  if (!text) return 0;
  const chineseChars = (text.match(/[一-鿿㐀-䶿]/g) || []).length;
  const nonChinese = text.replace(/[一-鿿㐀-䶿]/g, ' ');
  const words = nonChinese.split(/\s+/).filter(Boolean).length;
  return chineseChars + words;
}

function countChars(text: string): number {
  return text.replace(/\s/g, '').length;
}

export default {
  manifest,
  messages,

  onLoad(ctx: any): PluginContributions {
    let lastContent = '';
    let sessionWords = 0;
    let interval: ReturnType<typeof setInterval> | null = null;
    let dailyGoal = (ctx.storage.get('dailyGoal', 2000) as number) || 2000;
    let words = 0;
    let chars = 0;
    const label = (key: string) => ctx.i18n.key(key);

    // Wire to host events
    const offEditorReady = ctx.event.on('lamp.editor.ready', () => {
      interval = setInterval(() => {
        const editor = ctx.editor.getRawEditor();
        if (!editor) return;

        const text = editor.getText();
        const currentLen = text.length;
        const lastLen = lastContent.length;

        if (currentLen > lastLen) {
          sessionWords += countWords(text.slice(lastLen));
        }

        lastContent = text;

        const words = countWords(text);
        const chars = countChars(text);
        dailyGoal = (ctx.storage.get('dailyGoal', 2000) as number) || 2000;
        void dailyGoal;
      }, 3000);
    });

    const offEditorDestroy = ctx.event.on('lamp.editor.destroy', () => {
      if (interval) { clearInterval(interval); interval = null; }
    });

    return {
      statusBarItems: [
        {
          id: 'word-count',
          side: 'right',
          priority: 60,
          text: () => ctx.i18n.t('wordCount', { words, chars }),
          tooltip: label('wordCountTooltip'),
        },
        {
          id: 'session-words',
          side: 'right',
          priority: 55,
          text: () => ctx.i18n.t('sessionWords', { count: sessionWords }),
          tooltip: label('sessionWordsTooltip'),
        },
      ],

      settings: [
        {
          id: 'goals',
          label: label('writingGoals'),
          priority: 40,
          items: [
            {
              id: 'dailyGoal',
              type: 'text',
              label: label('dailyGoal'),
              description: label('dailyGoalDesc'),
              defaultValue: 2000,
            },
          ],
        },
      ],
    };
  },
};
