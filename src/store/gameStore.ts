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
import { isGameOver, rotateCurrent } from '../game/game'
import type { Difficulty } from '../game/levels'

export interface CameraFollow {
  readonly axis: 'q' | 'r'
  readonly value: number
}

export interface GameStore extends FallingGameState {
  readonly menuOpen: boolean
  readonly started: boolean
  /** Pending choice only affects the next new game, never the game being resumed. */
  readonly nextDifficulty: Difficulty
  setNextDifficulty(difficulty: Difficulty): void
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
  restart(seed?: number, difficulty?: Difficulty): void
  openMenu(): void
  closeMenu(): void
  toggleMenu(): void
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

export const useGameStore = create<GameStore>()((set, get) => ({
  ...createFallingGame(initialSeed()),
  menuOpen: true,
  started: false,
  nextDifficulty: 'easy',
  setNextDifficulty: (nextDifficulty) => set({ nextDifficulty }),
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
  restart: (seed = randomSeed(), difficulty = get().nextDifficulty) =>
    set({
      ...createFallingGame(seed, undefined, difficulty),
      nextDifficulty: difficulty,
      cameraFollow: null,
      cameraMove: 0,
      menuOpen: false,
      started: true,
    }),
  openMenu: () => set({ menuOpen: true }),
  closeMenu: () =>
    set((s) => ({
      menuOpen: false,
      started: true,
      difficulty: s.started ? s.difficulty : s.nextDifficulty,
    })),
  toggleMenu: () =>
    set((s) => ({
      menuOpen: !s.menuOpen,
      started: true,
      difficulty: s.started ? s.difficulty : s.nextDifficulty,
    })),
  tick: (seconds) => set((s) => (s.menuOpen || isGameOver(s) ? s : tickFallingGame(s, seconds))),
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { gameStore: typeof useGameStore }).gameStore = useGameStore
}
