import { describe, expect, it } from 'vitest'
import { getCardFormDefaults } from '../src/lib/cardForm'

describe('getCardFormDefaults', () => {
  it('returns empty values when no card is passed', () => {
    expect(getCardFormDefaults()).toEqual({
      question: '',
      answer: '',
      explanation: '',
      analogy: '',
      imageUrl: '',
      difficulty: 'medium',
    })
  })

  it('uses the selected card values and keeps the form consistent for editing', () => {
    const card = {
      id: 'card-1',
      deckId: 'deck-1',
      authorId: 'user-1',
      question: 'Pergunta do card',
      answer: 'Resposta do card',
      explanation: 'Explicação',
      analogy: 'Analogia',
      imageUrl: 'https://example.com/card.png',
      difficulty: 'hard' as const,
      position: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    expect(getCardFormDefaults(card)).toEqual({
      question: 'Pergunta do card',
      answer: 'Resposta do card',
      explanation: 'Explicação',
      analogy: 'Analogia',
      imageUrl: 'https://example.com/card.png',
      difficulty: 'hard',
    })
  })
})
