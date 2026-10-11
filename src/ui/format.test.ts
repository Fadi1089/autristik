import { describe, expect, it } from 'vitest'
import { formatPoints } from './format'
describe('combo score formatting', () => {
  it('preserves quarter steps and fractional points without trailing zeroes', () => {
    expect(formatPoints(1)).toBe('1')
    expect(formatPoints(1.25)).toBe('1,25')
    expect(formatPoints(1.5)).toBe('1,5')
    expect(formatPoints(17.5)).toBe('17,5')
    expect(formatPoints(3)).toBe('3')
  })
})
