import { create } from 'zustand'
import type { Coord, Direction } from '../game/coords'
import {
  advanceFalling,
  changeFallDirection,
  createFallingGame,
  hardDrop,
  laneAxis,
  moveFalling,
  moveInDirection,
  tickFallingGame,
} from '../game/falling'
import type { FallingGameState } from '../game/falling'
import { isGameOver, rotateCurrent, swapCurrent } from '../game/game'
import type { Difficulty } from '../game/levels'
import { DEFAULT_GAME_MODE } from '../game/modes'
import type { GameMode } from '../game/modes'
import type { GameVariant } from '../game/variants'
import { bestScore, useRecordsStore } from './recordsStore'

export interface CameraFollow {
  readonly axis: 'q' | 'r'
  readonly value: number
}

export interface GameStore extends FallingGameState {
  /** Changes only when a new run starts, including first Play with the same seed. */
  readonly runId: number
  /** Snapshot for comparing this run with the record before it began. */
  readonly bestAtStart: number | null
  readonly menuOpen: boolean
  readonly started: boolean
  /** Pending choice only affects the next new game, never the game being resumed. */
  readonly nextDifficulty: Difficulty
  setNextDifficulty(difficulty: Difficulty): void
  readonly gameSeed: number
  readonly nextMode: GameMode
  setNextMode(mode: GameMode): void
  readonly nextVariant: GameVariant
  setNextVariant(variant: GameVariant): void
  /** Only successful manual lateral inputs create a camera request. */
  readonly cameraFollow: CameraFollow | null
  readonly cameraMove: number
  moveSideways(turns: -1 | 1): void
  selectLane(lane: number): void
  selectPosition(position: Coord): void
  move(direction: Direction): void
  setFallDirection(direction: Direction): void
  advance(): void
  drop(): void
  rotate(turns: number): void
  swapTiles(): void
  restart(seed?: number, difficulty?: Difficulty, mode?: GameMode, variant?: GameVariant): void
  openMenu(): void
  closeMenu(): void
  toggleMenu(): void
  returnToMainMenu(): void
  tick(seconds: number): void
}

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32)
}

function initialSeed(): number {
  const param = new URLSearchParams(window.location.search).get('seed')
  const seed = param === null ? NaN : Number(param)
  return Number.isFinite(seed) ? seed : randomSeed()
}

function withCameraRequest(state: GameStore, next: FallingGameState): Partial<GameStore> {
  const axis = laneAxis(next.fallDirection)
  // Forward steps, locks and new pieces must never be mistaken for a lateral input.
  if (
    next === state ||
    next.board !== state.board ||
    (next.fallDirection === state.fallDirection && next.falling?.[axis] === state.falling?.[axis])
  )
    return next
  return {
    ...next,
    cameraFollow: { axis, value: next.falling![axis] },
    cameraMove: state.cameraMove + 1,
  }
}

/** Apply menu choices on first Play while preserving the URL seed and ordinary island. */
function firstGameSettings(state: GameStore): Partial<GameStore> {
  if (state.started) return {}
  if (state.mode === state.nextMode && state.variant === state.nextVariant)
    return {
      difficulty: state.nextDifficulty,
      bestAtStart: bestScore(state.nextMode, state.nextVariant),
    }
  return {
    ...createFallingGame(
      state.gameSeed,
      undefined,
      state.nextDifficulty,
      state.nextMode,
      state.nextVariant,
    ),
    cameraFollow: null,
    cameraMove: 0,
    bestAtStart: bestScore(state.nextMode, state.nextVariant),
  }
}

const startSeed = initialSeed()

export const useGameStore = create<GameStore>()((set, get) => ({
  ...createFallingGame(startSeed),
  runId: 0,
  bestAtStart: bestScore(DEFAULT_GAME_MODE, 'standard'),
  gameSeed: startSeed,
  menuOpen: true,
  started: false,
  nextDifficulty: 'easy',
  setNextDifficulty: (nextDifficulty) => set({ nextDifficulty }),
  nextMode: DEFAULT_GAME_MODE,
  setNextMode: (nextMode) => set({ nextMode }),
  nextVariant: 'standard',
  setNextVariant: (nextVariant) => set({ nextVariant }),
  cameraFollow: null,
  cameraMove: 0,

  selectLane: (lane) => set((s) => (s.menuOpen ? s : withCameraRequest(s, moveFalling(s, lane)))),
  selectPosition: (position) => {
    const s = get()
    s.selectLane(position[laneAxis(s.fallDirection)])
  },
  moveSideways: (turns) => {
    const s = get()
    if (s.falling) s.selectLane(s.falling[laneAxis(s.fallDirection)] + turns)
  },
  move: (direction) =>
    set((s) => (s.menuOpen ? s : withCameraRequest(s, moveInDirection(s, direction)))),
  setFallDirection: (direction) => set((s) => (s.menuOpen ? s : changeFallDirection(s, direction))),
  advance: () => set((s) => (s.menuOpen ? s : advanceFalling(s))),
  drop: () => set((s) => (s.menuOpen ? s : hardDrop(s))),
  rotate: (turns) =>
    set((s) => (s.menuOpen || isGameOver(s) ? s : { rotation: rotateCurrent(s, turns).rotation })),
  swapTiles: () => set((s) => (s.menuOpen || isGameOver(s) ? s : swapCurrent(s))),
  restart: (
    seed = randomSeed(),
    difficulty = get().nextDifficulty,
    mode = get().nextMode,
    variant = get().nextVariant,
  ) =>
    set({
      ...createFallingGame(seed, undefined, difficulty, mode, variant),
      runId: get().runId + 1,
      bestAtStart: bestScore(mode, variant),
      gameSeed: seed,
      nextDifficulty: difficulty,
      nextMode: mode,
      nextVariant: variant,
      cameraFollow: null,
      cameraMove: 0,
      menuOpen: false,
      started: true,
    }),
  returnToMainMenu: () => {
    const state = get()
    const seed = initialSeed()
    set({
      ...createFallingGame(
        seed,
        undefined,
        state.nextDifficulty,
        state.nextMode,
        state.nextVariant,
      ),
      gameSeed: seed,
      bestAtStart: bestScore(state.nextMode, state.nextVariant),
      menuOpen: true,
      started: false,
      cameraFollow: null,
      cameraMove: 0,
    })
  },
  openMenu: () => set({ menuOpen: true }),
  closeMenu: () =>
    set((s) => ({
      ...firstGameSettings(s),
      runId: s.started ? s.runId : s.runId + 1,
      menuOpen: false,
      started: true,
    })),
  toggleMenu: () =>
    set((s) => ({
      ...firstGameSettings(s),
      runId: s.started ? s.runId : s.runId + 1,
      menuOpen: !s.menuOpen,
      started: true,
    })),
  tick: (seconds) => set((s) => (s.menuOpen || isGameOver(s) ? s : tickFallingGame(s, seconds))),
}))

// Save improvements as they occur, so restarting or closing the tab does not lose a best score.
useGameStore.subscribe((next, previous) => {
  if (next.started && (next.score > previous.score || (!isGameOver(previous) && isGameOver(next))))
    useRecordsStore.getState().recordScore(next.mode, next.variant, next.score)
})

if (import.meta.env.DEV) {
  ;(window as unknown as { gameStore: typeof useGameStore }).gameStore = useGameStore
}
