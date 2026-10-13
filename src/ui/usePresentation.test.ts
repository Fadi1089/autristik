import { afterEach, afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { useGameStore as Game } from '../store/gameStore'
import type { useSettingsStore as Settings } from '../store/settingsStore'
import { withTile } from '../game/board'
import { placeCurrent } from '../game/game'
import { RAINBOW_TILE } from '../game/tiles'

const audio = vi.hoisted(() => ({
  clockUpdate: vi.fn(),
  clockUnlock: vi.fn(),
  clockStop: vi.fn(),
  musicUpdate: vi.fn(),
  musicUnlock: vi.fn(),
  musicStop: vi.fn(),
  gameCue: vi.fn(),
  cuePrepare: vi.fn(),
  cueStop: vi.fn(),
  placement: vi.fn(),
}))
vi.mock('../audio/clockWarning', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../audio/clockWarning')>()),
  updateClockWarning: audio.clockUpdate,
  unlockClockWarning: audio.clockUnlock,
  stopClockWarning: audio.clockStop,
}))
vi.mock('../audio/backgroundMusic', () => ({
  updateBackgroundMusic: audio.musicUpdate,
  unlockBackgroundMusic: audio.musicUnlock,
  stopBackgroundMusic: audio.musicStop,
}))
vi.mock('../audio/placementAudio', () => ({
  playPlacementSound: audio.placement,
  preparePlacementAudio: vi.fn(),
}))
vi.mock('../audio/gameCueAudio', () => ({
  playGameCue: audio.gameCue,
  prepareGameCueAudio: audio.cuePrepare,
  stopGameCues: audio.cueStop,
}))
const cleanup: (() => void)[] = []
vi.mock('react', () => ({
  useEffect: (effect: () => (() => void) | void) => {
    const dispose = effect()
    if (dispose) cleanup.push(dispose)
  },
}))
vi.mock('../store/settingsStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/settingsStore')>()
  const store = actual.useSettingsStore
  return {
    ...actual,
    useSettingsStore: Object.assign(
      (select: (state: ReturnType<typeof store.getState>) => unknown) => select(store.getState()),
      store,
    ),
  }
})

let game: typeof Game
let settings: typeof Settings
let install: () => void
const input = new Map<string, () => void>()
const page = {
  documentElement: { dataset: {}, lang: 'en' },
  visibilityState: 'visible',
  addEventListener: (type: string, callback: () => void) => input.set(type, callback),
  removeEventListener: (type: string) => input.delete(type),
}

beforeAll(async () => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() })
  vi.stubGlobal('document', page)
  vi.stubGlobal('window', {
    location: { search: '?seed=42' },
    addEventListener: (type: string, callback: () => void) => input.set(type, callback),
    removeEventListener: (type: string) => input.delete(type),
  })
  game = (await import('../store/gameStore')).useGameStore
  settings = (await import('../store/settingsStore')).useSettingsStore
  install = (await import('./usePresentation')).usePresentation
})
beforeEach(() => {
  vi.clearAllMocks()
  page.visibilityState = 'visible'
  game.getState().restart(42, 'easy', 'classic', 'time-attack')
  settings.getState().setClockSoundEnabled(true)
  settings.getState().setClockSoundVolume(0.25)
  settings.getState().setFeedbackSoundEnabled(true)
  settings.getState().setFeedbackSoundVolume(0.35)
  settings.getState().setPlacementSoundEnabled(true)
  settings.getState().setSoundVolume(0.5)
  settings.getState().setPlacementSound('drop')
  install()
})
afterEach(() => {
  while (cleanup.length) cleanup.pop()!()
})
afterAll(() => vi.unstubAllGlobals())

describe('watch warning presentation wiring', () => {
  it('attempts the menu music on mount without waiting for an option click', () => {
    while (cleanup.length) cleanup.pop()!()
    game.setState({ started: false, menuOpen: true })
    audio.musicUpdate.mockClear()
    install()
    expect(audio.musicUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ track: 'music-menu' }),
    )
  })
  it('keeps the game track through pauses and restarts, switching only for the home menu', () => {
    input.get('keydown')!()
    expect(audio.musicUnlock).toHaveBeenLastCalledWith(
      expect.objectContaining({ track: 'music-game' }),
    )
    audio.musicUpdate.mockClear()
    game.getState().openMenu()
    game.getState().restart(42)
    game.getState().openMenu()
    game.getState().closeMenu()
    expect(audio.musicUpdate).not.toHaveBeenCalled()
    game.setState({ current: null, remaining: 0 })
    expect(audio.musicUpdate).not.toHaveBeenCalled()
    game.getState().openMenu()
    expect(audio.musicUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ track: 'music-menu' }),
    )
    game.getState().restart(42)
    expect(audio.musicUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ track: 'music-game' }),
    )
  })

  it('uses one mute and volume for all tiles while keeping their distinct sounds', () => {
    const grass = ['grass', 'grass', 'grass', 'grass'] as const
    game.getState().restart(42, 'easy', 'superblock')
    game.setState({
      board: withTile({}, { coord: { q: 0, r: 0 }, quadrants: grass, multiplier: 5 }),
      current: grass,
      currentMultiplier: 1,
    })
    audio.placement.mockClear()
    game.setState(placeCurrent(game.getState(), { q: 1, r: 0 }))
    expect(game.getState().lastPlacement?.tileMultiplier).toBe(5)
    expect(audio.placement).toHaveBeenLastCalledWith('drop', 0.5)

    settings.getState().setPlacementSoundEnabled(false)
    game.setState({ current: grass, currentMultiplier: 1 })
    audio.placement.mockClear()
    game.setState(placeCurrent(game.getState(), { q: 2, r: 0 }))
    expect(audio.placement).not.toHaveBeenCalled()
    settings.getState().setPlacementSound('none')
    game.setState({ current: RAINBOW_TILE, currentMultiplier: 1 })
    game.setState(placeCurrent(game.getState(), { q: 3, r: 0 }))
    expect(audio.placement).not.toHaveBeenCalled()
    settings.getState().setPlacementSoundEnabled(true)
    settings.getState().setSoundVolume(0.3)
    game.setState({ current: RAINBOW_TILE, currentMultiplier: 1 })
    game.setState(placeCurrent(game.getState(), { q: 4, r: 0 }))
    expect(audio.placement).toHaveBeenLastCalledWith('special-gold', 0.3)

    settings.getState().setPlacementSoundEnabled(false)
    game.setState({ current: RAINBOW_TILE, currentMultiplier: 5 })
    audio.placement.mockClear()
    game.setState(placeCurrent(game.getState(), { q: 5, r: 0 }))
    expect(audio.placement).not.toHaveBeenCalled()
    settings.getState().setPlacementSoundEnabled(true)
    settings.getState().setPlacementSound('drop')
    game.setState({ current: grass, currentMultiplier: 1 })
    game.setState(placeCurrent(game.getState(), { q: 6, r: 0 }))
    expect(audio.placement).toHaveBeenLastCalledWith('drop', 0.3)
  })

  it('plays distinct low-supply, record and end cues and respects feedback mute', () => {
    game.setState({ remaining: 6, bestAtStart: 100 })
    game.setState({ remaining: 5, placements: 1 })
    expect(audio.gameCue).toHaveBeenLastCalledWith('cue-supply', 0.35)
    game.setState({ score: 110 })
    expect(audio.gameCue).toHaveBeenCalledTimes(1)
    const count = audio.gameCue.mock.calls.length
    game.setState({ score: 120 })
    expect(audio.gameCue).toHaveBeenCalledTimes(count)
    game.setState({ current: null, remaining: 0 })
    expect(audio.gameCue).toHaveBeenLastCalledWith('cue-record', 0.35)
    game.getState().restart(42)
    settings.getState().setFeedbackSoundEnabled(false)
    audio.gameCue.mockClear()
    game.setState({ current: null, remaining: 0 })
    expect(audio.gameCue).not.toHaveBeenCalled()
    expect(audio.cueStop).toHaveBeenCalled()
  })

  it('reacts once at the threshold and stops for pause, level time bonuses and game over', () => {
    game.getState().tick(30)
    expect(audio.clockUpdate).toHaveBeenLastCalledWith({
      active: true,
      enabled: true,
      volume: 0.25,
      visible: true,
    })
    const count = audio.clockUpdate.mock.calls.length
    game.getState().tick(0.1)
    expect(audio.clockUpdate).toHaveBeenCalledTimes(count)
    game.getState().openMenu()
    expect(audio.clockUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ active: false }))
    game.getState().closeMenu()
    expect(audio.clockUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ active: true }))
    game.setState({ timeRemaining: 59.9 })
    expect(audio.clockUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ active: false }))
    game.setState({ timeRemaining: 15 })
    game.setState({ timeRemaining: 0, current: null, falling: null })
    expect(audio.clockUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ active: false }))
  })

  it('uses independent settings and input permission, and stops for a hidden page', () => {
    settings.getState().setMusicEnabled(false)
    game.getState().tick(30)
    input.get('keydown')!()
    expect(audio.clockUnlock).toHaveBeenCalledWith(
      expect.objectContaining({ active: true, enabled: true }),
    )
    settings.getState().setClockSoundEnabled(false)
    expect(audio.clockUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }))
    settings.getState().setClockSoundEnabled(true)
    settings.getState().setClockSoundVolume(0.1)
    expect(audio.clockUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ volume: 0.1 }))
    page.visibilityState = 'hidden'
    input.get('visibilitychange')!()
    expect(audio.clockUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }))
  })
})
