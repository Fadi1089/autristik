import { createStartingBoard, withPiece } from './board'
import type { Board } from './board'
import type { Coord } from './coords'
import { canPlace, evaluatePlacement } from './matching'
import type { PlacementEvaluation } from './matching'
import { createRng } from './random'
import { scorePlacement } from './scoring'
import type { PlacementScore } from './scoring'
import { normalizeRotation, pieceSquares, randomTetromino } from './tiles'
import type { Rotation, Square, Tetromino } from './tiles'

export const STARTING_TILES = 30

export type PlacementPreview = PlacementEvaluation & PlacementScore

/** Tiles shown after the one in hand. */
export const VISIBLE_NEXT = 3

export interface PlacementResult extends PlacementPreview {
  /** The anchor square the piece was placed on. */
  readonly coord: Coord
  readonly squares: readonly Square[]
}

/** Why a game ended: the stack ran out. */
export type EndReason = 'tiles'

export interface GameState {
  readonly board: Board
  /** Tetromino in hand, unrotated. Null once the stack is empty. */
  readonly current: Tetromino | null
  readonly rotation: Rotation
  /** Tiles left to place, including the one in hand. */
  readonly remaining: number
  /** Total points. */
  readonly score: number
  /** PRNG state used for the next draw. */
  readonly seed: number
  readonly lastPlacement: PlacementResult | null
}

export function createGame(seed: number, tiles: number = STARTING_TILES): GameState {
  const rng = createRng(seed)
  const board = createStartingBoard(rng)
  const current = tiles > 0 ? randomTetromino(rng) : null
  return {
    board,
    current,
    rotation: 0,
    remaining: Math.max(0, tiles),
    score: 0,
    seed: rng.state,
    lastPlacement: null,
  }
}

/** The tiles drawn after the one in hand, peeked from the same sequence without drawing them. */
export function upcomingTiles(
  state: Pick<GameState, 'remaining' | 'seed'>,
  count: number = VISIBLE_NEXT,
): Tetromino[] {
  const rng = createRng(state.seed)
  return Array.from({ length: Math.max(0, Math.min(count, state.remaining - 1)) }, () =>
    randomTetromino(rng),
  )
}

/** Puts the board back to a starting island; the tile in hand and the stack carry on. */
export function resetBoard(state: GameState): GameState {
  // A separate sequence for the island, so the upcoming tiles stay exactly as shown.
  return {
    ...state,
    board: createStartingBoard(createRng(state.seed ^ 0x9e3779b9)),
    lastPlacement: null,
  }
}

/** The parts of the state needed to look at the tile in hand. */
export type HandState = Pick<GameState, 'board' | 'current' | 'rotation'>

/** The squares the piece in hand would cover with its anchor on `c`. */
export function currentSquares(state: HandState, c: Coord): Square[] | null {
  return state.current ? pieceSquares(state.current, state.rotation, c) : null
}

/** Whether the piece in hand fits with its anchor on `c`. */
export function canPlaceCurrent(state: HandState, c: Coord): boolean {
  const squares = currentSquares(state, c)
  return squares !== null && canPlace(state.board, squares)
}

export function rotateCurrent(state: GameState, turns: number): GameState {
  return { ...state, rotation: normalizeRotation(state.rotation + turns) }
}

export function previewPlacement(state: HandState, c: Coord): PlacementPreview | null {
  const squares = currentSquares(state, c)
  if (!squares || !canPlace(state.board, squares)) return null
  const evaluation = evaluatePlacement(state.board, squares)
  return { ...evaluation, ...scorePlacement(evaluation) }
}

/**
 * Places the tile in hand at `c` and draws the next one.
 * Returns `state` unchanged if the move is not allowed.
 */
export function placeCurrent(state: GameState, c: Coord): GameState {
  const squares = currentSquares(state, c)
  const preview = previewPlacement(state, c)
  if (!squares || !preview || isGameOver(state)) return state

  const remaining = state.remaining - 1 + preview.bonusTiles
  const rng = createRng(state.seed)
  const current = remaining > 0 ? randomTetromino(rng) : null

  return {
    board: withPiece(state.board, squares),
    current,
    rotation: 0,
    remaining,
    score: state.score + preview.points,
    seed: rng.state,
    lastPlacement: { ...preview, coord: c, squares },
  }
}

export function endReason(state: Pick<GameState, 'current'>): EndReason | null {
  return state.current === null ? 'tiles' : null
}

export function isGameOver(state: Pick<GameState, 'current'>): boolean {
  return endReason(state) !== null
}
