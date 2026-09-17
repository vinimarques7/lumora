export type ProgressAttempt = {
  correct: boolean
  createdAt?: string | Date
}

export type DailyProgress = {
  date: string
  correct: number
  incorrect: number
  accuracy: number
}

export function calculateProgressSummary(attempts: ProgressAttempt[]) {
  const total = attempts.length
  const correct = attempts.filter((attempt) => attempt.correct).length
  const incorrect = total - correct
  const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100)

  return {
    total,
    correct,
    incorrect,
    accuracy,
  }
}

export function buildDailyProgressFromAttempts(attempts: ProgressAttempt[]) {
  const grouped = new Map<string, { correct: number; incorrect: number }>()

  for (const attempt of attempts) {
    const iso = attempt.createdAt ? new Date(attempt.createdAt).toISOString() : null
    if (!iso) continue

    const date = iso.slice(0, 10)
    const current = grouped.get(date) ?? { correct: 0, incorrect: 0 }

    if (attempt.correct) {
      current.correct += 1
    } else {
      current.incorrect += 1
    }

    grouped.set(date, current)
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date,
      ...values,
    }))
}

export function computeDailyHistory(entries: Array<{ date: string; correct: number; incorrect: number }>): DailyProgress[] {
  return entries.map((entry) => ({
    ...entry,
    accuracy: entry.correct + entry.incorrect === 0 ? 0 : Math.round((entry.correct / (entry.correct + entry.incorrect)) * 100),
  }))
}

export function computeStreak(entries: Array<{ date: string; correct: number; incorrect: number }>): number {
  if (entries.length === 0) return 0

  const uniqueDates = [...new Set(entries.map((entry) => entry.date))].sort((a, b) => a.localeCompare(b))
  let streak = 0

  for (let i = uniqueDates.length - 1; i >= 0; i--) {
    const date = uniqueDates[i]
    const item = entries.find((entry) => entry.date === date)
    if (!item) continue

    if (item.correct > 0 || item.incorrect > 0) {
      streak += 1
    } else {
      break
    }
  }

  return streak
}
