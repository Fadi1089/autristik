import { coordKey } from './coords'
import type { Coord } from './coords'
import type { Rng } from './random'
import { pieceSquares, randomTetromino } from './tiles'
import type { BiomeProbabilities, Square } from './tiles'

export interface PlacedSquare extends Square {
  /** The piece this square belongs to, so each placed tetromino stays distinct. */
  readonly piece: number
}

/** Placed squares keyed by coordKey; each board cell holds one terrain square. */
export type Board = Readonly<Record<string, PlacedSquare>>

export const EMPTY_BOARD: Board = {}

export function getSquare(board: Board, c: Coord): PlacedSquare | undefined {
  return board[coordKey(c)]
}

/** Whether no piece has been placed yet, without listing the whole board. */
export function isEmpty(board: Board): boolean {
  for (const key in board) if (Object.hasOwn(board, key)) return false
  return true
}

export function isOccupied(board: Board, c: Coord): boolean {
  return getSquare(board, c) !== undefined
}

/** Adds a piece's squares under a new piece id. */
export function withPiece(board: Board, squares: readonly Square[]): Board {
  const piece = Math.max(-1, ...boardSquares(board).map((s) => s.piece)) + 1
  const next = { ...board }
  for (const square of squares) next[coordKey(square.coord)] = { ...square, piece }
  return next
}

export function boardSquares(board: Board): PlacedSquare[] {
  return Object.values(board)
}

/** Number of pieces on the board. */
export function pieceCount(board: Board): number {
  return new Set(boardSquares(board).map((s) => s.piece)).size
}

/** Redraws of an all-blue starting piece before settling for it, e.g. when only blue is enabled. */
const STARTING_REDRAWS = 20

/**
 * A single random tetromino at the origin to build around. It isn't all blue unless the
 * settings leave no choice, since only blue could ever be laid against it.
 */
export function createStartingBoard(rng: Rng, biomeProbabilities?: BiomeProbabilities): Board {
  let piece = randomTetromino(rng, biomeProbabilities)
  for (let i = 0; i < STARTING_REDRAWS && piece.terrains.every((t) => t === 'blue'); i++)
    piece = randomTetromino(rng, biomeProbabilities)
  return withPiece(EMPTY_BOARD, pieceSquares(piece, 0, { q: 0, r: 0 }))
}
