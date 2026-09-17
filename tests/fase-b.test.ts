import { describe, expect, it } from 'vitest'
import { shouldPromptBeforeDiscard } from '@/lib/utils'

describe('shouldPromptBeforeDiscard', () => {
  it('returns true when the form contains unsaved changes', () => {
    expect(shouldPromptBeforeDiscard({ name: 'Bio' }, { name: '' })).toBe(true)
  })

  it('returns false when the form is empty or unchanged', () => {
    expect(shouldPromptBeforeDiscard({ name: '' }, { name: '' })).toBe(false)
    expect(shouldPromptBeforeDiscard({ name: 'Geo' }, { name: 'Geo' })).toBe(false)
  })
})
