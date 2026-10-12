import { coordKey, DIRECTIONS, neighbour, parseCoordKey } from './coords'
import type { Coord, Direction } from './coords'
import { boardTiles, getTile, isOccupied } from './board'
import type { Board } from './board'
import { facingQuadrants } from './tiles'
import type { Quadrant, Quadrants, Terrain } from './tiles'

/** One half of a shared side: one of our quadrants against the neighbour square it touches. */
export interface Contact {
  readonly direction: Direction
  readonly quadrant: Quadrant
  readonly matches: boolean
}

export interface PlacementEvaluation {
  /** Occupied squares sharing a side with the placement. */
  readonly neighbours: number
  /** Every half-side contact, two per occupied neighbour. */
  readonly contacts: readonly Contact[]
  /** Sides where both halves match. */
  readonly matched: readonly Direction[]
  /** Occupied sides where at least one half differs. */
  readonly mismatched: readonly Direction[]
  /** Every touching side fully matches and at least two sides touch. */
  readonly harmonious: boolean
  /** All four sides are occupied and fully match. */
  readonly perfect: boolean
}

export function terrainsMatch(a: Terrain, b: Terrain): boolean {
  if (a === 'bedrock' || b === 'bedrock' || a === 'void' || b === 'void') return false
  return a === b || a === 'rainbow' || b === 'rainbow'
}

/** Compares each side of a tile placed at `c` with the facing side of its neighbours. */
export function evaluatePlacement(
  board: Board,
  c: Coord,
  quadrants: Quadrants,
): PlacementEvaluation {
  const contacts: Contact[] = []
  const matched: Direction[] = []
  const mismatched: Direction[] = []

  for (const d of DIRECTIONS) {
    const other = getTile(board, neighbour(c, d))
    if (!other) continue
    let sideMatches = true
    for (const [mine, theirs] of facingQuadrants(d)) {
      const matches = terrainsMatch(quadrants[mine], other.quadrants[theirs])
      contacts.push({ direction: d, quadrant: mine, matches })
      sideMatches &&= matches
    }
    ;(sideMatches ? matched : mismatched).push(d)
  }

  const neighbours = matched.length + mismatched.length
  const allMatch = mismatched.length === 0
  return {
    neighbours,
    contacts,
    matched,
    mismatched,
    harmonious: allMatch && neighbours >= 2,
    perfect: allMatch && neighbours === 4,
  }
}

/** A square accepts a tile when it is empty and touches at least one placed tile. */
export function canPlace(board: Board, c: Coord): boolean {
  if (isOccupied(board, c)) return false
  if (boardTiles(board).length === 0) return c.q === 0 && c.r === 0
  return DIRECTIONS.some((d) => isOccupied(board, neighbour(c, d)))
}

/** Every empty square adjacent to the board, in a stable order. */
export function placementCandidates(board: Board): Coord[] {
  if (boardTiles(board).length === 0) return [{ q: 0, r: 0 }]
  const keys = new Set<string>()
  for (const tile of boardTiles(board)) {
    for (const d of DIRECTIONS) {
      const n = neighbour(tile.coord, d)
      if (!isOccupied(board, n)) keys.add(coordKey(n))
    }
  }
  return [...keys].map(parseCoordKey).sort((a, b) => a.r - b.r || a.q - b.q)
}

/** The open square closest to `c`, for dropping a keyboard cursor somewhere useful. */
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
