/**
 * Square-grid axial coordinates.
 *
 * `q` is the column and grows east (+x in world space), `r` is the row and grows
 * south (+z in world space). Each square has four edge neighbours, one per Direction.
 */
export interface Coord {
  readonly q: number
  readonly r: number
}

/** String form of a coordinate, used as a map key: `"q,r"`. */
export type CoordKey = `${number},${number}`

export const Direction = {
  North: 0,
  East: 1,
  South: 2,
  West: 3,
} as const
export type Direction = (typeof Direction)[keyof typeof Direction]

/** All directions in clockwise order, starting north. */
export const DIRECTIONS: readonly Direction[] = [
  Direction.North,
  Direction.East,
  Direction.South,
  Direction.West,
]

const OFFSETS: Readonly<Record<Direction, Coord>> = {
  [Direction.North]: { q: 0, r: -1 },
  [Direction.East]: { q: 1, r: 0 },
  [Direction.South]: { q: 0, r: 1 },
  [Direction.West]: { q: -1, r: 0 },
}

export function coord(q: number, r: number): Coord {
  return { q, r }
}

export function coordKey({ q, r }: Coord): CoordKey {
  return `${q},${r}`
}

export function parseCoordKey(key: string): Coord {
  const [q, r] = key.split(',').map(Number)
  if (q === undefined || r === undefined || Number.isNaN(q) || Number.isNaN(r)) {
    throw new Error(`Invalid coordinate key: "${key}"`)
  }
  return { q, r }
}

export function addCoords(a: Coord, b: Coord): Coord {
  return { q: a.q + b.q, r: a.r + b.r }
}

export function coordsEqual(a: Coord, b: Coord): boolean {
  return a.q === b.q && a.r === b.r
}

export function directionOffset(direction: Direction): Coord {
  return OFFSETS[direction]
}

export function neighbour(c: Coord, direction: Direction): Coord {
  return addCoords(c, OFFSETS[direction])
}

/** The four edge-adjacent squares, in DIRECTIONS order. */
export function neighbours(c: Coord): Coord[] {
  return DIRECTIONS.map((d) => neighbour(c, d))
}

export function oppositeDirection(direction: Direction): Direction {
  return ((direction + 2) % 4) as Direction
}

export function manhattanDistance(a: Coord, b: Coord): number {
  return Math.abs(a.q - b.q) + Math.abs(a.r - b.r)
}
