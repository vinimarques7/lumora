import { describe, expect, it } from 'vitest'
import { summarizeAttempts } from '../api/_lib/attempts'

describe('summarizeAttempts', () => {
  it('counts correct and incorrect answers and computes accuracy', () => {
    const summary = summarizeAttempts([
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

  it('returns zeros when attempts is empty', () => {
    expect(summarizeAttempts([])).toEqual({
      total: 0,
      correct: 0,
      incorrect: 0,
      accuracy: 0,
    })
  })
})
