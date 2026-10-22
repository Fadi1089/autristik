import { createStartingBoard, withPiece } from './board'
import type { Board } from './board'
import type { Coord } from './coords'
import { canPlace, evaluatePlacement } from './matching'
import type { PlacementEvaluation } from './matching'
import { createRng } from './random'
import { normalizeRotation, pieceSquares, randomTetromino } from './tiles'
import type { BiomeProbabilities, Rotation, Square, Tetromino } from './tiles'

export type PlacementPreview = PlacementEvaluation

/** Tiles shown after the one in hand. */
export const VISIBLE_NEXT = 3

export interface PlacementResult extends PlacementPreview {
  /** The anchor square the piece was placed on. */
  readonly coord: Coord
  readonly squares: readonly Square[]
}

export interface GameState {
  readonly board: Board
  /** Tetromino in hand, unrotated. */
  readonly current: Tetromino | null
  readonly rotation: Rotation
  /** PRNG state used for the next draw. */
  readonly seed: number
  readonly lastPlacement: PlacementResult | null
  readonly biomeProbabilities?: BiomeProbabilities
}

export function createGame(seed: number, biomeProbabilities?: BiomeProbabilities): GameState {
  const rng = createRng(seed)
  const board = createStartingBoard(rng)
  const current = randomTetromino(rng, biomeProbabilities)
  return {
    board,
    current,
    rotation: 0,
    seed: rng.state,
    lastPlacement: null,
    biomeProbabilities,
  }
}

/** The tiles drawn after the one in hand, peeked from the same sequence without drawing them. */
export function upcomingTiles(
  state: Pick<GameState, 'seed'> & { readonly biomeProbabilities?: BiomeProbabilities },
  count: number = VISIBLE_NEXT,
): Tetromino[] {
  const rng = createRng(state.seed)
  return Array.from({ length: count }, () => randomTetromino(rng, state.biomeProbabilities))
}

/** Puts the board back to a starting island; the tile in hand carries on. */
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
  return evaluatePlacement(state.board, squares)
}

/**
 * Places the tile in hand at `c` and draws the next one.
 * Returns `state` unchanged if the move is not allowed.
 */
export function placeCurrent(state: GameState, c: Coord): GameState {
  const squares = currentSquares(state, c)
  const preview = previewPlacement(state, c)
  if (!squares || !preview) return state

  const rng = createRng(state.seed)
  const current = randomTetromino(rng, state.biomeProbabilities)

  return {
    board: withPiece(state.board, squares),
    current,
    rotation: 0,
    seed: rng.state,
    lastPlacement: { ...preview, coord: c, squares },
    biomeProbabilities: state.biomeProbabilities,
  }
}

export function withBiomeProbabilities(
  state: GameState,
  biomeProbabilities: BiomeProbabilities,
): GameState {
  return {
    ...state,
    biomeProbabilities,
  }
}

export function endReason(state?: unknown): null {
  void state
  return null
}

export function isGameOver(state?: unknown): boolean {
  void state
  return false
}
