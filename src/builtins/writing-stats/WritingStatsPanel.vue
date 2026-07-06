<template>
  <section class="writing-stats-panel" :class="{ celebrating }">
    <div class="today-block">
      <div class="today-copy">
        <span class="eyebrow">{{ p('panelToday') }}</span>
        <strong>{{ state.todayWords }}</strong>
        <span class="subline">
          {{ remaining <= 0 ? p('panelGoalReached') : p('panelGoalOpen', { remaining }) }}
        </span>
      </div>
      <div class="progress-summary">
        <span>{{ progressPercent }}%</span>
        <div class="progress-track">
          <i :style="{ width: progressWidth }" />
        </div>
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric-cell">
        <span>{{ p('panelCurrentDocument') }}</span>
        <strong>{{ state.currentWords }}</strong>
      </div>
      <div class="metric-cell">
        <span>{{ p('panelSession') }}</span>
        <strong>{{ state.sessionWords }}</strong>
      </div>
      <div class="metric-cell">
        <span>{{ p('panelStreak') }}</span>
        <strong>{{ state.streakDays }}</strong>
      </div>
      <div class="metric-cell">
        <span>{{ p('panelCompletedGoals') }}</span>
        <strong>{{ state.completedGoalsInWindow }}</strong>
      </div>
    </div>

    <div class="goal-editor">
      <span>{{ p('panelDailyGoal') }}</span>
      <label class="goal-pill" for="writing-goal-input">
        <input id="writing-goal-input" v-model="goalDraft" type="number" min="1" max="200000"
          @blur="commitGoal" @change="commitGoal" @keydown.enter.prevent="commitGoalAndBlur" />
        <em>{{ p('panelGoalUnit') }}</em>
      </label>
    </div>

    <div class="contribution-section">
      <div class="section-heading">
        <strong>{{ p('panelContribution') }}</strong>
        <span>{{ p('panelContributionHint') }}</span>
      </div>
      <div class="contribution-calendar">
        <div class="weekday-row">
          <span v-for="label in weekdayLabels" :key="label.key" class="weekday-label"
            :class="{ optional: label.optional }">
            {{ label.text }}
          </span>
        </div>
        <div class="contribution-grid">
          <div v-for="day in calendarDays" :key="day.date" class="contribution-day"
            :class="[`level-${getLevel(day.words, day.goal)}`, { today: day.date === state.currentDate }]"
            :title="getDayTitle(day)" />
        </div>
      </div>
    </div>

    <transition name="celebration">
      <div v-if="celebrating" class="celebration-card">
        <strong>{{ p('panelCelebrateTitle') }}</strong>
        <span>{{ p('panelCelebrateBody') }}</span>
      </div>
    </transition>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { setDailyGoal, writingStatsState as state } from './state'

const { t, locale } = useI18n()
const goalDraft = ref(String(state.dailyGoal))
const celebrating = ref(false)
let celebrationTimer = null

const remaining = computed(() => Math.max(0, state.dailyGoal - state.todayWords))
const progressRatio = computed(() => Math.min(1, state.todayWords / Math.max(1, state.dailyGoal)))
const progressPercent = computed(() => Math.round(progressRatio.value * 100))
const progressWidth = computed(() => `${progressPercent.value}%`)
const calendarDays = computed(() => state.contributionDays)
const weekdayFormatter = computed(() => new Intl.DateTimeFormat(
  locale.value?.startsWith('zh') ? 'zh-CN' : 'en-US',
  { weekday: 'short' },
))
const weekdayLabels = computed(() => {
  const firstWeek = calendarDays.value.slice(0, 7)
  return firstWeek.map((day, index) => ({
    key: `${day.date}-${index}`,
    text: weekdayFormatter.value.format(parseDateKey(day.date)),
    optional: index % 2 === 1,
  }))
})

watch(() => state.dailyGoal, (goal) => {
  goalDraft.value = String(goal)
})

watch(() => state.celebrationToken, (token) => {
  if (!token) return
  celebrating.value = true
  if (celebrationTimer) clearTimeout(celebrationTimer)
  celebrationTimer = setTimeout(() => {
    celebrating.value = false
  }, 2800)
})

onBeforeUnmount(() => {
  if (celebrationTimer) clearTimeout(celebrationTimer)
})

function p(key, params) {
  return t(`plugins.lamp-writing-stats.${key}`, params || {})
}

function commitGoal() {
  setDailyGoal(goalDraft.value)
  goalDraft.value = String(state.dailyGoal)
}

function commitGoalAndBlur(event) {
  commitGoal()
  event.currentTarget?.blur()
}

function getLevel(words, goal) {
  if (!words) return 0
  const ratio = words / Math.max(1, goal || state.dailyGoal)
  if (ratio >= 1) return 4
  if (ratio >= 0.66) return 3
  if (ratio >= 0.33) return 2
  return 1
}

function getDayTitle(day) {
  const words = day.words || 0
  return words > 0
    ? `${day.date} · ${p('panelWords', { count: words })}`
    : `${day.date} · ${p('panelEmptyDay')}`
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}
</script>

<style scoped>
.writing-stats-panel {
  --stats-soft: color-mix(in oklab, var(--muted) 72%, transparent);
  --stats-line: color-mix(in oklab, var(--border) 80%, transparent);
  --stats-cell: 9px;
  --stats-gap: 4px;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  overflow-y: auto;
  background: color-mix(in oklab, var(--background) 96%, var(--muted) 4%);
  color: var(--foreground);
}

.today-block {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 14px 12px 12px;
  border: 1px solid var(--stats-line);
  border-radius: 8px;
  background: var(--background);
}

.today-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.eyebrow,
.metric-cell span,
.section-heading span,
.goal-editor span {
  font-size: 11px;
  color: var(--muted-foreground);
}

.today-copy strong {
  font-size: 36px;
  line-height: 1;
  font-weight: 680;
  letter-spacing: 0;
}

.subline {
  color: var(--muted-foreground);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.progress-summary {
  width: 96px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.progress-summary span {
  min-width: 44px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--primary) 10%, var(--muted));
  font-size: 12px;
  font-weight: 700;
}

.progress-track {
  width: 96px;
  height: 4px;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in oklab, var(--muted) 82%, transparent);
}

.progress-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
  transition: width 260ms ease;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.metric-cell {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--stats-line);
  border-radius: 7px;
  background: var(--background);
}

.metric-cell strong {
  font-size: 20px;
  line-height: 1;
}

.goal-editor {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--stats-line);
  border-radius: 7px;
  background: var(--background);
}

.goal-pill {
  display: inline-grid;
  grid-template-columns: minmax(56px, 74px) auto;
  align-items: center;
  height: 30px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: color-mix(in oklab, var(--muted) 50%, transparent);
  overflow: hidden;
}

.goal-pill input {
  min-width: 0;
  width: 100%;
  height: 100%;
  padding: 0 4px 0 12px;
  border: 0;
  background: transparent;
  color: var(--foreground);
  font-size: 13px;
  text-align: right;
  outline: none;
}

.goal-pill em {
  padding: 0 10px 0 4px;
  color: var(--muted-foreground);
  font-size: 12px;
  font-style: normal;
}

.contribution-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--stats-line);
  border-radius: 7px;
  background: var(--background);
  container-type: inline-size;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.section-heading strong {
  font-size: 13px;
}

.contribution-calendar {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--stats-gap);
}

.weekday-label {
  min-width: 0;
  color: var(--muted-foreground);
  font-size: 9px;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
}

.contribution-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--stats-gap);
}

.contribution-day {
  width: var(--stats-cell);
  height: var(--stats-cell);
  justify-self: center;
  border-radius: 3px;
  border: 1px solid color-mix(in oklab, var(--border) 75%, transparent);
  background: color-mix(in oklab, var(--muted) 78%, transparent);
}

.contribution-day.today {
  outline: 1px solid color-mix(in oklab, var(--foreground) 45%, transparent);
  outline-offset: 1px;
}

.level-1 {
  background: color-mix(in oklab, var(--primary) 22%, var(--muted));
}

.level-2 {
  background: color-mix(in oklab, var(--primary) 42%, var(--muted));
}

.level-3 {
  background: color-mix(in oklab, var(--primary) 66%, var(--muted));
}

.level-4 {
  background: var(--primary);
}

.celebration-card {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in oklab, var(--primary) 55%, var(--border));
  background: color-mix(in oklab, var(--background) 72%, var(--primary) 28%);
  box-shadow: 0 14px 35px color-mix(in oklab, var(--primary) 22%, transparent);
}

.celebration-card strong {
  font-size: 14px;
}

.celebration-card span {
  font-size: 12px;
  color: var(--muted-foreground);
}

.celebrating .progress-summary span {
  animation: ring-pop 650ms ease-out;
}

.celebration-enter-active,
.celebration-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}

.celebration-enter-from,
.celebration-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@keyframes ring-pop {
  0% {
    transform: scale(0.94);
  }
  55% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
  }
}

@container (max-width: 300px) {
  .weekday-label.optional {
    visibility: hidden;
  }
}
</style>
