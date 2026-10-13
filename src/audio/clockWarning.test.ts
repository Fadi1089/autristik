import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { synthesizeClockTick } from './clockTick'

const audio = vi.hoisted(() => {
  const voice = {
    loop: false,
    buffer: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
  const gain = {
    gain: { value: 0, setTargetAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }
  const ctx = {
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    createBufferSource: vi.fn(() => voice),
    createGain: vi.fn(() => gain),
  }
  return { voice, gain, ctx, context: vi.fn(() => ctx), load: vi.fn() }
})
vi.mock('./engine', () => ({ audioContext: audio.context, loadBuffer: audio.load }))
const preferences = { active: true, enabled: true, volume: 0.25, visible: true }

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  audio.load.mockResolvedValue({})
  audio.voice.loop = false
})
afterEach(async () => {
  ;(await import('./clockWarning')).stopClockWarning()
})

describe('low-time watch warning', () => {
  it('runs only in active Time-attack with 0 < time ≤ 15 seconds', async () => {
    const { clockWarningActive } = await import('./clockWarning')
    const state = {
      variant: 'time-attack' as const,
      current: ['grass', 'grass', 'grass', 'grass'] as const,
      timeRemaining: 15,
      started: true,
      menuOpen: false,
    }
    expect(clockWarningActive(state)).toBe(true)
    expect(clockWarningActive({ ...state, timeRemaining: 0.1 })).toBe(true)
    for (const override of [
      { timeRemaining: 15.01 },
      { timeRemaining: 0 },
      { timeRemaining: null },
      { variant: 'standard' as const },
      { menuOpen: true },
      { started: false },
      { current: null },
    ])
      expect(clockWarningActive({ ...state, ...override })).toBe(false)
  })

  it('waits for input, then runs one looping voice across repeated timer and volume updates', async () => {
    const clock = await import('./clockWarning')
    await clock.updateClockWarning(preferences)
    expect(audio.voice.start).not.toHaveBeenCalled()
    await Promise.all([
      clock.unlockClockWarning(preferences),
      clock.unlockClockWarning(preferences),
    ])
    for (let i = 0; i < 50; i++) await clock.updateClockWarning(preferences)
    await clock.updateClockWarning({ ...preferences, volume: 0.4 })
    expect(audio.load).toHaveBeenCalledOnce()
    expect(audio.load).toHaveBeenCalledWith(audio.ctx, 'clock-tick')
    expect(audio.voice.loop).toBe(true)
    expect(audio.voice.start).toHaveBeenCalledOnce()
    expect(audio.gain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.4, 0, 0.015)
  })

  it('primes browser audio on input before the low-time threshold, with no music required', async () => {
    const clock = await import('./clockWarning')
    await clock.unlockClockWarning({ ...preferences, active: false })
    expect(audio.ctx.resume).toHaveBeenCalled()
    expect(audio.voice.start).not.toHaveBeenCalled()
    await clock.updateClockWarning(preferences)
    expect(audio.voice.start).toHaveBeenCalledOnce()
  })

  it.each([{ active: false }, { visible: false }, { enabled: false }, { volume: 0 }])(
    'stops and disconnects the loop for %j, then resumes with one new voice',
    async (override) => {
      const clock = await import('./clockWarning')
      await clock.unlockClockWarning(preferences)
      await clock.updateClockWarning({ ...preferences, ...override })
      expect(audio.voice.stop).toHaveBeenCalledOnce()
      expect(audio.voice.disconnect).toHaveBeenCalledOnce()
      expect(audio.gain.disconnect).toHaveBeenCalledOnce()
      await clock.updateClockWarning(preferences)
      expect(audio.voice.start).toHaveBeenCalledTimes(2)
    },
  )

  it('cancels a pending start when a time bonus or unmount removes the warning', async () => {
    let resolve!: (buffer: object) => void
    audio.load.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const clock = await import('./clockWarning')
    const pending = clock.unlockClockWarning(preferences)
    await Promise.resolve()
    await clock.updateClockWarning({ ...preferences, active: false })
    resolve({})
    await pending
    expect(audio.voice.start).not.toHaveBeenCalled()
    await clock.updateClockWarning(preferences)
    clock.stopClockWarning()
    await clock.updateClockWarning(preferences)
    expect(audio.voice.start).toHaveBeenCalledOnce()
  })

  it('retries failed audio initialization without affecting the countdown', async () => {
    const clock = await import('./clockWarning')
    audio.load.mockRejectedValueOnce(new Error('unavailable'))
    expect(await clock.unlockClockWarning(preferences)).toBe(false)
    expect(await clock.updateClockWarning(preferences)).toBe(true)
    expect(audio.voice.start).toHaveBeenCalledOnce()
  })
})

describe('original ticking sound', () => {
  it.each([22050, 48000])(
    'has two short alternating ticks per 0.5-second loop at %s Hz',
    (rate) => {
      const samples = synthesizeClockTick(rate)
      expect(samples.length / rate).toBeCloseTo(0.5)
      expect(samples[0]).toBe(0)
      expect(samples.at(-1)).toBe(0)
      expect(samples.every((value) => Number.isFinite(value) && Math.abs(value) < 1)).toBe(true)
      expect(samples.some((value) => Math.abs(value) > 0.1)).toBe(true)
      for (const at of [0.15, 0.45]) expect(samples[Math.floor(at * rate)]).toBe(0)
      expect(samples).toEqual(synthesizeClockTick(rate))
    },
  )
})
