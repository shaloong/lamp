import type { PluginContributions } from '../../plugins/types';
import { pluginI18nKey } from '../../plugins/PluginI18nService';
import { messages } from './messages';
import WritingStatsPanel from './WritingStatsPanel.vue';
import {
  initializeWritingStats,
  resetDocumentBaseline,
  sampleEditorText,
  setDailyGoal,
  writingStatsState,
} from './state';

export const manifest = {
  id: 'lamp.writing-stats',
  name: pluginI18nKey('lamp.writing-stats', 'name'),
  version: '1.1.0',
  builtin: true,
  disableable: true,
};

let sampleTimer: ReturnType<typeof setInterval> | null = null;
let disposeEditorReady: (() => void) | null = null;
let disposeEditorDestroy: (() => void) | null = null;

function stopSampling() {
  if (sampleTimer) {
    clearInterval(sampleTimer);
    sampleTimer = null;
  }
}

export default {
  manifest,
  messages,

  onLoad(ctx: any): PluginContributions {
    const label = (key: string) => ctx.i18n.key(key);

    initializeWritingStats({
      dailyGoal: ctx.storage.get('dailyGoal', 2000),
      history: ctx.storage.get('historyV1', { days: {} }),
      adapter: {
        saveDailyGoal: (goal) => ctx.storage.set('dailyGoal', goal),
        saveHistory: (history) => ctx.storage.set('historyV1', history),
      },
    });

    disposeEditorReady = ctx.event.on('lamp.editor.ready', () => {
      stopSampling();
      const editor = ctx.editor.getRawEditor();
      resetDocumentBaseline(editor?.getText() || '');
      sampleTimer = setInterval(() => {
        const currentEditor = ctx.editor.getRawEditor();
        if (currentEditor) {
          sampleEditorText(currentEditor.getText());
        }
      }, 1500);
    });

    disposeEditorDestroy = ctx.event.on('lamp.editor.destroy', () => {
      stopSampling();
    });

    const openDashboard = () => {
      ctx.event.emit('lamp.sidebar.openPanel', { pluginId: ctx.id, panelId: 'dashboard' });
    };

    return {
      sidebarPanels: [
        {
          id: 'dashboard',
          title: label('panelTitle'),
          icon: 'BarChart3',
          component: WritingStatsPanel,
          priority: 70,
        },
      ],

      statusBarItems: [
        {
          id: 'word-count',
          side: 'right',
          priority: 60,
          text: () => ctx.i18n.t('wordCount', {
            words: writingStatsState.currentWords,
            chars: writingStatsState.currentChars,
          }),
          tooltip: label('wordCountTooltip'),
          action: openDashboard,
        },
        {
          id: 'today-progress',
          side: 'right',
          priority: 55,
          text: () => ctx.i18n.t('statusProgress', {
            today: writingStatsState.todayWords,
            goal: writingStatsState.dailyGoal,
          }),
          tooltip: label('todayProgressTooltip'),
          action: openDashboard,
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
              onChange: (value: unknown) => setDailyGoal(value),
            },
          ],
        },
      ],
    };
  },

  onDeactivate() {
    stopSampling();
    disposeEditorReady?.();
    disposeEditorReady = null;
    disposeEditorDestroy?.();
    disposeEditorDestroy = null;
  },
};
