export type ReviewCard = {
  id: string
  difficulty: 'easy' | 'medium' | 'hard'
  attempts: Array<{ correct: boolean }>
}

export function rankCardsForReview(cards: ReviewCard[]) {
  const difficultyWeight = {
    easy: 1,
    medium: 2,
    hard: 3,
  } as const

  return [...cards]
    .map((card) => {
      const totalAttempts = card.attempts.length
      const incorrect = card.attempts.filter((attempt) => !attempt.correct).length
      const correct = totalAttempts - incorrect
      const recencyPenalty = totalAttempts === 0 ? 1 : 0.5
      const score =
        incorrect * 5 +
        difficultyWeight[card.difficulty] * 2 +
        (totalAttempts === 0 ? 8 : 0) +
        (correct === 0 && totalAttempts > 0 ? 3 : 0) +
        recencyPenalty

      return { ...card, score }
    })
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...card }) => card)
}
