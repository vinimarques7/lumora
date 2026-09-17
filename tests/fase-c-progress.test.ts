import { describe, expect, it } from 'vitest'
import { calculateProgressSummary, computeDailyHistory, computeStreak } from '../api/_lib/progress'

describe('calculateProgressSummary', () => {
  it('counts attempts, correct answers and overall accuracy', () => {
    const summary = calculateProgressSummary([
      { correct: true },
      { correct: true },
      { correct: false },
      { correct: true },
      { correct: false },
    ])

    expect(summary.total).toBe(5)
    expect(summary.correct).toBe(3)
    expect(summary.incorrect).toBe(2)
    expect(summary.accuracy).toBe(60)
  })
})

describe('computeDailyHistory', () => {
  it('aggregates attempts by day for the last 7 days', () => {
    const history = computeDailyHistory([
      { date: '2026-09-15', correct: 2, incorrect: 1 },
      { date: '2026-09-16', correct: 1, incorrect: 0 },
      { date: '2026-09-17', correct: 0, incorrect: 2 },
    ])

    expect(history).toHaveLength(3)
    expect(history[0].accuracy).toBe(67)
    expect(history[2].accuracy).toBe(0)
  })
})

describe('computeStreak', () => {
  it('counts consecutive active days from the latest date', () => {
    const streak = computeStreak([
      { date: '2026-09-14', correct: 1, incorrect: 0 },
      { date: '2026-09-15', correct: 0, incorrect: 1 },
      { date: '2026-09-16', correct: 3, incorrect: 0 },
    ])

    expect(streak).toBe(3)
  })
})
