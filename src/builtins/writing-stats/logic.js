export function countWritingUnits(text) {
  if (!text) return 0;
  const cjkChars = (text.match(/[一-鿿㐀-䶿]/g) || []).length;
  const nonCjk = text
    .replace(/[一-鿿㐀-䶿]/g, ' ')
    .replace(/[^\p{L}\p{N}'-]+/gu, ' ')
    .trim();
  const words = nonCjk ? nonCjk.split(/\s+/).filter(Boolean).length : 0;
  return cjkChars + words;
}

export function countMeaningfulChars(text) {
  return (text || '').replace(/\s/g, '').length;
}

export function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function clampGoal(value, fallback = 2000) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(200000, Math.round(parsed)));
}

export function normalizeHistory(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const days = {};
  for (const [date, entry] of Object.entries(source.days || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const words = Math.max(0, Math.round(Number(entry?.words) || 0));
    const goal = clampGoal(entry?.goal, 2000);
    days[date] = {
      date,
      words,
      goal,
      ...(typeof entry?.completedAt === 'string' ? { completedAt: entry.completedAt } : {}),
    };
  }
  return { days };
}

export function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function getContributionDays(history, endDate = new Date(), count = 28) {
  const days = normalizeHistory(history).days || {};
  return Array.from({ length: count }, (_, index) => {
    const date = toDateKey(addDays(endDate, index - count + 1));
    return days[date] || { date, words: 0, goal: 2000 };
  });
}

export function calculateWritingStreak(history, endDate = new Date()) {
  const days = normalizeHistory(history).days || {};
  let streak = 0;
  let cursor = new Date(endDate);
  while (true) {
    const entry = days[toDateKey(cursor)];
    if (!entry || entry.words <= 0) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function calculateCompletedGoals(history, endDate = new Date(), count = 28) {
  return getContributionDays(history, endDate, count)
    .filter((day) => day.words >= clampGoal(day.goal, 2000))
    .length;
}

export function recordPositiveProgress(args) {
  const date = args.date || new Date();
  const key = toDateKey(date);
  const dailyGoal = clampGoal(args.dailyGoal);
  const normalized = normalizeHistory(args.history);
  const days = { ...normalized.days };
  const previousEntry = days[key] || { date: key, words: 0, goal: dailyGoal };
  const addedWords = Math.max(0, args.currentDocumentWords - args.previousDocumentWords);
  const nextWords = previousEntry.words + addedWords;
  const wasComplete = previousEntry.words >= dailyGoal;
  const isComplete = nextWords >= dailyGoal;

  days[key] = {
    ...previousEntry,
    date: key,
    words: nextWords,
    goal: dailyGoal,
    ...(isComplete && !previousEntry.completedAt ? { completedAt: date.toISOString() } : {}),
  };

  return {
    history: { days },
    addedWords,
    goalCompleted: !wasComplete && isComplete,
  };
}
