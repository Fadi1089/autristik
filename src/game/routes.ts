import type { Board } from './board'
import { boardSquares } from './board'
import { coordKey, DIRECTIONS, neighbour } from './coords'
import type { Coord, CoordKey } from './coords'

export interface City {
  readonly id: number
  /** All black coordinates belonging to this city. */
  readonly coords: readonly Coord[]
  /** Fast lookup of coordinates in this city. */
  readonly coordKeys: ReadonlySet<CoordKey>
}

export interface Route {
  readonly fromCityId: number
  readonly toCityId: number
  /** Full coordinate path from starting city square to destination city square: [c0, c1, ..., cm]. */
  readonly path: readonly Coord[]
  /** The intermediate coordinates traversed between the two cities (excluding the city endpoints). */
  readonly traversedCoords: readonly Coord[]
}

/** Minimum number of connected black squares required to form a city. */
export const MIN_CITY_SIZE = 5

/**
 * Finds all black regions on the board that have at least 5 contiguous (orthogonally adjacent) squares.
 * Each such component forms a city.
 */
export function findCities(board: Board): City[] {
  const blackKeys = new Set<CoordKey>()
  for (const square of boardSquares(board)) {
    if (square.terrain === 'black') {
      blackKeys.add(coordKey(square.coord))
    }
  }

  const visited = new Set<CoordKey>()
  const cities: City[] = []
  let nextCityId = 0

  for (const key of blackKeys) {
    if (visited.has(key)) continue

    const componentCoords: Coord[] = []
    const queue: CoordKey[] = [key]
    visited.add(key)

    while (queue.length > 0) {
      const currentKey = queue.shift()!
      const square = board[currentKey]!
      componentCoords.push(square.coord)

      for (const direction of DIRECTIONS) {
        const neighborCoord = neighbour(square.coord, direction)
        const neighborKey = coordKey(neighborCoord)
        if (blackKeys.has(neighborKey) && !visited.has(neighborKey)) {
          visited.add(neighborKey)
          queue.push(neighborKey)
        }
      }
    }

    if (componentCoords.length >= MIN_CITY_SIZE) {
      // Sort coords deterministically for consistent ordering.
      componentCoords.sort((a, b) => a.r - b.r || a.q - b.q)
      cities.push({
        id: nextCityId++,
        coords: componentCoords,
        coordKeys: new Set(componentCoords.map(coordKey)),
      })
    }
  }

  return cities
}

/** A position in the search: a square, and how many yellow squares it took to get there. */
interface SearchState {
  readonly coord: Coord
  /** Yellow squares crossed so far: 0 or 1. */
  readonly yellows: number
  /** Steps taken from city A. */
  readonly steps: number
  /** Steps taken plus the fewest steps that could be left: what the search orders by. */
  readonly estimate: number
  /** Order it was found in, so ties break the same way every time. */
  readonly order: number
  readonly parent: SearchState | null
}

/**
 * Fewest steps from `c` to any square of `city` if nothing were in the way (Manhattan
 * distance). It never overestimates, and drops by at most 1 per step, so A* still finds a
 * shortest path and never has to revisit a position.
 */
function stepsAtLeast(c: Coord, city: City): number {
  let best = Infinity
  for (const target of city.coords)
    best = Math.min(best, Math.abs(target.q - c.q) + Math.abs(target.r - c.r))
  return best
}

/** Whether `a` comes out of the queue before `b`: lowest estimate first, then first found. */
const before = (a: SearchState, b: SearchState): boolean =>
  a.estimate < b.estimate || (a.estimate === b.estimate && a.order < b.order)

/** A binary min-heap of search states, ordered by `before`. */
class SearchQueue {
  private readonly heap: SearchState[] = []

  get size(): number {
    return this.heap.length
  }

  push(state: SearchState): void {
    const heap = this.heap
    heap.push(state)
    let i = heap.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (!before(heap[i]!, heap[parent]!)) break
      ;[heap[i], heap[parent]] = [heap[parent]!, heap[i]!]
      i = parent
    }
  }

  pop(): SearchState {
    const heap = this.heap
    const top = heap[0]!
    const last = heap.pop()!
    if (heap.length > 0) {
      heap[0] = last
      let i = 0
      for (;;) {
        const left = 2 * i + 1
        const right = left + 1
        let smallest = i
        if (left < heap.length && before(heap[left]!, heap[smallest]!)) smallest = left
        if (right < heap.length && before(heap[right]!, heap[smallest]!)) smallest = right
        if (smallest === i) break
        ;[heap[i], heap[smallest]] = [heap[smallest]!, heap[i]!]
        i = smallest
      }
    }
    return top
  }
}

/**
 * Finds the shortest path on the board between cityA and cityB subject to:
 * 1. Must only traverse placed board squares (cannot float off-board).
 * 2. Cannot pass through blue or green biomes.
 * 3. Can pass through at most 1 yellow biome across the route (0 or 1).
 * 4. Movement is strictly orthogonal (North, East, South, West).
 *
 * Uses A*, starting from every square of city A at once, over positions (coord, yellows) where
 * yellows is 0 or 1. Each step costs 1 and the estimate of the steps left is the Manhattan
 * distance to the nearest square of city B, so the first time a square of city B comes out of
 * the queue, the path to it is a shortest valid one.
 */
export function findShortestPathBetweenCities(
  board: Board,
  cityA: City,
  cityB: City,
): Coord[] | null {
  const queue = new SearchQueue()
  // Fewest steps found so far to each position, keyed "q,r:yellows".
  const bestSteps = new Map<string, number>()
  const done = new Set<string>()
  let order = 0

  const add = (coord: Coord, yellows: number, steps: number, parent: SearchState | null) => {
    const key = `${coordKey(coord)}:${yellows}`
    if (done.has(key) || steps >= (bestSteps.get(key) ?? Infinity)) return
    bestSteps.set(key, steps)
    const estimate = steps + stepsAtLeast(coord, cityB)
    queue.push({ coord, yellows, steps, estimate, order: order++, parent })
  }

  for (const start of cityA.coords) add(start, 0, 0, null)

  while (queue.size > 0) {
    const current = queue.pop()
    const currentKey = coordKey(current.coord)
    const stateKey = `${currentKey}:${current.yellows}`
    // A position can be queued more than once; only its first, shortest, visit counts.
    if (done.has(stateKey)) continue
    done.add(stateKey)

    // Reached a square of City B: walk back to City A.
    if (cityB.coordKeys.has(currentKey)) {
      const path: Coord[] = []
      for (let step: SearchState | null = current; step; step = step.parent)
        path.unshift(step.coord)
      return path
    }

    for (const direction of DIRECTIONS) {
      const nextCoord = neighbour(current.coord, direction)
      const nextCoordKey = coordKey(nextCoord)
      const square = board[nextCoordKey]

      // Must be on the board
      if (!square) continue

      // Forbidden biomes: blue and green
      if (square.terrain === 'blue' || square.terrain === 'green') continue

      // Do not re-enter city A
      if (cityA.coordKeys.has(nextCoordKey)) continue

      const nextYellows = current.yellows + (square.terrain === 'yellow' ? 1 : 0)

      // At most one yellow square along the route
      if (nextYellows > 1) continue

      add(nextCoord, nextYellows, current.steps + 1, current)
    }
  }

  return null
}

/** Disjoint-Set / Union-Find for Kruskal's algorithm. */
class DisjointSet {
  private parent = new Map<number, number>()

  constructor(ids: readonly number[]) {
    for (const id of ids) this.parent.set(id, id)
  }

  find(id: number): number {
    const p = this.parent.get(id) ?? id
    if (p === id) return id
    const root = this.find(p)
    this.parent.set(id, root)
    return root
  }

  union(a: number, b: number): boolean {
    const rootA = this.find(a)
    const rootB = this.find(b)
    if (rootA === rootB) return false
    this.parent.set(rootA, rootB)
    return true
  }
}

/**
 * Finds all active routes connecting the black cities (size >= 5) on the board.
 * Uses Kruskal's algorithm on shortest valid paths between city pairs to form a Minimum Spanning
 * Tree/Forest of cities with minimum total route length.
 */
export function findRoutes(board: Board, cities: readonly City[] = findCities(board)): Route[] {
  if (cities.length < 2) return []

  interface CandidateEdge {
    fromCityId: number
    toCityId: number
    path: Coord[]
    length: number
  }

  const candidates: CandidateEdge[] = []

  for (let i = 0; i < cities.length; i++) {
    for (let j = i + 1; j < cities.length; j++) {
      const cityA = cities[i]!
      const cityB = cities[j]!
      const path = findShortestPathBetweenCities(board, cityA, cityB)
      if (path && path.length >= 2) {
        // Path length in steps between the cities (number of traversed intermediate cells = path.length - 2)
        candidates.push({
          fromCityId: cityA.id,
          toCityId: cityB.id,
          path,
          length: path.length - 2,
        })
      }
    }
  }

  if (candidates.length === 0) return []

  // Sort edges by path length ascending for Kruskal's algorithm.
  candidates.sort(
    (a, b) => a.length - b.length || a.fromCityId - b.fromCityId || a.toCityId - b.toCityId,
  )

  const dsu = new DisjointSet(cities.map((c) => c.id))
  const routes: Route[] = []

  for (const candidate of candidates) {
    if (dsu.union(candidate.fromCityId, candidate.toCityId)) {
      routes.push({
        fromCityId: candidate.fromCityId,
        toCityId: candidate.toCityId,
        path: candidate.path,
        traversedCoords: candidate.path.slice(1, -1),
      })
    }
  }

  return routes
}

/**
 * Returns the unique coordinates traversed by all active routes (intermediate cells between cities).
 */
export function routeTraversedCoords(routes: readonly Route[]): Coord[] {
  const seen = new Set<CoordKey>()
  const result: Coord[] = []
  for (const route of routes) {
    for (const c of route.traversedCoords) {
      const key = coordKey(c)
      if (!seen.has(key)) {
        seen.add(key)
        result.push(c)
      }
    }
  }
  return result
}

/**
 * Returns the points contributed by active routes: 1 point for each cell traversed by a route.
 */
export function routeScore(routes: readonly Route[]): number {
  return routeTraversedCoords(routes).length
}
