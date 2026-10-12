import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
    currentTime: 12,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    createBufferSource: vi.fn(() => voice),
    createGain: vi.fn(() => gain),
  }
  return { voice, gain, ctx, context: vi.fn(() => ctx), load: vi.fn() }
})
vi.mock('./engine', () => ({ audioContext: audio.context, loadBuffer: audio.load }))
vi.mock('./musicLoop', () => ({ seamlessLoop: (_ctx: unknown, buffer: unknown) => buffer }))
const preferences = { enabled: true, volume: 0.18, visible: true }

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  audio.load.mockResolvedValue({})
  audio.voice.loop = false
})
afterEach(async () => {
  ;(await import('./backgroundMusic')).stopBackgroundMusic()
})

describe('background music lifecycle', () => {
  it('waits for a gesture and creates only one native looping voice during repeated input', async () => {
    const music = await import('./backgroundMusic')
    await music.updateBackgroundMusic(preferences)
    expect(audio.load).not.toHaveBeenCalled()
    await Promise.all([
      music.unlockBackgroundMusic(preferences),
      music.unlockBackgroundMusic(preferences),
    ])
    await music.updateBackgroundMusic({ ...preferences, volume: 0.3 })
    expect(audio.load).toHaveBeenCalledOnce()
    expect(audio.voice.loop).toBe(true)
    expect(audio.voice.start).toHaveBeenCalledOnce()
    expect(audio.gain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.3, 12, 0.12)
  })

  it('fades out for mute or a hidden tab and returns without restarting the music', async () => {
    const music = await import('./backgroundMusic')
    await music.unlockBackgroundMusic(preferences)
    await music.updateBackgroundMusic({ ...preferences, visible: false })
    expect(audio.gain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 12, 0.12)
    await music.updateBackgroundMusic(preferences)
    await music.updateBackgroundMusic({ ...preferences, enabled: false })
    expect(audio.gain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 12, 0.12)
    await music.updateBackgroundMusic(preferences)
    expect(audio.voice.start).toHaveBeenCalledOnce()
    music.stopBackgroundMusic()
    expect(audio.voice.stop).toHaveBeenCalledOnce()
    expect(audio.voice.disconnect).toHaveBeenCalledOnce()
  })

  it('does not start a track disabled while it is downloading', async () => {
    let resolve!: (buffer: object) => void
    audio.load.mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    const music = await import('./backgroundMusic')
    const pending = music.unlockBackgroundMusic(preferences)
    await Promise.resolve()
    await music.updateBackgroundMusic({ ...preferences, enabled: false })
    resolve({})
    expect(await pending).toBe(true)
    expect(audio.voice.start).not.toHaveBeenCalled()
  })

  it('cancels a pending start when the app unmounts and retries network failures', async () => {
    const music = await import('./backgroundMusic')
    let resolve!: (buffer: object) => void
    audio.load.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const pending = music.unlockBackgroundMusic(preferences)
    await Promise.resolve()
    music.stopBackgroundMusic()
    resolve({})
    await pending
    expect(audio.voice.start).not.toHaveBeenCalled()
    audio.load.mockRejectedValueOnce(new Error('offline'))
    expect(await music.unlockBackgroundMusic(preferences)).toBe(false)
    expect(await music.unlockBackgroundMusic(preferences)).toBe(true)
    expect(audio.voice.start).toHaveBeenCalledOnce()
  })
})
