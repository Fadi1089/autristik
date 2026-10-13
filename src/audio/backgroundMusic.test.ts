import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const audio = vi.hoisted(() => {
  const node = { connect: vi.fn(), disconnect: vi.fn() }
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
    createMediaElementSource: vi.fn(() => node),
    createGain: vi.fn(() => gain),
  }
  return { node, gain, ctx, context: vi.fn(() => ctx), play: vi.fn().mockResolvedValue(undefined) }
})
vi.mock('./engine', () => ({ audioContext: audio.context }))
const players: Stream[] = []
class Stream {
  readonly src: string
  volume = 1
  loop = false
  preload = ''
  play = vi.fn(() => audio.play())
  pause = vi.fn()
  removeAttribute = vi.fn()
  load = vi.fn()
  constructor(src: string) {
    this.src = src
    players.push(this)
  }
}
const preferences = { track: 'music-menu' as const, enabled: true, volume: 0.18, visible: true }
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  audio.play.mockReset().mockResolvedValue(undefined)
  players.length = 0
  vi.stubGlobal('Audio', Stream)
})
afterEach(async () => {
  ;(await import('./backgroundMusic')).stopBackgroundMusic()
  vi.unstubAllGlobals()
})

describe('streaming background music lifecycle', () => {
  it('recovers from blocked autoplay on the next real input without waiting on an AudioContext', async () => {
    audio.play.mockRejectedValueOnce(new DOMException('Autoplay blocked', 'NotAllowedError'))
    const music = await import('./backgroundMusic')
    expect(await music.updateBackgroundMusic(preferences)).toBe(false)
    expect(players[0]!.pause).toHaveBeenCalledOnce()
    expect(await music.unlockBackgroundMusic(preferences)).toBe(true)
    expect(players[1]!.play).toHaveBeenCalledOnce()
    expect(audio.context).not.toHaveBeenCalled()
  })
  it('starts without a gesture and keeps one looping voice through repeated inputs', async () => {
    const music = await import('./backgroundMusic')
    await music.updateBackgroundMusic(preferences)
    expect(players).toHaveLength(1)
    await Promise.all([
      music.unlockBackgroundMusic(preferences),
      music.unlockBackgroundMusic(preferences),
    ])
    await music.updateBackgroundMusic({ ...preferences, volume: 0.3 })
    expect(players).toHaveLength(1)
    expect(players[0]!.src).toMatch(/audio\/menu-jazz\.mp3$/)
    expect(players[0]!.loop).toBe(true)
    expect(players[0]!.play).toHaveBeenCalledOnce()
    expect(players[0]!.volume).toBe(0.3)
  })
  it('mutes a hidden tab and returns without restarting the music', async () => {
    const music = await import('./backgroundMusic')
    await music.unlockBackgroundMusic(preferences)
    await music.updateBackgroundMusic({ ...preferences, visible: false })
    expect(players[0]!.volume).toBe(0)
    await music.updateBackgroundMusic({ ...preferences, enabled: false })
    await music.updateBackgroundMusic(preferences)
    expect(players[0]!.play).toHaveBeenCalledOnce()
    expect(players[0]!.pause).not.toHaveBeenCalled()
    music.stopBackgroundMusic()
    expect(players[0]!.pause).toHaveBeenCalledOnce()
    expect(players[0]!.removeAttribute).toHaveBeenCalledWith('src')
    expect(players[0]!.load).toHaveBeenCalledOnce()
  })
  it('changes tracks between home and game, retaining the player within the same context', async () => {
    const music = await import('./backgroundMusic')
    await music.unlockBackgroundMusic(preferences)
    const game = { ...preferences, track: 'music-game' as const }
    await music.updateBackgroundMusic(game)
    expect(players[0]!.pause).toHaveBeenCalledOnce()
    expect(players[1]!.src).toMatch(/audio\/game-flute\.mp3$/)
    await music.updateBackgroundMusic(game)
    await music.updateBackgroundMusic({ ...game, volume: 0.2 })
    expect(players).toHaveLength(2)
    expect(players[1]!.play).toHaveBeenCalledOnce()
    expect(players[1]!.pause).not.toHaveBeenCalled()
    await music.updateBackgroundMusic(preferences)
    expect(players).toHaveLength(3)
    expect(players[1]!.pause).toHaveBeenCalledOnce()
    expect(players[2]!.src).toMatch(/audio\/menu-jazz\.mp3$/)
  })
  it('keeps a muted loading stream silent and resumes it without creating another player', async () => {
    let resolve!: () => void
    audio.play.mockReturnValueOnce(
      new Promise<void>((done) => {
        resolve = done
      }),
    )
    const music = await import('./backgroundMusic')
    const pending = music.unlockBackgroundMusic(preferences)
    await Promise.resolve()
    await music.updateBackgroundMusic({ ...preferences, enabled: false })
    expect(players[0]!.volume).toBe(0)
    resolve()
    await pending
    await music.updateBackgroundMusic(preferences)
    expect(players).toHaveLength(1)
    expect(players[0]!.play).toHaveBeenCalledOnce()
  })
  it('ignores an obsolete playback failure after changing tracks', async () => {
    let reject!: (error: Error) => void
    audio.play.mockReturnValueOnce(
      new Promise((_done, fail) => {
        reject = fail
      }),
    )
    const music = await import('./backgroundMusic')
    const pending = music.unlockBackgroundMusic(preferences)
    await Promise.resolve()
    await music.updateBackgroundMusic({ ...preferences, track: 'music-game' })
    reject(new Error('old menu playback aborted'))
    await pending
    expect(players[0]!.pause).toHaveBeenCalledOnce()
    expect(players[1]!.pause).not.toHaveBeenCalled()
    expect(players[1]!.volume).toBe(0.18)
  })
  it('cancels pending playback on unmount and can retry a playback failure', async () => {
    let resolve!: () => void
    audio.play.mockReturnValueOnce(
      new Promise<void>((done) => {
        resolve = done
      }),
    )
    const music = await import('./backgroundMusic')
    const pending = music.unlockBackgroundMusic(preferences)
    await Promise.resolve()
    music.stopBackgroundMusic()
    resolve()
    await pending
    expect(players[0]!.pause).toHaveBeenCalledOnce()
    audio.play.mockRejectedValueOnce(new Error('unavailable'))
    expect(await music.unlockBackgroundMusic(preferences)).toBe(false)
    expect(await music.unlockBackgroundMusic(preferences)).toBe(true)
    expect(players).toHaveLength(3)
  })
})
