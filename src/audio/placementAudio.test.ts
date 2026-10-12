import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function source() {
  return {
    playbackRate: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as (() => void) | null,
  }
}

const sources: ReturnType<typeof source>[] = []
const gain = {
  gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
  disconnect: vi.fn(),
}
const filter = {
  type: '',
  frequency: { value: 0 },
  Q: { value: 0 },
  connect: vi.fn(),
  disconnect: vi.fn(),
}
const ctx = {
  state: 'running',
  currentTime: 10,
  sampleRate: 48000,
  createBuffer: vi.fn((_channels: number, length: number, sampleRate: number) => {
    const data = new Float32Array(length)
    return { duration: length / sampleRate, getChannelData: () => data }
  }),
  resume: vi.fn().mockResolvedValue(undefined),
  decodeAudioData: vi.fn().mockResolvedValue({ duration: 0.1 }),
  destination: {},
  createBufferSource: vi.fn(() => {
    const node = source()
    sources.push(node)
    return node
  }),
  createGain: vi.fn(() => gain),
  createBiquadFilter: vi.fn(() => filter),
}
const fetchClip = vi.fn()

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  sources.length = 0
  fetchClip.mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) })
  vi.stubGlobal('fetch', fetchClip)
  vi.stubGlobal('window', {
    AudioContext: vi.fn(function () {
      return ctx
    }),
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('placement audio playback', () => {
  it('plays and caches special tile effects without fetching files, using the placement volume', async () => {
    const audio = await import('./placementAudio')
    expect(await audio.playPlacementSound('special-void', 0.4)).toBe(true)
    expect(await audio.playPlacementSound('special-void', 0.4)).toBe(true)
    expect(await audio.playPlacementSound('special-gold', 0.4)).toBe(true)
    expect(fetchClip).not.toHaveBeenCalled()
    expect(ctx.createBuffer).toHaveBeenCalledTimes(2)
    expect(sources).toHaveLength(3)
    expect(gain.gain.value).toBe(0.4)
  })
  it('unlocks audio, caches each local clip and gives repeated placements separate voices', async () => {
    const audio = await import('./placementAudio')
    expect(await audio.preparePlacementAudio('wood')).toBe(true)
    expect(await audio.playPlacementSound('wood', 0.35)).toBe(true)
    expect(await audio.playPlacementSound('wood', 0.35)).toBe(true)
    expect(fetchClip).toHaveBeenCalledTimes(1)
    expect(fetchClip).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}audio/wood.ogg`)
    expect(gain.gain.value).toBe(0.35)
    expect(ctx.createBiquadFilter).not.toHaveBeenCalled()
    expect(sources[0]!.playbackRate.value).toBe(1)
    expect(sources).toHaveLength(2)
    for (const node of sources) expect(node.start).toHaveBeenCalledOnce()
    sources[0]!.onended!()
    expect(sources[0]!.disconnect).toHaveBeenCalledOnce()
  })

  it('does not load or play anything when silent or muted', async () => {
    const audio = await import('./placementAudio')
    expect(await audio.playPlacementSound('none', 1)).toBe(true)
    expect(await audio.playPlacementSound('laser', 0)).toBe(true)
    expect(fetchClip).not.toHaveBeenCalled()
    expect(ctx.createBufferSource).not.toHaveBeenCalled()
  })

  it('handles unavailable audio and retries a failed download without crashing gameplay', async () => {
    const audio = await import('./placementAudio')
    fetchClip.mockResolvedValueOnce({ ok: false })
    expect(await audio.playPlacementSound('glass', 0.5)).toBe(false)
    expect(await audio.playPlacementSound('glass', 0.5)).toBe(true)
    expect(fetchClip).toHaveBeenCalledTimes(2)
    vi.stubGlobal('window', {})
    expect(await audio.playPlacementSound('steel', 0.5)).toBe(false)
  })

  it('limits simultaneous voices during rapid placements', async () => {
    const audio = await import('./placementAudio')
    for (let i = 0; i < 5; i++) await audio.playPlacementSound('button', 0.5)
    expect(sources[0]!.stop).toHaveBeenCalledOnce()
    expect(sources[4]!.start).toHaveBeenCalledOnce()
  })

  it('does not queue hover sounds before user interaction, then uses a separate local cue', async () => {
    const audio = await import('./placementAudio')
    const activation = { hasBeenActive: false }
    vi.stubGlobal('navigator', { userActivation: activation })
    expect(await audio.playMenuSound(0.25)).toBe(false)
    expect(fetchClip).not.toHaveBeenCalled()
    activation.hasBeenActive = true
    expect(await audio.playMenuSound(0.25)).toBe(true)
    expect(fetchClip).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}audio/menu-nav.ogg`)
    expect(gain.gain.value).toBe(0.25)
    expect(sources[0]!.playbackRate.value).toBeLessThan(1)
    expect(filter.type).toBe('lowpass')
    expect(filter.frequency.value).toBeLessThanOrEqual(1500)
    expect(sources[0]!.connect).toHaveBeenCalledWith(filter)
    expect(filter.connect).toHaveBeenCalledWith(gain)
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0, ctx.currentTime)
    expect(gain.gain.linearRampToValueAtTime.mock.calls[0]![0]).toBe(0.25)
    expect(gain.gain.linearRampToValueAtTime.mock.calls[1]![0]).toBe(0)
    sources[0]!.onended!()
    expect(filter.disconnect).toHaveBeenCalledOnce()
  })
})
