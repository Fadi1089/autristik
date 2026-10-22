import { coordKey } from './coords'
import type { Coord } from './coords'
import type { Rng } from './random'
import { pieceSquares, randomTetromino } from './tiles'
import type { Square } from './tiles'

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

/** A single random tetromino at the origin to build around. */
export function createStartingBoard(rng: Rng): Board {
  return withPiece(EMPTY_BOARD, pieceSquares(randomTetromino(rng), 0, { q: 0, r: 0 }))
}
