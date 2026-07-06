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
      <div class="progress-ring" :style="{ '--progress': progressDegrees }">
        <span>{{ progressPercent }}%</span>
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

    <form class="goal-editor" @submit.prevent="applyGoal">
      <label for="writing-goal-input">{{ p('panelDailyGoal') }}</label>
      <div class="goal-control">
        <input id="writing-goal-input" v-model="goalDraft" type="number" min="1" max="200000" />
        <button type="submit">{{ p('panelApplyGoal') }}</button>
      </div>
    </form>

    <div class="contribution-section">
      <div class="section-heading">
        <strong>{{ p('panelContribution') }}</strong>
        <span>{{ p('panelContributionHint') }}</span>
      </div>
      <div class="contribution-grid">
        <div v-for="day in state.contributionDays" :key="day.date" class="contribution-day"
          :class="`level-${getLevel(day.words, day.goal)}`" :title="getDayTitle(day)" />
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

const { t } = useI18n()
const goalDraft = ref(String(state.dailyGoal))
const celebrating = ref(false)
let celebrationTimer = null

const remaining = computed(() => Math.max(0, state.dailyGoal - state.todayWords))
const progressRatio = computed(() => Math.min(1, state.todayWords / Math.max(1, state.dailyGoal)))
const progressPercent = computed(() => Math.round(progressRatio.value * 100))
const progressDegrees = computed(() => `${Math.round(progressRatio.value * 360)}deg`)

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

function applyGoal() {
  setDailyGoal(goalDraft.value)
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
</script>

<style scoped>
.writing-stats-panel {
  --stats-soft: color-mix(in oklab, var(--muted) 72%, transparent);
  --stats-line: color-mix(in oklab, var(--border) 80%, transparent);
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  overflow-y: auto;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--background) 92%, var(--primary) 8%), var(--background) 34%),
    var(--background);
  color: var(--foreground);
}

.today-block {
  display: grid;
  grid-template-columns: 1fr 88px;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--stats-line);
  border-radius: 8px;
  background: color-mix(in oklab, var(--background) 82%, var(--muted) 18%);
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
.goal-editor label {
  font-size: 11px;
  color: var(--muted-foreground);
}

.today-copy strong {
  font-size: 34px;
  line-height: 1;
  font-weight: 750;
}

.subline {
  color: var(--muted-foreground);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.progress-ring {
  width: 78px;
  height: 78px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background:
    conic-gradient(var(--primary) var(--progress), color-mix(in oklab, var(--muted) 86%, transparent) 0),
    var(--muted);
  position: relative;
}

.progress-ring::after {
  content: '';
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: var(--background);
}

.progress-ring span {
  position: relative;
  z-index: 1;
  font-size: 13px;
  font-weight: 700;
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
  gap: 5px;
  padding: 10px;
  border: 1px solid var(--stats-line);
  border-radius: 7px;
  background: var(--stats-soft);
}

.metric-cell strong {
  font-size: 20px;
  line-height: 1;
}

.goal-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--stats-line);
  border-radius: 7px;
  background: color-mix(in oklab, var(--background) 84%, var(--muted) 16%);
}

.goal-control {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.goal-control input {
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--background);
  color: var(--foreground);
}

.goal-control button {
  height: 30px;
  padding: 0 10px;
  border: 1px solid color-mix(in oklab, var(--primary) 50%, var(--border));
  border-radius: 5px;
  background: color-mix(in oklab, var(--primary) 16%, transparent);
  color: var(--foreground);
  cursor: pointer;
}

.contribution-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--stats-line);
  border-radius: 7px;
  background: var(--stats-soft);
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

.contribution-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}

.contribution-day {
  aspect-ratio: 1;
  min-width: 0;
  border-radius: 3px;
  border: 1px solid color-mix(in oklab, var(--border) 75%, transparent);
  background: color-mix(in oklab, var(--muted) 78%, transparent);
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

.celebrating .progress-ring {
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
</style>
