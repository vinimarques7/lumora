export type AttemptRecord = {
  correct: boolean
}

export function summarizeAttempts(attempts: AttemptRecord[]) {
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
