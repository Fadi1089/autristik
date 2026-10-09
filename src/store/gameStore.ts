import { create } from 'zustand'
import { boardTiles } from '../game/board'
import type { Board } from '../game/board'
import { coordsEqual, neighbour } from '../game/coords'
import type { Coord, Direction } from '../game/coords'
import { canPlace } from '../game/matching'
import { createGame, isGameOver, placeCurrent, rotateCurrent, tickGame } from '../game/game'
import type { GameState } from '../game/game'

export interface GameStore extends GameState {
  /** Square the ghost tile is shown over: under the pointer or the keyboard cursor, if it can take the tile. */
  readonly hover: Coord | null
  /** Keyboard cursor. It can rest on any square near the board; null while the mouse is in use. */
  readonly cursor: Coord | null
  /** The menu pauses the game and blurs the scene behind it. */
  readonly menuOpen: boolean
  /** False until the player first leaves the menu, so it can say "Play" instead of "Resume". */
  readonly started: boolean
  /** Seconds of unpaused play in the current game, across all levels. */
  readonly elapsed: number

  /** Pointer hover; switches off the keyboard cursor. */
  setHover(hover: Coord | null): void
  setCursor(cursor: Coord): void
  moveCursor(direction: Direction): void
  /** Places the tile in hand on the hovered square, if there is one. */
  placeAtHover(): void
  rotate(turns: number): void
  place(c: Coord): void
  restart(seed?: number): void
  openMenu(): void
  closeMenu(): void
  toggleMenu(): void
  /** Runs the level countdown and play clock; ignored while paused or after the game ends. */
  tick(seconds: number): void
}

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32)
}

/** `?seed=123` in the URL gives a reproducible game. */
function initialSeed(): number {
  const param = new URLSearchParams(window.location.search).get('seed')
  const seed = param === null ? NaN : Number(param)
  return Number.isFinite(seed) ? seed : randomSeed()
}

/** The keyboard cursor may wander one square past the outermost tiles, no further. */
function clampToBoard(board: Board, c: Coord): Coord {
  const tiles = boardTiles(board)
  const qs = tiles.map((t) => t.coord.q)
  const rs = tiles.map((t) => t.coord.r)
  return {
    q: Math.min(Math.max(...qs) + 1, Math.max(Math.min(...qs) - 1, c.q)),
    r: Math.min(Math.max(...rs) + 1, Math.max(Math.min(...rs) - 1, c.r)),
  }
}

function hoverFor(board: Board, c: Coord | null): Coord | null {
  return c && canPlace(board, c) ? c : null
}

export const useGameStore = create<GameStore>()((set) => ({
  ...createGame(initialSeed()),
  hover: null,
  cursor: null,
  menuOpen: true,
  started: false,
  elapsed: 0,

  setHover: (hover) =>
    set((s) => {
      const same = s.hover === hover || (s.hover && hover && coordsEqual(s.hover, hover))
      if (s.menuOpen || (same && !s.cursor)) return s
      return { hover, cursor: null }
    }),

  setCursor: (c) =>
    set((s) => {
      if (s.menuOpen) return s
      const cursor = clampToBoard(s.board, c)
      return { cursor, hover: hoverFor(s.board, cursor) }
    }),

  moveCursor: (direction) => {
    const { cursor, setCursor } = useGameStore.getState()
    if (cursor) setCursor(neighbour(cursor, direction))
  },

  placeAtHover: () => {
    const { hover, place } = useGameStore.getState()
    if (hover) place(hover)
  },

  rotate: (turns) => set((s) => (s.menuOpen ? s : { rotation: rotateCurrent(s, turns).rotation })),

  place: (c) =>
    set((s) => {
      if (s.menuOpen) return s
      const next = placeCurrent(s, c)
      if (next === s) return s
      // The keyboard cursor stays put; its square is now taken, so the ghost hides.
      return { ...next, hover: hoverFor(next.board, s.cursor) }
    }),

  restart: (seed = randomSeed()) =>
    set({
      ...createGame(seed),
      hover: null,
      cursor: null,
      menuOpen: false,
      started: true,
      elapsed: 0,
    }),

  openMenu: () => set({ menuOpen: true, hover: null }),
  closeMenu: () => set({ menuOpen: false, started: true }),
  toggleMenu: () =>
    set((s) => (s.menuOpen ? { menuOpen: false, started: true } : { menuOpen: true, hover: null })),

  tick: (seconds) =>
    set((s) =>
      s.menuOpen || isGameOver(s) ? s : { ...tickGame(s, seconds), elapsed: s.elapsed + seconds },
    ),
}))

if (import.meta.env.DEV) {
  // Handy for poking at the game from the browser console.
  ;(window as unknown as { gameStore: typeof useGameStore }).gameStore = useGameStore
}
