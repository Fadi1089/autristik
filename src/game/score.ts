import { boardSquares, getSquare } from './board'
import type { Board, PlacedSquare } from './board'
import { DIRECTIONS, neighbour } from './coords'
import type { Square } from './tiles'

/** Points for each piece laid down. */
export const PIECE_POINTS = 1
/** Points for each edge where the piece meets its own biome on another piece. */
export const CONNECTION_POINTS = 1
/** Points when a piece ends up with its own biome against every one of its outer edges. */
export const SURROUNDED_POINTS = 10

export interface PlacementScore {
  /** Edges where the piece meets its own biome on another piece. */
  readonly connections: number
  /** Pieces, this one or ones already down, that it left surrounded: their ids on the board. */
  readonly surrounded: readonly number[]
  readonly points: number
}

/** Each piece's squares, by piece id. */
function piecesOf(board: Board): Map<number, PlacedSquare[]> {
  const pieces = new Map<number, PlacedSquare[]>()
  for (const square of boardSquares(board))
    pieces.set(square.piece, [...(pieces.get(square.piece) ?? []), square])
  return pieces
}

/** Whether every outer edge of the piece meets a square of its own biome on another piece. */
function surrounds(board: Board, squares: readonly PlacedSquare[]): boolean {
  return (
    squares.length > 0 &&
    squares.every((square) =>
      DIRECTIONS.every((d) => {
        const other = getSquare(board, neighbour(square.coord, d))
        return (
          other !== undefined && (other.piece === square.piece || other.terrain === square.terrain)
        )
      }),
    )
  )
}

/** Whether the piece with this id is surrounded on the board. */
export function isSurrounded(board: Board, piece: number): boolean {
  return surrounds(board, piecesOf(board).get(piece) ?? [])
}

/** What laying `squares` scored, given the board before and after. */
export function scorePlacement(
  before: Board,
  after: Board,
  squares: readonly Square[],
): PlacementScore {
  let connections = 0
  const nearby = new Set<number>()
  for (const square of squares) {
    nearby.add(getSquare(after, square.coord)!.piece)
    for (const direction of DIRECTIONS) {
      // The board before holds every other piece, and none of this one.
      const other = getSquare(before, neighbour(square.coord, direction))
      if (!other) continue
      nearby.add(other.piece)
      if (other.terrain === square.terrain) connections++
    }
  }
  // Only this piece and the ones it touches can have just become surrounded.
  const surrounded = [...nearby].filter(
    (id) => isSurrounded(after, id) && !isSurrounded(before, id),
  )
  return {
    connections,
    surrounded,
    points: PIECE_POINTS + connections * CONNECTION_POINTS + surrounded.length * SURROUNDED_POINTS,
  }
}
