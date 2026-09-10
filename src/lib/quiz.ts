export type CardKind = 'standard' | 'true_false'

export function normalizeTrueFalseValue(value?: string | null): 'Verdadeiro' | 'Falso' | null {
  const normalized = value?.trim().toLowerCase()

  if (normalized === 'true' || normalized === 'verdadeiro' || normalized === 'v') return 'Verdadeiro'
  if (normalized === 'false' || normalized === 'falso' || normalized === 'f') return 'Falso'

  return null
}

export function coerceTrueFalseAnswer(value?: string | null, fallback: 'Verdadeiro' | 'Falso' = 'Verdadeiro'): 'Verdadeiro' | 'Falso' {
  return normalizeTrueFalseValue(value) ?? fallback
}

export function getTrueFalseOptions(): Array<'Verdadeiro' | 'Falso'> {
  return ['Verdadeiro', 'Falso']
}

export function getCardAnswerLabel(card: { answer?: string | null; cardType?: CardKind | null }): string {
  const explicit = normalizeTrueFalseValue(card.answer)
  if (card.cardType === 'true_false') return explicit ?? 'Verdadeiro'
  return card.answer ?? ''
}

export function buildQuizOptions(card: { id?: string; answer?: string | null; cardType?: CardKind | null }, allCards: Array<{ id: string; answer?: string | null; cardType?: CardKind | null }>): string[] {
  if (card.cardType === 'true_false' || normalizeTrueFalseValue(card.answer)) {
    return getTrueFalseOptions()
  }

  const distractors = allCards
    .filter((c) => card.id == null || c.id !== card.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((c) => c.answer ?? '')
    .filter(Boolean)

  return [...distractors, card.answer ?? ''].filter(Boolean).sort(() => Math.random() - 0.5)
}
