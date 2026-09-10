import type { Card } from '@/lib/api'

export type CardFormType = 'standard' | 'true_false'

export interface CardFormData {
  question: string
  answer: string
  explanation: string
  analogy: string
  imageUrl: string
  difficulty: 'easy' | 'medium' | 'hard'
  cardType: CardFormType
}

export function getCardFormDefaults(card?: Partial<Card>): CardFormData {
  const normalizedAnswer = card?.cardType === 'true_false'
    ? (card.answer ? (card.answer.toLowerCase() === 'true' || card.answer.toLowerCase() === 'verdadeiro' || card.answer.toLowerCase() === 'v' ? 'Verdadeiro' : 'Falso') : 'Verdadeiro')
    : (card?.answer ?? '')

  return {
    question: card?.question ?? '',
    answer: normalizedAnswer,
    explanation: card?.explanation ?? '',
    analogy: card?.analogy ?? '',
    imageUrl: card?.imageUrl ?? '',
    difficulty: card?.difficulty ?? 'medium',
    cardType: card?.cardType ?? 'standard',
  }
}
