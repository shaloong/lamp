import type { PluginContributions } from '../../plugins/types';

const pluginNs = (id: string) => 'plugins.' + id.replace(/\./g, '-') + '.';

export const manifest = {
  id: 'lamp.writing-stats',
  name: pluginNs('lamp.writing-stats') + 'name',
  version: '1.0.0',
  builtin: true,
  disableable: true,
};

const P = manifest.name.slice(0, -4); // strip 'name' → 'plugins.lamp-writing-stats.'

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

  onLoad(ctx: any): PluginContributions {
    let lastContent = '';
    let sessionWords = 0;
    let interval: ReturnType<typeof setInterval> | null = null;
    let dailyGoal = (ctx.storage.get('dailyGoal', 2000) as number) || 2000;

    // Keep a reference so _updateStatusBar can mutate the contributed item text reactively
    let wcItemText = '';
    let ssItemText = '';

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
        const pct = dailyGoal > 0 ? Math.round((words / dailyGoal) * 100) : 0;
        const mins = Math.max(1, Math.round((Date.now() - (sessionWords > 0 ? Date.now() : Date.now())) / 60000));

        wcItemText = `${words} 字 | ${chars} 字符`;
        ssItemText = `本会话 ${sessionWords} 字`;
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
          text: '0 字 | 0 字符',
          tooltip: '当前文档字数统计',
        },
        {
          id: 'session-words',
          side: 'right',
          priority: 55,
          text: '本会话 0 字',
          tooltip: '本次打开编辑器后的写作量',
        },
      ],

      settings: [
        {
          id: 'goals',
          label: P + 'writingGoals',
          priority: 40,
          items: [
            {
              id: 'dailyGoal',
              type: 'text',
              label: P + 'dailyGoal',
              description: P + 'dailyGoalDesc',
              defaultValue: 2000,
            },
          ],
        },
      ],
    };
  },
};
