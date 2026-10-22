import { coordKey, DIRECTIONS, neighbour, parseCoordKey } from './coords'
import type { Coord, Direction } from './coords'
import { boardSquares, getSquare, isOccupied } from './board'
import type { Board } from './board'
import { SHAPE_REACH } from './tiles'
import type { Square, Terrain } from './tiles'

/** One edge where a square of the piece touches a square already on the board. */
export interface Contact {
  /** The piece's square. */
  readonly coord: Coord
  readonly direction: Direction
  readonly matches: boolean
}

export interface PlacementEvaluation {
  /** Edges touching the board. */
  readonly neighbours: number
  readonly contacts: readonly Contact[]
  /** Every contact matches and there are at least two. */
  readonly harmonious: boolean
  /** Every outer edge of the piece touches the board and matches: it fills a gap exactly. */
  readonly perfect: boolean
}

export function terrainsMatch(a: Terrain, b: Terrain): boolean {
  return a === b
}

function inPiece(squares: readonly Square[], c: Coord): boolean {
  return squares.some((s) => s.coord.q === c.q && s.coord.r === c.r)
}

/** Compares every outer edge of a piece with the square on the other side, if any. */
export function evaluatePlacement(board: Board, squares: readonly Square[]): PlacementEvaluation {
  const contacts: Contact[] = []
  let outerEdges = 0
  for (const square of squares) {
    for (const direction of DIRECTIONS) {
      const n = neighbour(square.coord, direction)
      if (inPiece(squares, n)) continue
      outerEdges++
      const other = getSquare(board, n)
      if (other)
        contacts.push({
          coord: square.coord,
          direction,
          matches: terrainsMatch(square.terrain, other.terrain),
        })
    }
  }
  const allMatch = contacts.every((c) => c.matches)
  return {
    neighbours: contacts.length,
    contacts,
    harmonious: allMatch && contacts.length >= 2,
    perfect: allMatch && contacts.length === outerEdges,
  }
}

/** A piece fits when all its cells are empty and it touches the board (or starts it at the origin). */
export function canPlace(board: Board, squares: readonly Square[]): boolean {
  if (squares.some((s) => isOccupied(board, s.coord))) return false
  if (boardSquares(board).length === 0) return inPiece(squares, { q: 0, r: 0 })
  return squares.some((s) => DIRECTIONS.some((d) => isOccupied(board, neighbour(s.coord, d))))
}

/** Every empty cell next to the board, in a stable order. */
export function placementCandidates(board: Board): Coord[] {
  const keys = new Set<string>()
  for (const square of boardSquares(board)) {
    for (const d of DIRECTIONS) {
      const n = neighbour(square.coord, d)
      if (!isOccupied(board, n)) keys.add(coordKey(n))
    }
  }
  return [...keys].map(parseCoordKey).sort((a, b) => a.r - b.r || a.q - b.q)
}

/**
 * Keeps a keyboard cursor (a piece's anchor) near the board: far enough out that any shape
 * can still be placed touching the board from any side, and no farther.
 */
export function clampCursor(board: Board, c: Coord): Coord {
  const squares = boardSquares(board)
  if (squares.length === 0) return c
  const reach = SHAPE_REACH + 1
  const qs = squares.map((s) => s.coord.q)
  const rs = squares.map((s) => s.coord.r)
  return {
    q: Math.min(Math.max(...qs) + reach, Math.max(Math.min(...qs) - reach, c.q)),
    r: Math.min(Math.max(...rs) + reach, Math.max(Math.min(...rs) - reach, c.r)),
  }
}

/** The open cell closest to `c`, for dropping a keyboard cursor somewhere useful. */
export function nearestCandidate(board: Board, c: Coord): Coord | null {
  let best: Coord | null = null
  let bestDistance = Infinity
  for (const candidate of placementCandidates(board)) {
    const distance = (candidate.q - c.q) ** 2 + (candidate.r - c.r) ** 2
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}
