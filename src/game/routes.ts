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

interface BfsState {
  coord: Coord
  yellows: number
}

/**
 * Finds the shortest path on the board between cityA and cityB subject to:
 * 1. Must only traverse placed board squares (cannot float off-board).
 * 2. Cannot pass through blue or green biomes.
 * 3. Can pass through at most 1 yellow biome across the route (0 or 1).
 * 4. Movement is strictly orthogonal (North, East, South, West).
 *
 * Uses multi-source BFS in a state space (coord, yellows) where yellows in {0, 1}.
 * Since step cost is uniform (= 1), BFS is guaranteed to find the shortest valid path.
 */
export function findShortestPathBetweenCities(
  board: Board,
  cityA: City,
  cityB: City,
): Coord[] | null {
  const queue: BfsState[] = []
  // Key: "q,r:yellows" -> parent BfsState | null
  const visited = new Map<string, BfsState | null>()

  for (const startCoord of cityA.coords) {
    const state: BfsState = { coord: startCoord, yellows: 0 }
    const stateKey = `${coordKey(startCoord)}:0`
    visited.set(stateKey, null)
    queue.push(state)
  }

  while (queue.length > 0) {
    const current = queue.shift()!
    const currentKey = coordKey(current.coord)

    // Check if we have reached any square of City B
    if (cityB.coordKeys.has(currentKey)) {
      // Reconstruct path backwards
      const path: Coord[] = []
      let step: BfsState | null = current
      while (step !== null) {
        path.unshift(step.coord)
        const stepKey: string = `${coordKey(step.coord)}:${step.yellows}`
        step = visited.get(stepKey) ?? null
      }
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

      const isYellow = square.terrain === 'yellow'
      const nextYellows = current.yellows + (isYellow ? 1 : 0)

      // At most one yellow square along the route
      if (nextYellows > 1) continue

      const nextStateKey = `${nextCoordKey}:${nextYellows}`
      if (visited.has(nextStateKey)) continue

      visited.set(nextStateKey, current)
      queue.push({ coord: nextCoord, yellows: nextYellows })
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
