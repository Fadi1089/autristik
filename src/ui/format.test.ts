import { describe, expect, it } from 'vitest'
import { formatDuration, formatPoints } from './format'

describe('elapsed time formatting', () => {
  it.each([
    [0, '0:00'],
    [9.9, '0:09'],
    [60, '1:00'],
    [3599, '59:59'],
    [3600, '1:00:00'],
    [3661, '1:01:01'],
    [-1, '0:00'],
    [NaN, '0:00'],
  ] as const)('formats %s seconds as %s', (seconds, result) =>
    expect(formatDuration(seconds)).toBe(result),
  )
})
describe('combo score formatting', () => {
  it('preserves quarter steps and fractional points without trailing zeroes', () => {
    expect(formatPoints(1)).toBe('1')
    expect(formatPoints(1.25)).toBe('1,25')
    expect(formatPoints(1.5)).toBe('1,5')
    expect(formatPoints(17.5)).toBe('17,5')
    expect(formatPoints(3)).toBe('3')
  })
})
