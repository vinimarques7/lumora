import { describe, expect, it } from 'vitest'
import { groupDecksByMaleta } from '@/lib/utils'

describe('groupDecksByMaleta', () => {
  it('groups decks under the selected maleta and keeps unassigned decks in a fallback bucket', () => {
    const decks = [
      { id: '1', name: 'Algoritmos', maletaId: 'm1' },
      { id: '2', name: 'Estruturas', maletaId: 'm1' },
      { id: '3', name: 'História', maletaId: null },
    ]

    const maletas = [
      { id: 'm1', name: 'Computação' },
      { id: 'm2', name: 'Humanas' },
    ]

    expect(groupDecksByMaleta(decks, maletas)).toEqual([
      { maletaId: 'm1', name: 'Computação', count: 2 },
      { maletaId: 'm2', name: 'Humanas', count: 0 },
      { maletaId: null, name: 'Sem maleta', count: 1 },
    ])
  })
})
