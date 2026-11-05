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

/** Single black tiles scattered round the starting tetromino: at least this many… */
export const STARTING_TILES_MIN = 5
/** …and at most this many. */
export const STARTING_TILES_MAX = 8
/** How far from the starting tetromino they land, counting a diagonal step as one: at least… */
export const STARTING_TILE_NEAREST = 4
/** …and at most this far. */
export const STARTING_TILE_FARTHEST = 7
/** How far apart they keep from one another. */
export const STARTING_TILE_APART = 3

/** How far apart two squares are, counting a diagonal step as one. */
const steps = (a: Coord, b: Coord) => Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r))

/**
 * A random tetromino at the origin to build around, and five to eight single black squares
 * scattered round it, a little way out, each a piece of its own. The tetromino isn't all blue
 * unless the settings leave no choice, since only blue could ever be laid against it. The
 * black squares stand well apart from it and from one another, touching nothing.
 */
export function createStartingBoard(rng: Rng, biomeProbabilities?: BiomeProbabilities): Board {
  let piece = randomTetromino(rng, biomeProbabilities)
  for (let i = 0; i < STARTING_REDRAWS && piece.terrains.every((t) => t === 'blue'); i++)
    piece = randomTetromino(rng, biomeProbabilities)
  const start = pieceSquares(piece, 0, { q: 0, r: 0 })
  let board = withPiece(EMPTY_BOARD, start)

  const tiles: Coord[] = []
  const reach = STARTING_TILE_FARTHEST + 3
  const count =
    STARTING_TILES_MIN + Math.floor(rng.next() * (STARTING_TILES_MAX - STARTING_TILES_MIN + 1))
  for (let i = 0; i < count; i++) {
    const spots: Coord[] = []
    for (let q = -reach; q <= reach; q++)
      for (let r = -reach; r <= reach; r++) {
        const c = { q, r }
        const away = Math.min(...start.map((s) => steps(s.coord, c)))
        if (
          away >= STARTING_TILE_NEAREST &&
          away <= STARTING_TILE_FARTHEST &&
          tiles.every((t) => steps(t, c) >= STARTING_TILE_APART)
        )
          spots.push(c)
      }
    if (spots.length === 0) break
    const coord = spots[Math.floor(rng.next() * spots.length)]!
    tiles.push(coord)
    board = withPiece(board, [{ coord, terrain: 'black' }])
  }
  return board
}
