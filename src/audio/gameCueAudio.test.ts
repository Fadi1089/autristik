import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const audio = vi.hoisted(() => {
  const nodes: {
    connect: ReturnType<typeof vi.fn>
    disconnect: ReturnType<typeof vi.fn>
    start: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
    onended: null | (() => void)
    buffer: unknown
  }[] = []
  const gains: {
    gain: { value: number }
    connect: ReturnType<typeof vi.fn>
    disconnect: ReturnType<typeof vi.fn>
  }[] = []
  const ctx = {
    state: 'running',
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    createBufferSource: () => {
      const node = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null as null | (() => void),
        buffer: null as unknown,
      }
      nodes.push(node)
      return node
    },
    createGain: () => {
      const node = { gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() }
      gains.push(node)
      return node
    },
  }
  return { nodes, gains, ctx, load: vi.fn() }
})
vi.mock('./engine', () => ({ audioContext: () => audio.ctx, loadBuffer: audio.load }))
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  audio.nodes.length = 0
  audio.gains.length = 0
  audio.load.mockResolvedValue({})
})
afterEach(async () => {
  ;(await import('./gameCueAudio')).stopGameCues()
})

describe('game alert playback lifecycle', () => {
  it('uses independent volume, disconnects finished audio and replaces rapid stale alerts', async () => {
    const cues = await import('./gameCueAudio')
    await cues.playGameCue('cue-supply', 0.3)
    expect(audio.gains[0]!.gain.value).toBe(0.3)
    await cues.playGameCue('cue-supply', 0.3)
    expect(audio.nodes[0]!.stop).toHaveBeenCalledOnce()
    audio.nodes[0]!.onended!()
    expect(audio.nodes[0]!.disconnect).toHaveBeenCalledOnce()
    expect(audio.gains[0]!.disconnect).toHaveBeenCalledOnce()
    cues.stopGameCues()
    expect(audio.nodes[1]!.stop).toHaveBeenCalledOnce()
  })

  it('cancels pending audio on pause/restart/unmount and does not start muted cues', async () => {
    const cues = await import('./gameCueAudio')
    let resolve!: (buffer: unknown) => void
    audio.load.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const pending = cues.playGameCue('cue-record', 0.35)
    await Promise.resolve()
    cues.stopGameCues()
    resolve({})
    expect(await pending).toBe(false)
    expect(audio.nodes).toHaveLength(0)
    await cues.playGameCue('cue-game-over', 0)
    expect(audio.nodes).toHaveLength(0)
  })
})
