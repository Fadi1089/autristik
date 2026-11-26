import type { Coord } from './coords'

/**
 * Four ways to play:
 * - creation: no score and no placement rules, just pieces to lay anywhere free;
 * - score: the endless scored game;
 * - landscape: the scored game, started in a world grown by wave function collapse;
 * - performance: the scored game with fifty pieces on a ten by twenty grid.
 */
export const GAME_MODES = ['creation', 'score', 'landscape', 'performance'] as const
export type GameMode = (typeof GAME_MODES)[number]

export const MODE_LABELS: Readonly<Record<GameMode, string>> = {
  creation: 'Creation',
  score: 'Score',
  landscape: 'Landscape',
  performance: 'Performance',
}

/** The cells a bounded grid holds, inclusive on every side. */
export interface GridBounds {
  readonly minQ: number
  readonly maxQ: number
  readonly minR: number
  readonly maxR: number
}

/** Pieces a performance game deals, the starting piece aside. */
export const PERFORMANCE_PIECES = 50
/** Columns of the performance grid, west to east… */
export const PERFORMANCE_WIDTH = 10
/** …and rows, north to south. */
export const PERFORMANCE_HEIGHT = 20

/** The performance grid, with the starting piece's anchor near its centre. */
export const PERFORMANCE_BOUNDS: GridBounds = {
  minQ: -PERFORMANCE_WIDTH / 2,
  maxQ: PERFORMANCE_WIDTH / 2 - 1,
  minR: -PERFORMANCE_HEIGHT / 2,
  maxR: PERFORMANCE_HEIGHT / 2 - 1,
}

/** What a mode changes about placing pieces, scoring them and dealing them. */
export interface ModeRules {
  /** Pieces go on any free cell: no contact needed, and blue takes any biome beside it. */
  readonly free: boolean
  /** Placements, roads and bonus objectives score. */
  readonly scored: boolean
  /** The grid pieces must fit in, or null for an endless board. */
  readonly bounds: GridBounds | null
  /** How many pieces the game deals, or null for an endless supply. */
  readonly pieces: number | null
  /** The game starts in a generated landscape instead of on a single piece. */
  readonly landscape: boolean
}

const RULES: Readonly<Record<GameMode, ModeRules>> = {
  creation: { free: true, scored: false, bounds: null, pieces: null, landscape: false },
  score: { free: false, scored: true, bounds: null, pieces: null, landscape: false },
  landscape: { free: false, scored: true, bounds: null, pieces: null, landscape: true },
  performance: {
    free: false,
    scored: true,
    bounds: PERFORMANCE_BOUNDS,
    pieces: PERFORMANCE_PIECES,
    landscape: false,
  },
}

/** A game with no mode is a score game: saves from before the modes were added are. */
export function modeRules(mode: GameMode = 'score'): ModeRules {
  return RULES[mode]
}

export function isGameMode(value: unknown): value is GameMode {
  return GAME_MODES.includes(value as GameMode)
}

/** Whether `c` lies on the grid; every cell does on an endless board. */
export function inBounds(bounds: GridBounds | null, c: Coord): boolean {
  return (
    bounds === null ||
    (c.q >= bounds.minQ && c.q <= bounds.maxQ && c.r >= bounds.minR && c.r <= bounds.maxR)
  )
}
