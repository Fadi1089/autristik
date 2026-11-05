import { create } from 'zustand'
import { coordsEqual, neighbour } from '../game/coords'
import type { Coord, Direction } from '../game/coords'
import { createGame, placeCurrent, resetBoard, rotateCurrent, skipCurrent } from '../game/game'
import type { GameState } from '../game/game'
import { clampCursor } from '../game/matching'
import type { BiomeProbabilities } from '../game/tiles'
import { useSettingsStore } from './settingsStore'

export interface GameStore extends GameState {
  /** Square under the pointer or the keyboard cursor; the ghost shows there when the piece fits. */
  readonly hover: Coord | null
  /** Keyboard cursor: the piece's anchor. It stays near enough the board for any shape to reach it; null while the mouse is in use. */
  readonly cursor: Coord | null
  /** The menu pauses the game and blurs the scene behind it. */
  readonly menuOpen: boolean
  /** False until the player first leaves the menu, so it can say "Play" instead of "Resume". */
  readonly started: boolean

  /** Pointer hover; switches off the keyboard cursor. */
  setHover(hover: Coord | null): void
  setCursor(cursor: Coord): void
  moveCursor(direction: Direction): void
  /** Places the piece in hand on the hovered square, if it fits there. */
  placeAtHover(): void
  rotate(turns: number): void
  /** Draws the next piece when the one in hand fits nowhere. */
  skip(): void
  setBiomeProbabilities(probabilities: BiomeProbabilities): void
  place(c: Coord): void
  restart(seed?: number): void
  /** Clears the placed tiles back to a starting island; the queue carries on. */
  resetGrid(): void
  /** Carries on with a loaded game, and takes on its biome odds. */
  loadGame(game: GameState): void
  openMenu(): void
  closeMenu(): void
  toggleMenu(): void
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

export const useGameStore = create<GameStore>()((set) => ({
  ...createGame(initialSeed(), useSettingsStore.getState().biomeProbabilities),
  hover: null,
  cursor: null,
  menuOpen: true,
  started: false,

  setHover: (hover) =>
    set((s) => {
      const same = s.hover === hover || (s.hover && hover && coordsEqual(s.hover, hover))
      if (s.menuOpen || (same && !s.cursor)) return s
      return { hover, cursor: null }
    }),

  setCursor: (c) =>
    set((s) => {
      if (s.menuOpen) return s
      const cursor = clampCursor(s.board, c)
      return { cursor, hover: cursor }
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

  skip: () => set((s) => (s.menuOpen ? s : skipCurrent(s))),

  setBiomeProbabilities: (biomeProbabilities) => set({ biomeProbabilities }),

  place: (c) =>
    set((s) => {
      if (s.menuOpen) return s
      const next = placeCurrent(s, c)
      if (next === s) return s
      // The keyboard cursor stays put; its square is now taken, so the ghost hides.
      return { ...next, hover: s.cursor }
    }),

  restart: (seed = randomSeed()) =>
    set({
      ...createGame(seed, useSettingsStore.getState().biomeProbabilities),
      hover: null,
      cursor: null,
      menuOpen: false,
      started: true,
    }),

  resetGrid: () =>
    set((s) => {
      const next = resetBoard(s)
      return { ...next, hover: s.cursor }
    }),

  loadGame: (game) => {
    // The settings panel pushes its odds onto the game, so it must hold the loaded ones.
    if (game.biomeProbabilities)
      useSettingsStore.getState().setBiomeProbabilities(game.biomeProbabilities)
    set({ ...game, hover: null, cursor: null, menuOpen: false, started: true })
  },

  openMenu: () => set({ menuOpen: true, hover: null }),
  closeMenu: () => set({ menuOpen: false, started: true }),
  toggleMenu: () =>
    set((s) => (s.menuOpen ? { menuOpen: false, started: true } : { menuOpen: true, hover: null })),
}))

if (import.meta.env.DEV) {
  // Handy for poking at the game from the browser console.
  ;(window as unknown as { gameStore: typeof useGameStore }).gameStore = useGameStore
}

// A hot update to the store, or to the game code under it, would leave parts of the page on an
// old copy of the store and the rest on the new one: a button then changes a game the board no
// longer shows. Reload the whole page instead.
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload())
