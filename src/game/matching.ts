import { coordKey, DIRECTIONS, neighbour, parseCoordKey } from './coords'
import type { Coord, Direction } from './coords'
import { boardSquares, getSquare, isEmpty, isOccupied } from './board'
import type { Board } from './board'
import { inBounds, modeRules } from './modes'
import type { GridBounds, ModeRules } from './modes'
import { pieceSquares, shapeOffsets } from './tiles'
import type { Rotation, Square, Terrain, Tetromino } from './tiles'

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
  const allMatch = contacts.length > 0 && contacts.every((c) => c.matches)
  return {
    neighbours: contacts.length,
    contacts,
    harmonious: allMatch && contacts.length >= 2,
    perfect: allMatch && contacts.length === outerEdges,
  }
}

/**
 * Blue only takes blue next to it: a square of another biome can't be laid against a blue
 * square already on the board. A blue square itself can be laid against any biome.
 */
export function blueConflict(placed: Terrain, placing: Terrain): boolean {
  return placed === 'blue' && placing !== 'blue'
}

/** The parts of a mode's rules that decide where a piece may go. */
export type PlacementRules = Pick<ModeRules, 'free' | 'bounds'>

/** The score game's rules: contact and blue apply, on an endless board. */
export const SCORE_RULES: PlacementRules = modeRules('score')

/**
 * A piece can't overlap the board or leave the grid, and must touch the board along at least
 * one edge; only the first piece on an empty board goes anywhere. Only blue may be laid
 * against blue already on the board. Free rules (creation) keep only the overlap and the grid.
 */
export function canPlace(
  board: Board,
  squares: readonly Square[],
  rules: PlacementRules = SCORE_RULES,
): boolean {
  if (squares.some((s) => isOccupied(board, s.coord) || !inBounds(rules.bounds, s.coord)))
    return false
  if (rules.free) return true
  let touches = false
  for (const square of squares)
    for (const direction of DIRECTIONS) {
      const other = getSquare(board, neighbour(square.coord, direction))
      if (!other) continue
      if (blueConflict(other.terrain, square.terrain)) return false
      touches = true
    }
  // Only a piece touching nothing needs the (whole-board) emptiness check.
  return touches || isEmpty(board)
}

/**
 * Every anchor where `piece` fits at `rotation`, in a stable order. A fitting piece touches
 * the board, so one of its squares sits on an open cell next to it. Under free rules a piece
 * fits far from the board too; those spots are left out, so this lists the ones beside it.
 */
export function placementAnchors(
  board: Board,
  piece: Tetromino,
  rotation: Rotation,
  rules: PlacementRules = SCORE_RULES,
): Coord[] {
  const offsets = shapeOffsets(piece.shape, rotation)
  const tried = new Set<string>()
  const anchors: Coord[] = []
  for (const cell of placementCandidates(board))
    for (const offset of offsets) {
      const at = { q: cell.q - offset.q, r: cell.r - offset.r }
      const key = coordKey(at)
      if (tried.has(key)) continue
      tried.add(key)
      if (canPlace(board, pieceSquares(piece, rotation, at), rules)) anchors.push(at)
    }
  return anchors.sort((a, b) => a.r - b.r || a.q - b.q)
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
 * Keeps a keyboard cursor (a piece's anchor) near enough to explore and place freely, and on
 * the grid when there is one, since the anchor is one of the piece's own squares.
 */
export function clampCursor(board: Board, c: Coord, bounds: GridBounds | null = null): Coord {
  if (bounds)
    return {
      q: Math.min(bounds.maxQ, Math.max(bounds.minQ, c.q)),
      r: Math.min(bounds.maxR, Math.max(bounds.minR, c.r)),
    }
  const squares = boardSquares(board)
  const qs = squares.length > 0 ? squares.map((s) => s.coord.q) : [0]
  const rs = squares.length > 0 ? squares.map((s) => s.coord.r) : [0]
  const reach = 25
  return {
    q: Math.min(Math.max(20, ...qs) + reach, Math.max(-20, Math.min(...qs) - reach, c.q)),
    r: Math.min(Math.max(20, ...rs) + reach, Math.max(-20, Math.min(...rs) - reach, c.r)),
  }
}

/** The coordinate in `coords` closest to `c`, or null if there are none. */
export function nearest(coords: readonly Coord[], c: Coord): Coord | null {
  let best: Coord | null = null
  let bestDistance = Infinity
  for (const candidate of coords) {
    const distance = (candidate.q - c.q) ** 2 + (candidate.r - c.r) ** 2
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}

/** The open cell closest to `c`, for dropping a keyboard cursor somewhere useful. */
export function nearestCandidate(board: Board, c: Coord): Coord | null {
  return nearest(placementCandidates(board), c)
}

/**
 * Whether some tetromino could still go on the grid: four free cells joined along their sides,
 * beside the board. Any four such cells make one of the seven shapes, and an all-blue piece
 * goes against any biome, so this holds exactly while some piece could be laid. An endless
 * board always has room.
 */
export function hasRoom(board: Board, bounds: GridBounds | null): boolean {
  if (bounds === null) return true
  const seen = new Set<string>()
  for (let q = bounds.minQ; q <= bounds.maxQ; q++)
    for (let r = bounds.minR; r <= bounds.maxR; r++) {
      const start = { q, r }
      if (isOccupied(board, start) || seen.has(coordKey(start))) continue
      // Flood the free cells joined to this one, noting whether any of them touches the board.
      seen.add(coordKey(start))
      const region = [start]
      let touches = false
      for (let i = 0; i < region.length; i++)
        for (const direction of DIRECTIONS) {
          const n = neighbour(region[i]!, direction)
          if (!inBounds(bounds, n)) continue
          if (isOccupied(board, n)) touches = true
          else if (!seen.has(coordKey(n))) {
            seen.add(coordKey(n))
            region.push(n)
          }
        }
      if (touches && region.length >= 4) return true
    }
  return false
}
