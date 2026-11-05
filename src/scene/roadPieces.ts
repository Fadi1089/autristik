import type { Coord, CoordKey } from '../game/coords'
import { coordKey, Direction, DIRECTIONS, directionOffset } from '../game/coords'
import type { Route } from '../game/routes'

/** The road models, each joining the middles of some of a cell's edges. */
export type RoadPiece = 'straight' | 'turn' | 'tee' | 'cross'

/** The edges a cell's road reaches, one bit per Direction (1 << direction). */
export type Edges = number

const bit = (d: Direction): Edges => 1 << d

/** The edges each model joins as it comes, before it is turned. */
const MODEL_EDGES: Readonly<Record<RoadPiece, Edges>> = {
  straight: bit(Direction.North) | bit(Direction.South),
  turn: bit(Direction.South) | bit(Direction.East),
  tee: bit(Direction.North) | bit(Direction.East) | bit(Direction.South),
  cross: 0b1111,
}

/**
 * `edges` after a quarter turn about the vertical, the way three.js turns by +90° about y:
 * east becomes north, north west, west south and south east.
 */
export function quarterTurn(edges: Edges): Edges {
  return ((edges >> 1) | (edges << 3)) & 0b1111
}

/** The model that joins exactly `edges`, and how many quarter turns bring it round to them. */
export function pieceFor(edges: Edges): { piece: RoadPiece; turns: number } {
  for (const piece of Object.keys(MODEL_EDGES) as RoadPiece[]) {
    let turned = MODEL_EDGES[piece]
    for (let turns = 0; turns < 4; turns++, turned = quarterTurn(turned))
      if (turned === edges) return { piece, turns }
  }
  // A road always reaches two edges or more; a lone edge still gets a straight across it.
  return { piece: 'straight', turns: edges & (bit(Direction.East) | bit(Direction.West)) ? 1 : 0 }
}

/** The direction from `from` to its neighbour `to`. */
function directionTo(from: Coord, to: Coord): Direction {
  if (to.q > from.q) return Direction.East
  if (to.q < from.q) return Direction.West
  return to.r > from.r ? Direction.South : Direction.North
}

export interface RoadCell {
  readonly coord: Coord
  readonly key: CoordKey
  /** Every edge a road reaches. */
  readonly edges: Edges
  readonly piece: RoadPiece
  readonly turns: number
  /** The first road through the cell comes in from here… */
  readonly from: Direction
  /** …and goes out here, so its stones can appear in the order the road runs. */
  readonly to: Direction
}

/**
 * The cells the roads cross, each with the one piece that joins every edge a road reaches: where
 * two roads share a cell they meet in a T or a cross instead of lying on top of each other. The
 * cities' own squares at either end of a road are left out; the road stops at their edge.
 */
export function roadCells(routes: readonly Route[]): RoadCell[] {
  const cells = new Map<CoordKey, { coord: Coord; edges: Edges; from: Direction; to: Direction }>()
  for (const { path } of routes)
    for (let i = 1; i < path.length - 1; i++) {
      const c = path[i]!
      const from = directionTo(c, path[i - 1]!)
      const to = directionTo(c, path[i + 1]!)
      const key = coordKey(c)
      const cell = cells.get(key) ?? { coord: c, edges: 0, from, to }
      cell.edges |= bit(from) | bit(to)
      cells.set(key, cell)
    }
  return [...cells].map(([key, { coord, edges, from, to }]) => ({
    coord,
    key,
    edges,
    from,
    to,
    ...pieceFor(edges),
  }))
}

/**
 * When each new cell's stones start to appear, in steps of one cell: along each road from its
 * first city to its second, counting only the cells that are new, so a road that grows out of
 * an old one carries on from where it was. Cells that aren't new are left out.
 */
export function appearOrder(
  routes: readonly Route[],
  isNew: (key: CoordKey) => boolean,
): Map<CoordKey, number> {
  const order = new Map<CoordKey, number>()
  for (const { path } of routes) {
    let step = 0
    for (let i = 1; i < path.length - 1; i++) {
      const key = coordKey(path[i]!)
      if (!isNew(key)) continue
      if (!order.has(key)) order.set(key, step)
      step++
    }
  }
  return order
}

/** Half the width of the road, as a share of a cell: the stones run 0.26 either side of its middle. */
export const ROAD_HALF_WIDTH = 0.26

/**
 * How far the point (x, z) lies from the middle line of a cell's road, all measured in cells
 * from the cell's middle (x east, z south). A turn bends round the corner between its two
 * edges, a quarter circle half a cell across; any other road runs straight from the middle to
 * each edge it reaches.
 */
export function distanceToRoad(edges: Edges, x: number, z: number): number {
  const ends = DIRECTIONS.filter((d) => edges & bit(d)).map(directionOffset)
  const [a, b] = ends
  if (ends.length === 2 && a!.q + b!.q !== 0 && a!.r + b!.r !== 0)
    return Math.abs(Math.hypot(x - (a!.q + b!.q) / 2, z - (a!.r + b!.r) / 2) - 0.5)
  let best = Infinity
  for (const { q, r } of ends) {
    // Along the line from the middle to the middle of that edge, half a cell long.
    const t = Math.max(0, Math.min(0.5, x * q + z * r))
    best = Math.min(best, Math.hypot(x - t * q, z - t * r))
  }
  return best
}

/**
 * When the stones of each road cell last started to appear, by the scene's clock. The roads
 * write it as they are laid; the forests read it, so the trees in the way leave just ahead of
 * the stones.
 */
export const roadStarts = new Map<CoordKey, number>()
