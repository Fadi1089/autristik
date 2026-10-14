import { describe, expect, it } from 'vitest'
import { BASE_FALL_INTERVAL, DIFFICULTIES, fallInterval, MIN_FALL_INTERVAL } from './levels'

describe('level gravity curve', () => {
  it('starts each difficulty at its requested pace without skipping score levels', () => {
    expect(fallInterval(1, 'easy') * 10).toBe(15)
    expect(fallInterval(1, 'medium') * 10).toBe(10)
    expect(fallInterval(1, 'hard') * 10).toBe(7.5)
    expect(fallInterval(1, 'insane') * 10).toBe(5)
    expect(fallInterval(2, 'medium')).toBeLessThan(fallInterval(1, 'medium'))
    expect(fallInterval(2, 'hard')).toBeLessThan(fallInterval(1, 'hard'))
  })

  it.each(DIFFICULTIES)('never falls below the 5-second minimum in %s', (difficulty) => {
    for (const level of [1, 2, 10, 30, 100, 1000]) {
      expect(fallInterval(level, difficulty) * 10).toBeGreaterThanOrEqual(5)
    }
  })

  it('keeps the initial pace and increases speed gently at every playable level', () => {
    expect(fallInterval(1)).toBe(BASE_FALL_INTERVAL)
    for (let level = 1; level < 60; level++) {
      const current = fallInterval(level)
      const next = fallInterval(level + 1)
      expect(next).toBeLessThan(current)
      expect(next).toBeGreaterThanOrEqual(MIN_FALL_INTERVAL)
      expect(next / current).toBeGreaterThan(0.9)
    }
  })

  it('keeps at least 5 seconds for a ten-step approach at high levels', () => {
    expect(fallInterval(1000)).toBeGreaterThanOrEqual(MIN_FALL_INTERVAL)
    expect(fallInterval(1000) * 10).toBeCloseTo(5)
    expect(fallInterval(5) * 10).toBeCloseTo(12.481, 2)
    expect(fallInterval(10) * 10).toBeCloseTo(10.204, 2)
    expect(fallInterval(20) * 10).toBeCloseTo(7.519, 2)
  })
})
