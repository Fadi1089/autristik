import { describe, expect, it } from 'vitest'
import { formatTime } from './format'

describe('formatTime', () => {
  it('shows minutes and zero-padded seconds', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(9.9)).toBe('0:09')
    expect(formatTime(75)).toBe('1:15')
  })

  it('adds hours past the hour mark', () => {
    expect(formatTime(3725)).toBe('1:02:05')
  })
})
