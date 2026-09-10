import { describe, expect, it } from 'vitest'
import { calcQuizPoints, hexToHslString } from '@/lib/utils'
import { coerceTrueFalseAnswer, normalizeTrueFalseValue } from '@/lib/quiz'
import { isEmailDeliverable } from '@/../api/_lib/mxCheck'

describe('calcQuizPoints', () => {
  it('returns max points when full time remains', () => {
    expect(calcQuizPoints(20_000, 20_000)).toBe(1000)
  })

  it('returns min points when no time remains', () => {
    expect(calcQuizPoints(0, 20_000)).toBe(100)
  })

  it('scales between min and max', () => {
    const half = calcQuizPoints(10_000, 20_000)
    expect(half).toBeGreaterThan(100)
    expect(half).toBeLessThan(1000)
  })
})

describe('hexToHslString', () => {
  it('converts valid hex color', () => {
    const hsl = hexToHslString('#6366f1')
    expect(hsl).toContain('%')
  })
})

describe('true_false helpers', () => {
  it('normalizes boolean aliases to canonical labels', () => {
    expect(normalizeTrueFalseValue('true')).toBe('Verdadeiro')
    expect(normalizeTrueFalseValue('falso')).toBe('Falso')
    expect(normalizeTrueFalseValue('v')).toBe('Verdadeiro')
  })

  it('coerces boolean answers to canonical output', () => {
    expect(coerceTrueFalseAnswer('verdadeiro')).toBe('Verdadeiro')
    expect(coerceTrueFalseAnswer('false')).toBe('Falso')
    expect(coerceTrueFalseAnswer('x')).toBe('Verdadeiro')
  })
})

describe('isEmailDeliverable', () => {
  it('rejects throwaway email domains', async () => {
    await expect(isEmailDeliverable('teste@mailinator.com')).resolves.toBe(false)
  })

  it('accepts a normal public domain', async () => {
    await expect(isEmailDeliverable('usuario@gmail.com')).resolves.toBe(true)
  })

  it('accepts test domains used by local e2e flows', async () => {
    await expect(isEmailDeliverable('e2e_tester@studycenter.test')).resolves.toBe(true)
  })
})
