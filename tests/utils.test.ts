import { describe, expect, it } from 'vitest'
import { calcQuizPoints, hexToHslString } from '@/lib/utils'
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

describe('isEmailDeliverable', () => {
  it('rejects throwaway email domains', async () => {
    await expect(isEmailDeliverable('teste@mailinator.com')).resolves.toBe(false)
  })

  it('accepts a normal public domain', async () => {
    await expect(isEmailDeliverable('usuario@gmail.com')).resolves.toBe(true)
  })
})
