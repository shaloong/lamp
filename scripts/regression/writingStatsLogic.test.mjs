import test from 'node:test'
import assert from 'node:assert/strict'
import {
  countWritingUnits,
  getContributionDays,
  recordPositiveProgress,
} from '../../src/builtins/writing-stats/logic.js'

test('counts CJK characters and Latin words as writing units', async () => {
  assert.equal(countWritingUnits('今天 wrote two words'), 5)
  assert.equal(countWritingUnits('alpha beta\n第三章'), 5)
})

test('records only positive net progress and keeps deletes from subtracting the day', async () => {
  const date = new Date('2026-07-06T10:00:00')

  const first = recordPositiveProgress({
    history: { days: {} },
    date,
    previousDocumentWords: 10,
    currentDocumentWords: 25,
    dailyGoal: 100,
  })
  assert.equal(first.addedWords, 15)
  assert.equal(first.history.days['2026-07-06'].words, 15)

  const afterDelete = recordPositiveProgress({
    history: first.history,
    date,
    previousDocumentWords: 25,
    currentDocumentWords: 12,
    dailyGoal: 100,
  })
  assert.equal(afterDelete.addedWords, 0)
  assert.equal(afterDelete.history.days['2026-07-06'].words, 15)
})

test('marks goal completion exactly when progress crosses the daily goal', async () => {
  const date = new Date('2026-07-06T21:30:00')

  const result = recordPositiveProgress({
    history: { days: { '2026-07-06': { date: '2026-07-06', words: 95, goal: 100 } } },
    date,
    previousDocumentWords: 1000,
    currentDocumentWords: 1008,
    dailyGoal: 100,
  })

  assert.equal(result.addedWords, 8)
  assert.equal(result.goalCompleted, true)
  assert.equal(result.history.days['2026-07-06'].words, 103)
  assert.equal(typeof result.history.days['2026-07-06'].completedAt, 'string')
})

test('builds a fixed contribution window ending on the requested day', async () => {
  const days = getContributionDays(
    { days: { '2026-07-05': { date: '2026-07-05', words: 300, goal: 500 } } },
    new Date('2026-07-06T08:00:00'),
    3,
  )

  assert.deepEqual(days.map((day) => day.date), ['2026-07-04', '2026-07-05', '2026-07-06'])
  assert.equal(days[1].words, 300)
  assert.equal(days[0].words, 0)
})
