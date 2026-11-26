import type { Board, PlacedSquare } from './board'
import { coordKey, DIRECTIONS, neighbour } from './coords'
import type { Coord, CoordKey } from './coords'
import type { Rng } from './random'
import { BIOMES } from './tiles'
import type { Biome } from './tiles'

/**
 * The world a landscape game starts in, grown by wave function collapse.
 *
 * Every cell of a disc starts out able to become any biome, or a clearing left empty for the
 * player. The cell with the fewest likely outcomes is collapsed to one of them, the choice
 * ruling out what its neighbours can no longer sit beside; that narrowing spreads cell to cell
 * until nothing more changes, and the next most settled cell is collapsed, until all are.
 */

/** What a cell of the world can become: a biome, or a clearing the player builds into. */
export type CellState = Biome | 'clearing'
export const CELL_STATES: readonly CellState[] = [...BIOMES, 'clearing']

/**
 * Which states may sit side by side; the table is symmetric. Water lies among woods and
 * fields, never by a town or a clearing, so the player is never walled off by the only-blue
 * rule; towns stand among fields and autumn woods; fields go with anything, so a cell always
 * has something left to become.
 */
const NEIGHBOURS: Readonly<Record<CellState, readonly CellState[]>> = {
  blue: ['blue', 'green', 'yellow'],
  green: ['green', 'blue', 'red', 'yellow', 'clearing'],
  red: ['red', 'green', 'black', 'yellow', 'clearing'],
  yellow: ['yellow', 'green', 'red', 'black', 'blue', 'clearing'],
  black: ['black', 'red', 'yellow', 'clearing'],
  clearing: ['clearing', 'green', 'red', 'yellow', 'black'],
}

export function compatible(a: CellState, b: CellState): boolean {
  return NEIGHBOURS[a].includes(b)
}

/** Starting value: how far the world reaches from its centre, in cells. */
export const LANDSCAPE_RADIUS = 7

/** Starting values: how often each state comes up, before its neighbours have a say. */
const WEIGHTS: Readonly<Record<CellState, number>> = {
  green: 24,
  red: 18,
  yellow: 22,
  black: 16,
  blue: 9,
  clearing: 16,
}

/**
 * Starting value: how much each neighbour already of a state adds to that state's weight,
 * as a multiple of it. Without it the world comes out as speckle; with it, as patches.
 */
const AFFINITY = 6

/**
 * Starting value: the size at which a patch stops drawing its neighbours in. The pull fades as
 * a patch grows towards it, or the first biome down would flood the whole world.
 */
const PATCH_SIZE = 12

/** Starting value: clearings grow this many times likelier at the rim, so the world frays out. */
const RIM_CLEARING = 6

/** The cells of the disc the world grows on, centre first. */
export function landscapeCells(radius: number = LANDSCAPE_RADIUS): Coord[] {
  const cells: Coord[] = []
  for (let r = -radius; r <= radius; r++)
    for (let q = -radius; q <= radius; q++)
      if (q * q + r * r <= (radius + 0.5) ** 2) cells.push({ q, r })
  return cells.sort((a, b) => a.q * a.q + a.r * a.r - (b.q * b.q + b.r * b.r))
}

/** Gives up after this many contradictions; the table above should never cause one. */
const ATTEMPTS = 10

/**
 * Collapses every cell of the disc to a state, listed in the order they collapsed. Each attempt starts over from scratch; one that
 * runs into a cell with nothing left it can become is thrown away.
 */
export function collapseLandscape(
  rng: Rng,
  radius: number = LANDSCAPE_RADIUS,
): Map<CoordKey, CellState> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const result = attemptCollapse(rng, radius)
    if (result) return result
  }
  throw new Error('the landscape kept contradicting itself')
}

function attemptCollapse(rng: Rng, radius: number): Map<CoordKey, CellState> | null {
  // Cells by index, for speed: this runs one full scan of the disc per cell collapsed.
  const cells = landscapeCells(radius)
  const index = new Map(cells.map((c, i) => [coordKey(c), i]))
  const around = cells.map((c) =>
    DIRECTIONS.flatMap((d) => index.get(coordKey(neighbour(c, d))) ?? []),
  )
  const rimPull = cells.map((c) => 1 + (RIM_CLEARING - 1) * (Math.hypot(c.q, c.r) / radius) ** 4)
  const collapsed: (CellState | null)[] = cells.map(() => null)
  /** The cells by index, in the order they collapsed. */
  const order: number[] = []
  // Beyond the disc lies open ground, which behaves like a clearing: no water at the rim.
  const options = around.map((n) =>
    CELL_STATES.filter((s) => n.length === DIRECTIONS.length || compatible(s, 'clearing')),
  )
  // Patches of collapsed cells of one state, as a union-find: each cell's parent, each root's size.
  const parent = cells.map((_, i) => i)
  const size = cells.map(() => 1)
  const root = (i: number): number => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]!]!
    return i
  }

  /**
   * A state's weight on cell `i`: its base, raised by the patches of that state beside it, and
   * for a clearing pulled up towards the rim unless `rim` is false.
   */
  const weight = (i: number, state: CellState, rim = true): number => {
    let w = WEIGHTS[state]
    if (rim && state === 'clearing') w *= rimPull[i]!
    // Each patch pulls once, however many of its cells touch this one, and less as it grows.
    const patches: number[] = []
    for (const n of around[i]!) if (collapsed[n] === state) patches.push(root(n))
    let pull = 0
    for (const [k, p] of patches.entries())
      if (patches.indexOf(p) === k) pull += Math.max(0, 1 - size[p]! / PATCH_SIZE)
    return w * (1 + AFFINITY * pull)
  }

  /**
   * Shannon entropy of what cell `i` can still become: low when one outcome dominates. The
   * rim's pull is left out, or the rim would settle first and the world grow from its edge in.
   */
  const entropy = (i: number): number => {
    let total = 0
    let sum = 0
    for (const s of options[i]!) {
      const w = weight(i, s, false)
      total += w
      sum += w * Math.log(w)
    }
    return Math.log(total) - sum / total
  }

  /** Narrows the cells round `start` to what can sit beside it, spreading while things change. */
  const propagate = (start: number): boolean => {
    const queue = [start]
    while (queue.length > 0) {
      const i = queue.pop()!
      const here = options[i]!
      for (const n of around[i]!) {
        const there = options[n]!
        const kept = there.filter((s) => here.some((h) => compatible(h, s)))
        if (kept.length === there.length) continue
        if (kept.length === 0) return false
        options[n] = kept
        queue.push(n)
      }
    }
    return true
  }

  for (let step = 0; step < cells.length; step++) {
    // The world grows out from its centre, which settles first.
    let next = step === 0 ? 0 : -1
    let lowest = Infinity
    for (let i = 0; step > 0 && i < cells.length; i++) {
      if (collapsed[i] !== null) continue
      // A whisper of noise breaks ties, so the world doesn't grow in scan order.
      const e = entropy(i) + rng.next() * 1e-3
      if (e < lowest) {
        lowest = e
        next = i
      }
    }
    if (next < 0) break
    const state = rng.weighted(
      Object.fromEntries(options[next]!.map((s) => [s, weight(next, s)])) as Record<
        CellState,
        number
      >,
    )
    collapsed[next] = state
    order.push(next)
    options[next] = [state]
    for (const n of around[next]!) {
      if (collapsed[n] !== state) continue
      const [a, b] = [root(next), root(n)]
      if (a === b) continue
      parent[b] = a
      size[a] = size[a]! + size[b]!
    }
    if (!propagate(next)) return null
  }
  return new Map(order.map((i) => [coordKey(cells[i]!), collapsed[i]!]))
}

/** Pieces are four squares, so an enclosed clearing smaller than this could never be built into. */
const SMALLEST_CLEARING = 4

/**
 * Fills in clearings shut in on every side that no piece could ever fill, each cell with the
 * biome most of its neighbours have among those that can sit beside all of them.
 */
function fillPockets(world: Map<CoordKey, CellState>, cells: readonly Coord[]): void {
  const seen = new Set<CoordKey>()
  for (const start of cells) {
    if (world.get(coordKey(start)) !== 'clearing' || seen.has(coordKey(start))) continue
    seen.add(coordKey(start))
    const pocket = [start]
    let open = false
    for (let i = 0; i < pocket.length; i++)
      for (const d of DIRECTIONS) {
        const n = neighbour(pocket[i]!, d)
        const state = world.get(coordKey(n))
        if (state === undefined) open = true
        else if (state === 'clearing' && !seen.has(coordKey(n))) {
          seen.add(coordKey(n))
          pocket.push(n)
        }
      }
    if (open || pocket.length >= SMALLEST_CLEARING) continue
    for (const c of pocket) {
      const around = DIRECTIONS.map((d) => world.get(coordKey(neighbour(c, d)))).filter(
        (s): s is Biome => s !== undefined && s !== 'clearing',
      )
      // Never water: a pond out of nowhere would only wall in the cells beside it.
      const fits = BIOMES.filter((b) => b !== 'blue' && around.every((s) => compatible(b, s)))
      const count = (b: Biome) => around.filter((s) => s === b).length
      world.set(
        coordKey(c),
        fits.reduce((best, b) => (count(b) > count(best) ? b : best)),
      )
    }
  }
}

/**
 * Cuts the solid cells into pieces. Each patch of one biome is cut into tetrominoes first; the
 * cells left over are joined, whatever their biome, into mixed tetrominoes like the player's
 * own; and what is left after that stays as single tiles, like a board's starting tiles.
 */
function cutIntoPieces(world: Map<CoordKey, CellState>, cells: readonly Coord[]): Board {
  const board: Record<string, PlacedSquare> = {}
  let piece = 0
  const solid = (c: Coord): Biome | null => {
    const state = world.get(coordKey(c))
    return state === undefined || state === 'clearing' ? null : state
  }
  const add = (coords: readonly Coord[]) => {
    for (const coord of coords) board[coordKey(coord)] = { coord, terrain: solid(coord)!, piece }
    piece++
  }

  for (const sameBiome of [true, false]) {
    /** Whether `c` is still free to go in a piece with `from`. */
    const joins = (c: Coord, from: Coord) =>
      solid(c) !== null &&
      board[coordKey(c)] === undefined &&
      (!sameBiome || solid(c) === solid(from))
    const freeAround = (c: Coord) => DIRECTIONS.filter((d) => joins(neighbour(c, d), c)).length
    // Cells a group of four can't be found from, this pass.
    const stuck = new Set<CoordKey>()
    for (;;) {
      // Start from the most hemmed-in cell left, so patches are eaten from their tips inward.
      let start: Coord | null = null
      for (const c of cells)
        if (joins(c, c) && !stuck.has(coordKey(c)) && (!start || freeAround(c) < freeAround(start)))
          start = c
      if (!start) break
      const group = [start]
      const taken = new Set([coordKey(start)])
      for (let i = 0; i < group.length && group.length < 4; i++)
        for (const d of DIRECTIONS) {
          const n = neighbour(group[i]!, d)
          if (group.length < 4 && joins(n, start) && !taken.has(coordKey(n))) {
            taken.add(coordKey(n))
            group.push(n)
          }
        }
      if (group.length === 4) add(group)
      else for (const c of group) stuck.add(coordKey(c))
    }
  }
  for (const c of cells) if (solid(c) !== null && board[coordKey(c)] === undefined) add([c])
  return inCollapseOrder(board, world)
}

/**
 * Numbers the pieces in the order their first square collapsed, so showing them in order of
 * their number replays the world growing.
 */
function inCollapseOrder(board: Board, world: Map<CoordKey, CellState>): Board {
  const step = new Map([...world.keys()].map((key, i) => [key, i]))
  const first = new Map<number, number>()
  for (const [key, square] of Object.entries(board))
    first.set(
      square.piece,
      Math.min(first.get(square.piece) ?? Infinity, step.get(key as CoordKey)!),
    )
  const renumber = new Map([...first].sort((a, b) => a[1] - b[1]).map(([piece], i) => [piece, i]))
  const ordered: Record<string, PlacedSquare> = {}
  for (const [key, square] of Object.entries(board))
    ordered[key] = { ...square, piece: renumber.get(square.piece)! }
  return ordered
}

/** A landscape to start a game in, grown from `rng`, with clearings left to build into. */
export function growLandscape(rng: Rng, radius: number = LANDSCAPE_RADIUS): Board {
  const cells = landscapeCells(radius)
  const world = collapseLandscape(rng, radius)
  fillPockets(world, cells)
  return cutIntoPieces(world, cells)
}
