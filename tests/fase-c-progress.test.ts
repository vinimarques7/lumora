import { describe, expect, it } from 'vitest'
import { calculateProgressSummary, computeDailyHistory, computeStreak, buildDailyProgressFromAttempts } from '../api/_lib/progress'
import { rankCardsForReview } from '../api/_lib/recommendations'

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
describe('buildDailyProgressFromAttempts', () => {
  it('groups raw attempts into accurate daily totals', () => {
    const history = buildDailyProgressFromAttempts([
      { correct: true, createdAt: '2025-01-01T10:00:00.000Z' },
      { correct: false, createdAt: '2025-01-01T12:00:00.000Z' },
      { correct: true, createdAt: '2025-01-02T15:00:00.000Z' },
      { correct: true, createdAt: '2025-01-03T08:00:00.000Z' },
      { correct: false, createdAt: '2025-01-03T09:00:00.000Z' },
    ])

    expect(history).toEqual([
      { date: '2025-01-01', correct: 1, incorrect: 1 },
      { date: '2025-01-02', correct: 1, incorrect: 0 },
      { date: '2025-01-03', correct: 1, incorrect: 1 },
    ])
  })
})

describe('rankCardsForReview', () => {
  it('prioritizes cards with more errors and fewer attempts', () => {
    const ranked = rankCardsForReview([
      { id: 'a', difficulty: 'easy', attempts: [{ correct: true }, { correct: true }, { correct: true }] },
      { id: 'b', difficulty: 'hard', attempts: [{ correct: false }, { correct: false }, { correct: true }] },
      { id: 'c', difficulty: 'medium', attempts: [{ correct: true }] },
      { id: 'd', difficulty: 'easy', attempts: [] },
    ])

    expect(ranked.map((card) => card.id)).toEqual(['b', 'd', 'c', 'a'])
  })
})
