import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { changeFallDirection, FALL_INTERVAL, spawnFalling } from '../game/falling'
import { Direction } from '../game/coords'
import { screenToWorldDirection } from '../input/movement'
import type { useGameStore as Store } from './gameStore'
import { musicTrackForGame } from '../audio/musicTracks'

let useGameStore: typeof Store

beforeAll(async () => {
  vi.stubGlobal('window', { location: { search: '?seed=42' } })
  useGameStore = (await import('./gameStore')).useGameStore
})
afterAll(() => vi.unstubAllGlobals())
beforeEach(() => useGameStore.getState().restart(42, 'easy', 'superblock', 'standard'))

describe('gamemode selection', () => {
  it('returns to a fresh home screen with jazz, keeping pending choices and saved records', async () => {
    const { useRecordsStore } = await import('./recordsStore')
    useRecordsStore.setState({ records: {} })
    useGameStore.setState({ score: 150, levelScore: 30, combo: 2 })
    useGameStore.getState().tick(5)
    useGameStore.getState().openMenu()
    expect(musicTrackForGame(useGameStore.getState())).toBe('music-game')
    useGameStore.getState().setNextMode('classic')
    useGameStore.getState().setNextVariant('time-attack')
    useGameStore.getState().setNextDifficulty('hard')
    const id = useGameStore.getState().runId
    const records = useRecordsStore.getState().records
    useGameStore.getState().returnToMainMenu()
    expect(useGameStore.getState()).toMatchObject({
      started: false,
      menuOpen: true,
      score: 0,
      level: 1,
      playedSeconds: 0,
      remaining: 30,
      timeRemaining: 45,
      placements: 0,
      combo: 0,
      mode: 'classic',
      variant: 'time-attack',
      difficulty: 'hard',
      runId: id,
    })
    expect(musicTrackForGame(useGameStore.getState())).toBe('music-menu')
    expect(useRecordsStore.getState().records).toEqual(records)
    useGameStore.getState().tick(60)
    expect(useGameStore.getState().playedSeconds).toBe(0)
    useGameStore.getState().closeMenu()
    expect(useGameStore.getState().runId).toBe(id + 1)
    expect(musicTrackForGame(useGameStore.getState())).toBe('music-game')
  })
  it('requests a fresh starting camera once per run, including a restart with the same seed', () => {
    const id = useGameStore.getState().runId
    useGameStore.getState().restart(42)
    expect(useGameStore.getState().runId).toBe(id + 1)
    useGameStore.getState().openMenu()
    useGameStore.getState().closeMenu()
    expect(useGameStore.getState().runId).toBe(id + 1)
    useGameStore.setState({ started: false, menuOpen: true })
    useGameStore.getState().closeMenu()
    expect(useGameStore.getState().runId).toBe(id + 2)
  })

  it.each(['closeMenu', 'toggleMenu'] as const)(
    'starts a chosen Time-attack with %s and the original board and seed',
    (action) => {
      const board = useGameStore.getState().board
      useGameStore.setState({ started: false, menuOpen: true })
      useGameStore.getState().setNextVariant('time-attack')
      useGameStore.getState().setNextMode('classic')
      useGameStore.getState()[action]()
      expect(useGameStore.getState()).toMatchObject({
        variant: 'time-attack',
        mode: 'classic',
        timeRemaining: 45,
        remaining: 30,
        gameSeed: 42,
      })
      expect(useGameStore.getState().board).toEqual(board)
    },
  )

  it('pauses the countdown and applies pending format choices only on the next game', () => {
    useGameStore.getState().restart(42, 'hard', 'superblock', 'time-attack')
    useGameStore.getState().tick(5)
    useGameStore.getState().openMenu()
    const paused = useGameStore.getState()
    paused.tick(100)
    paused.drop()
    paused.swapTiles()
    expect(useGameStore.getState()).toBe(paused)
    paused.setNextVariant('standard')
    paused.closeMenu()
    useGameStore.getState().tick(1)
    expect(useGameStore.getState()).toMatchObject({
      variant: 'time-attack',
      timeRemaining: 39,
      playedSeconds: 6,
    })
    useGameStore.getState().restart(42)
    expect(useGameStore.getState()).toMatchObject({
      variant: 'standard',
      timeRemaining: null,
      remaining: 30,
      playedSeconds: 0,
    })
    useGameStore.getState().setNextVariant('time-attack')
    useGameStore.getState().restart(42)
    useGameStore.getState().tick(100)
    expect(useGameStore.getState().timeRemaining).toBe(0)
    const ended = useGameStore.getState()
    ended.tick(1)
    ended.drop()
    ended.swapTiles()
    expect(useGameStore.getState()).toBe(ended)
    ended.restart(42)
    expect(useGameStore.getState()).toMatchObject({
      timeRemaining: 45,
      playedSeconds: 0,
      queued: null,
    })
  })

  it.each(['closeMenu', 'toggleMenu'] as const)(
    'starts the selected classic mode with %s, keeping the original seed and chosen difficulty',
    (action) => {
      const before = useGameStore.getState()
      useGameStore.setState({ started: false, menuOpen: true })
      useGameStore.getState().setNextMode('classic')
      useGameStore.getState().setNextDifficulty('hard')
      useGameStore.getState()[action]()
      const after = useGameStore.getState()
      expect(after).toMatchObject({
        started: true,
        menuOpen: false,
        gameSeed: 42,
        mode: 'classic',
        difficulty: 'hard',
        currentMultiplier: 1,
        placements: 0,
        playedSeconds: 0,
      })
      expect(after.board).toEqual(before.board)
      after.drop()
      expect(useGameStore.getState().mode).toBe('classic')
      expect(useGameStore.getState().currentMultiplier).toBe(1)
    },
  )

  it('prepares classic during pause without modifying the active Superblock game, then applies it on restart', () => {
    useGameStore.getState().tick(0.3)
    useGameStore.getState().openMenu()
    const paused = useGameStore.getState()
    useGameStore.getState().setNextMode('classic')
    useGameStore.getState().closeMenu()
    expect(useGameStore.getState()).toMatchObject({
      mode: 'superblock',
      nextMode: 'classic',
      currentMultiplier: paused.currentMultiplier,
      fallElapsed: 0.3,
      playedSeconds: 0.3,
    })
    expect(useGameStore.getState().board).toBe(paused.board)
    expect(useGameStore.getState().current).toBe(paused.current)
    useGameStore.getState().restart(42)
    expect(useGameStore.getState()).toMatchObject({
      mode: 'classic',
      currentMultiplier: 1,
      placements: 0,
      playedSeconds: 0,
      combo: 0,
      remaining: 30,
    })
    useGameStore.getState().openMenu()
    useGameStore.getState().setNextMode('superblock')
    useGameStore.getState().restart(42)
    expect(useGameStore.getState()).toMatchObject({ mode: 'superblock', nextMode: 'superblock' })
  })
})

describe('elapsed time and new-game difficulty', () => {
  it('counts only active play and resets on restarting', () => {
    useGameStore.getState().tick(2.3)
    useGameStore.getState().openMenu()
    useGameStore.getState().tick(60)
    expect(useGameStore.getState().playedSeconds).toBeCloseTo(2.3)
    useGameStore.getState().closeMenu()
    useGameStore.getState().tick(0.7)
    expect(useGameStore.getState().playedSeconds).toBeCloseTo(3)
    useGameStore.getState().restart(42)
    expect(useGameStore.getState().playedSeconds).toBe(0)
  })

  it('keeps a paused game difficulty and applies the pending choice on a new game', () => {
    useGameStore.getState().tick(0.3)
    useGameStore.getState().openMenu()
    useGameStore.getState().setNextDifficulty('insane')
    useGameStore.getState().closeMenu()
    expect(useGameStore.getState().difficulty).toBe('easy')
    useGameStore.getState().tick(0.2)
    expect(useGameStore.getState().falling).toEqual({ q: 0, r: -11 })
    useGameStore.getState().restart(42)
    expect(useGameStore.getState()).toMatchObject({
      difficulty: 'insane',
      nextDifficulty: 'insane',
      level: 1,
      remaining: 30,
      playedSeconds: 0,
    })
    useGameStore.getState().tick(0.5)
    expect(useGameStore.getState().falling).toEqual({ q: 0, r: -10 })
  })

  it.each(['closeMenu', 'toggleMenu'] as const)(
    'applies the first Play choice with %s without regenerating the board',
    (action) => {
      useGameStore.setState({ started: false, menuOpen: true })
      const board = useGameStore.getState().board
      const current = useGameStore.getState().current
      useGameStore.getState().setNextDifficulty('hard')
      useGameStore.getState().tick(30)
      expect(useGameStore.getState().playedSeconds).toBe(0)
      useGameStore.getState()[action]()
      expect(useGameStore.getState()).toMatchObject({
        started: true,
        menuOpen: false,
        difficulty: 'hard',
        level: 1,
      })
      expect(useGameStore.getState().board).toBe(board)
      expect(useGameStore.getState().current).toBe(current)
    },
  )

  it('freezes the clock after the game ends', () => {
    useGameStore.setState({ remaining: 1 })
    useGameStore.getState().tick(100)
    expect(useGameStore.getState().playedSeconds).toBeCloseTo(15)
    useGameStore.getState().tick(100)
    expect(useGameStore.getState().playedSeconds).toBeCloseTo(15)
  })
})

describe('falling controls and camera requests', () => {
  it.each(['classic', 'superblock'] as const)(
    'keeps the cadence, resources and camera during unlimited exchanges in %s',
    (mode) => {
      useGameStore.getState().restart(42, 'insane', mode)
      useGameStore.getState().tick(0.4)
      const before = useGameStore.getState()
      for (let i = 0; i < 100; i++) useGameStore.getState().swapTiles()
      expect(useGameStore.getState()).toMatchObject({
        current: before.current,
        fallElapsed: before.fallElapsed,
        falling: before.falling,
        cameraMove: before.cameraMove,
        cameraFollow: before.cameraFollow,
        remaining: before.remaining,
        playedSeconds: before.playedSeconds,
        placements: before.placements,
        combo: before.combo,
        score: before.score,
      })
      useGameStore.getState().tick(0.11)
      expect(useGameStore.getState().falling!.r).toBe(before.falling!.r + 1)
      useGameStore.getState().openMenu()
      const paused = useGameStore.getState()
      paused.swapTiles()
      expect(useGameStore.getState()).toBe(paused)
      paused.restart(42)
      expect(useGameStore.getState().queued).toBeNull()
      useGameStore.setState({ remaining: 1 })
      const last = useGameStore.getState()
      last.swapTiles()
      expect(useGameStore.getState()).toBe(last)
    },
  )

  it('clears the selected island when restarting', () => {
    useGameStore.getState().setFallDirection(Direction.North)
    expect(useGameStore.getState().fallAnchor).toBeDefined()
    useGameStore.getState().restart(42)
    expect(useGameStore.getState().fallAnchor).toBeUndefined()
    expect(useGameStore.getState().falling).toEqual({ q: 0, r: -11 })
  })
  it('retains the combo during movement, rotation and pauses, then clears it on restart', () => {
    useGameStore.setState({ combo: 6 })
    useGameStore.getState().moveSideways(1)
    useGameStore.getState().rotate(1)
    useGameStore.getState().tick(0.3)
    useGameStore.getState().openMenu()
    useGameStore.getState().tick(10)
    expect(useGameStore.getState().combo).toBe(6)
    useGameStore.getState().restart(42)
    expect(useGameStore.getState().combo).toBe(0)
  })
  it('leaves the camera request unchanged during gravity, locking and spawning', () => {
    useGameStore.getState().moveSideways(1)
    const { cameraMove, cameraFollow } = useGameStore.getState()
    useGameStore.getState().tick(FALL_INTERVAL * 12)
    expect(useGameStore.getState()).toMatchObject({ cameraMove, cameraFollow })
    expect(useGameStore.getState().lastPlacement).not.toBeNull()
  })

  it('requests camera movement for every successful manual move, including after a respawn', () => {
    useGameStore.getState().moveSideways(1)
    useGameStore.getState().tick(FALL_INTERVAL * 11)
    expect(useGameStore.getState().falling?.q).toBe(1)
    useGameStore.getState().moveSideways(-1)
    expect(useGameStore.getState()).toMatchObject({
      cameraMove: 2,
      cameraFollow: { axis: 'q', value: 0 },
    })
    useGameStore.getState().moveSideways(1)
    useGameStore.getState().moveSideways(1) // turns automatically around the right edge
    expect(useGameStore.getState()).toMatchObject({
      cameraMove: 4,
      fallDirection: Direction.West,
      cameraFollow: { axis: 'r', value: -1 },
    })
  })

  it('pauses gravity, the cadence remainder and controls with the menu', () => {
    useGameStore.getState().tick(0.3)
    useGameStore.getState().openMenu()
    const paused = useGameStore.getState()
    paused.tick(5)
    paused.moveSideways(1)
    paused.rotate(1)
    paused.advance()
    paused.drop()
    expect(useGameStore.getState()).toBe(paused)
    paused.closeMenu()
    useGameStore.getState().tick(FALL_INTERVAL - 0.3)
    expect(useGameStore.getState().falling).toEqual({ q: 0, r: -10 })
  })

  it('keeps the camera unchanged during manual forward steps and hard drops', () => {
    useGameStore.getState().advance()
    useGameStore.getState().drop()
    expect(useGameStore.getState()).toMatchObject({ cameraMove: 0, cameraFollow: null })
  })

  it('changes gravity without moving the camera or restarting the cadence, and respects pause', () => {
    useGameStore.getState().moveSideways(1)
    useGameStore.getState().tick(FALL_INTERVAL * 5 + 0.3)
    const before = useGameStore.getState()
    before.setFallDirection(Direction.North)
    const changed = useGameStore.getState()
    expect(changed).toMatchObject({
      fallDirection: Direction.North,
      falling: { q: 1, r: 5 },
      fallElapsed: before.fallElapsed,
      combo: before.combo,
      cameraMove: before.cameraMove,
      cameraFollow: before.cameraFollow,
    })
    expect(changed.board).toBe(before.board)
    changed.openMenu()
    const paused = useGameStore.getState()
    paused.setFallDirection(Direction.East)
    expect(useGameStore.getState()).toBe(paused)
  })

  it('follows the row for horizontal gravity, only on lateral movement', () => {
    useGameStore.setState({
      fallDirection: Direction.West,
      falling: spawnFalling(useGameStore.getState().board, Direction.West),
    })
    useGameStore.getState().move(Direction.North)
    expect(useGameStore.getState()).toMatchObject({
      cameraMove: 1,
      cameraFollow: { axis: 'r', value: -1 },
    })
    const request = useGameStore.getState().cameraFollow
    useGameStore.getState().move(Direction.West)
    expect(useGameStore.getState().cameraFollow).toBe(request)
    useGameStore.getState().drop()
    expect(useGameStore.getState().cameraFollow).toBe(request)
  })

  it.each([0, Math.PI / 2, Math.PI, -Math.PI / 2])(
    'maps camera-relative keys before applying gravity at azimuth %s',
    (azimuth) => {
      const towards = screenToWorldDirection('down', azimuth)
      useGameStore.setState(changeFallDirection(useGameStore.getState(), towards))
      const before = useGameStore.getState().falling!
      useGameStore.getState().move(screenToWorldDirection('down', azimuth))
      const after = useGameStore.getState().falling!
      expect(Math.abs(after.q - before.q) + Math.abs(after.r - before.r)).toBe(1)
      expect(useGameStore.getState().cameraMove).toBe(0)
      useGameStore.getState().move(screenToWorldDirection('left', azimuth))
      expect(useGameStore.getState().cameraMove).toBe(1)
    },
  )
})
