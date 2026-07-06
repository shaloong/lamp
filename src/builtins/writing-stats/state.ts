import { reactive } from 'vue';
import {
  calculateCompletedGoals,
  calculateWritingStreak,
  clampGoal,
  countMeaningfulChars,
  countWritingUnits,
  getContributionDays,
  normalizeHistory,
  recordPositiveProgress,
  toDateKey,
} from './logic.js';

interface WritingDayEntry {
  date: string;
  words: number;
  goal: number;
  completedAt?: string;
}

interface WritingHistory {
  days?: Record<string, Partial<WritingDayEntry>>;
}

interface PersistenceAdapter {
  saveDailyGoal(goal: number): void;
  saveHistory(history: WritingHistory): void;
}

const noopAdapter: PersistenceAdapter = {
  saveDailyGoal: () => undefined,
  saveHistory: () => undefined,
};

let adapter = noopAdapter;
let lastDocumentWords = 0;
let hasDocumentBaseline = false;

export const writingStatsState = reactive({
  currentDate: toDateKey(),
  currentWords: 0,
  currentChars: 0,
  sessionWords: 0,
  todayWords: 0,
  dailyGoal: 2000,
  streakDays: 0,
  completedGoalsInWindow: 0,
  goalCompletedToday: false,
  celebrationToken: 0,
  history: { days: {} } as WritingHistory,
  contributionDays: [] as WritingDayEntry[],
});

function refreshDerived(now = new Date()) {
  const today = toDateKey(now);
  const normalized = normalizeHistory(writingStatsState.history);
  const todayEntry = normalized.days?.[today];
  writingStatsState.currentDate = today;
  writingStatsState.todayWords = todayEntry?.words || 0;
  writingStatsState.goalCompletedToday = writingStatsState.todayWords >= writingStatsState.dailyGoal;
  writingStatsState.streakDays = calculateWritingStreak(normalized, now);
  writingStatsState.completedGoalsInWindow = calculateCompletedGoals(normalized, now, 28);
  writingStatsState.contributionDays = getContributionDays(normalized, now, 28);
}

export function initializeWritingStats(options: {
  dailyGoal: unknown;
  history: unknown;
  adapter: PersistenceAdapter;
  now?: Date;
}) {
  adapter = options.adapter;
  writingStatsState.dailyGoal = clampGoal(options.dailyGoal);
  writingStatsState.history = normalizeHistory(options.history);
  writingStatsState.sessionWords = 0;
  hasDocumentBaseline = false;
  lastDocumentWords = 0;
  refreshDerived(options.now);
}

export function setDailyGoal(goal: unknown, now = new Date()) {
  writingStatsState.dailyGoal = clampGoal(goal, writingStatsState.dailyGoal);
  adapter.saveDailyGoal(writingStatsState.dailyGoal);

  const key = toDateKey(now);
  const normalized = normalizeHistory(writingStatsState.history);
  const days = { ...normalized.days };
  const today = days[key] || { date: key, words: 0, goal: writingStatsState.dailyGoal };
  days[key] = { ...today, goal: writingStatsState.dailyGoal };
  writingStatsState.history = { days };
  adapter.saveHistory(writingStatsState.history);
  refreshDerived(now);
}

export function resetDocumentBaseline(text: string) {
  const words = countWritingUnits(text);
  lastDocumentWords = words;
  hasDocumentBaseline = true;
  writingStatsState.currentWords = words;
  writingStatsState.currentChars = countMeaningfulChars(text);
}

export function sampleEditorText(text: string, now = new Date()) {
  const currentWords = countWritingUnits(text);
  writingStatsState.currentWords = currentWords;
  writingStatsState.currentChars = countMeaningfulChars(text);

  if (!hasDocumentBaseline || toDateKey(now) !== writingStatsState.currentDate) {
    lastDocumentWords = currentWords;
    hasDocumentBaseline = true;
    refreshDerived(now);
    return { addedWords: 0, goalCompleted: false };
  }

  const result = recordPositiveProgress({
    history: writingStatsState.history,
    date: now,
    previousDocumentWords: lastDocumentWords,
    currentDocumentWords: currentWords,
    dailyGoal: writingStatsState.dailyGoal,
  });

  if (currentWords !== lastDocumentWords) {
    lastDocumentWords = currentWords;
  }

  if (result.addedWords > 0) {
    writingStatsState.sessionWords += result.addedWords;
    writingStatsState.history = result.history;
    adapter.saveHistory(result.history);
    if (result.goalCompleted) {
      writingStatsState.celebrationToken += 1;
    }
  }

  refreshDerived(now);
  return result;
}
