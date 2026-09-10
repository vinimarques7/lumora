import type { Card } from '@/lib/api'

export interface CardFormData {
  question: string
  answer: string
  explanation: string
  analogy: string
  imageUrl: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export function getCardFormDefaults(card?: Partial<Card>): CardFormData {
  return {
    question: card?.question ?? '',
    answer: card?.answer ?? '',
    explanation: card?.explanation ?? '',
    analogy: card?.analogy ?? '',
    imageUrl: card?.imageUrl ?? '',
    difficulty: card?.difficulty ?? 'medium',
  }
}
