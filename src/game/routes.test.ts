import { describe, expect, it } from 'vitest'
import { EMPTY_BOARD, withPiece } from './board'
import type { Board } from './board'
import { coord, coordKey, DIRECTIONS, neighbour } from './coords'
import type { Coord } from './coords'
import { createRng } from './random'
import {
  findCities,
  findRoutes,
  findShortestPathBetweenCities,
  routeScore,
  routeTraversedCoords,
} from './routes'
import type { City } from './routes'
import type { Square, Terrain } from './tiles'

const sq = (q: number, r: number, terrain: Terrain): Square => ({ coord: coord(q, r), terrain })

/** Helper to place squares as a piece on the board. */
function laySquares(board: Board, squares: Square[]): Board {
  return withPiece(board, squares)
}

describe('findCities', () => {
  it('does not recognize fewer than 5 contiguous black squares as a city', () => {
    // 4 black squares (e.g. an O shape)
    const board = laySquares(EMPTY_BOARD, [
      sq(0, 0, 'black'),
      sq(1, 0, 'black'),
      sq(0, 1, 'black'),
      sq(1, 1, 'black'),
    ])
    expect(findCities(board)).toEqual([])
  })

  it('recognizes 5 connected black squares as a city in any shape (L, line, etc.)', () => {
    // L shape with 5 squares
    const board = laySquares(EMPTY_BOARD, [
      sq(0, 0, 'black'),
      sq(0, 1, 'black'),
      sq(0, 2, 'black'),
      sq(0, 3, 'black'),
      sq(1, 3, 'black'),
    ])
    const cities = findCities(board)
    expect(cities).toHaveLength(1)
    expect(cities[0]!.coords).toHaveLength(5)
  })

  it('identifies multiple distinct black cities', () => {
    // City 1: 5 black squares around (0,0)
    let board = laySquares(EMPTY_BOARD, [
      sq(0, 0, 'black'),
      sq(1, 0, 'black'),
      sq(0, 1, 'black'),
      sq(1, 1, 'black'),
      sq(2, 0, 'black'),
    ])
    // City 2: 5 black squares around (10,10)
    board = laySquares(board, [
      sq(10, 10, 'black'),
      sq(11, 10, 'black'),
      sq(10, 11, 'black'),
      sq(11, 11, 'black'),
      sq(12, 10, 'black'),
    ])

    const cities = findCities(board)
    expect(cities).toHaveLength(2)
  })
})

describe('findRoutes and route constraints', () => {
  it('returns no routes if there are fewer than 2 cities (cas sans routes)', () => {
    // 0 cities
    expect(findRoutes(EMPTY_BOARD)).toEqual([])

    // 1 city
    const board = laySquares(EMPTY_BOARD, [
      sq(0, 0, 'black'),
      sq(1, 0, 'black'),
      sq(0, 1, 'black'),
      sq(1, 1, 'black'),
      sq(2, 0, 'black'),
    ])
    expect(findRoutes(board)).toEqual([])
  })

  it('connects 2 cities via red squares with shortest path', () => {
    // City A at x=0..1, y=0..2
    let board = laySquares(EMPTY_BOARD, [
      sq(0, 0, 'black'),
      sq(1, 0, 'black'),
      sq(0, 1, 'black'),
      sq(1, 1, 'black'),
      sq(0, 2, 'black'),
    ])
    // City B at x=4..5, y=0..2
    board = laySquares(board, [
      sq(4, 0, 'black'),
      sq(5, 0, 'black'),
      sq(4, 1, 'black'),
      sq(5, 1, 'black'),
      sq(4, 2, 'black'),
    ])
    // Path connecting them: (2,0) and (3,0) red
    board = laySquares(board, [sq(2, 0, 'red'), sq(3, 0, 'red')])

    const routes = findRoutes(board)
    expect(routes).toHaveLength(1)
    expect(routes[0]!.traversedCoords).toEqual([coord(2, 0), coord(3, 0)])
    expect(routeScore(routes)).toBe(2)
  })

  it('strictly forbids routes from passing through blue or green squares', () => {
    // City A and City B separated by a green or blue square
    let board = laySquares(EMPTY_BOARD, [
      sq(0, 0, 'black'),
      sq(1, 0, 'black'),
      sq(0, 1, 'black'),
      sq(1, 1, 'black'),
      sq(0, 2, 'black'),
    ])
    board = laySquares(board, [
      sq(3, 0, 'black'),
      sq(4, 0, 'black'),
      sq(3, 1, 'black'),
      sq(4, 1, 'black'),
      sq(3, 2, 'black'),
    ])
    // Only connection is green:
    const greenBoard = laySquares(board, [sq(2, 0, 'green')])
    expect(findRoutes(greenBoard)).toEqual([])

    // Only connection is blue:
    const blueBoard = laySquares(board, [sq(2, 0, 'blue')])
    expect(findRoutes(blueBoard)).toEqual([])
  })

  it('allows at most 1 yellow square along the route', () => {
    let board = laySquares(EMPTY_BOARD, [
      sq(0, 0, 'black'),
      sq(1, 0, 'black'),
      sq(0, 1, 'black'),
      sq(1, 1, 'black'),
      sq(0, 2, 'black'),
    ])
    board = laySquares(board, [
      sq(4, 0, 'black'),
      sq(5, 0, 'black'),
      sq(4, 1, 'black'),
      sq(5, 1, 'black'),
      sq(4, 2, 'black'),
    ])

    // Case 1: 1 yellow and 1 red -> ALLOWED
    const boardWith1Yellow = laySquares(board, [sq(2, 0, 'yellow'), sq(3, 0, 'red')])
    const routes1 = findRoutes(boardWith1Yellow)
    expect(routes1).toHaveLength(1)
    expect(routeScore(routes1)).toBe(2)

    // Case 2: 2 yellow squares -> FORBIDDEN (cas sans routes)
    const boardWith2Yellow = laySquares(board, [sq(2, 0, 'yellow'), sq(3, 0, 'yellow')])
    expect(findRoutes(boardWith2Yellow)).toEqual([])
  })

  it('chooses the shortest path among multiple valid routes', () => {
    let board = laySquares(EMPTY_BOARD, [
      sq(0, 0, 'black'),
      sq(1, 0, 'black'),
      sq(0, 1, 'black'),
      sq(1, 1, 'black'),
      sq(0, 2, 'black'),
    ])
    board = laySquares(board, [
      sq(3, 0, 'black'),
      sq(4, 0, 'black'),
      sq(3, 1, 'black'),
      sq(4, 1, 'black'),
      sq(3, 2, 'black'),
    ])

    // Direct path: (2,0) red (length = 1 traversed cell)
    // Detour path: (1,-1), (2,-1), (3,-1) (length = 3 traversed cells)
    board = laySquares(board, [
      sq(1, -1, 'red'),
      sq(2, -1, 'red'),
      sq(3, -1, 'red'),
      sq(2, 0, 'red'),
    ])

    const routes = findRoutes(board)
    expect(routes).toHaveLength(1)
    // The shortest path (1 intermediate cell) must be chosen over the detour
    expect(routes[0]!.traversedCoords).toEqual([coord(2, 0)])
    expect(routeScore(routes)).toBe(1)
  })

  it('automatically updates the route to a newly placed shorter shortcut', () => {
    let board = laySquares(EMPTY_BOARD, [
      sq(0, 0, 'black'),
      sq(1, 0, 'black'),
      sq(0, 1, 'black'),
      sq(1, 1, 'black'),
      sq(0, 2, 'black'),
    ])
    board = laySquares(board, [
      sq(3, 0, 'black'),
      sq(4, 0, 'black'),
      sq(3, 1, 'black'),
      sq(4, 1, 'black'),
      sq(3, 2, 'black'),
    ])

    // Initially, only a detour path exists
    const boardWithDetour = laySquares(board, [
      sq(1, -1, 'red'),
      sq(2, -1, 'red'),
      sq(3, -1, 'red'),
    ])
    const initialRoutes = findRoutes(boardWithDetour)
    expect(initialRoutes).toHaveLength(1)
    expect(routeScore(initialRoutes)).toBe(3)

    // Player places a direct red tile at (2,0)
    const boardWithShortcut = laySquares(boardWithDetour, [sq(2, 0, 'red')])
    const updatedRoutes = findRoutes(boardWithShortcut)
    expect(updatedRoutes).toHaveLength(1)
    expect(updatedRoutes[0]!.traversedCoords).toEqual([coord(2, 0)])
    // The score dynamically changes from 3 to 1
    expect(routeScore(updatedRoutes)).toBe(1)
  })

  it('joins multiple cities (3+) into a Minimum Spanning Tree without redundant routes', () => {
    // City A at (0,0)
    let board = laySquares(EMPTY_BOARD, [
      sq(0, 0, 'black'),
      sq(1, 0, 'black'),
      sq(0, 1, 'black'),
      sq(1, 1, 'black'),
      sq(0, 2, 'black'),
    ])
    // City B at (3,0)
    board = laySquares(board, [
      sq(3, 0, 'black'),
      sq(4, 0, 'black'),
      sq(3, 1, 'black'),
      sq(4, 1, 'black'),
      sq(3, 2, 'black'),
    ])
    // City C at (6,0)
    board = laySquares(board, [
      sq(6, 0, 'black'),
      sq(7, 0, 'black'),
      sq(6, 1, 'black'),
      sq(7, 1, 'black'),
      sq(6, 2, 'black'),
    ])

    // Road A-B: (2,0)
    // Road B-C: (5,0)
    board = laySquares(board, [sq(2, 0, 'red'), sq(5, 0, 'red')])

    const routes = findRoutes(board)
    // Exactly 2 routes to join 3 cities
    expect(routes).toHaveLength(2)
    expect(routeScore(routes)).toBe(2)
    expect(routeTraversedCoords(routes)).toEqual([coord(2, 0), coord(5, 0)])
  })
})

/** Steps on the shortest valid path by plain breadth-first search: the reference for A*. */
function shortestByBreadthFirst(board: Board, from: City, to: City): number | null {
  let frontier = from.coords.map((c) => ({ c, yellows: 0 }))
  const seen = new Set(frontier.map(({ c }) => `${coordKey(c)}:0`))
  for (let steps = 0; frontier.length > 0; steps++) {
    if (frontier.some(({ c }) => to.coordKeys.has(coordKey(c)))) return steps
    const next: { c: Coord; yellows: number }[] = []
    for (const { c, yellows } of frontier)
      for (const d of DIRECTIONS) {
        const n = neighbour(c, d)
        const square = board[coordKey(n)]
        if (!square || square.terrain === 'blue' || square.terrain === 'green') continue
        if (from.coordKeys.has(coordKey(n))) continue
        const y = yellows + (square.terrain === 'yellow' ? 1 : 0)
        const key = `${coordKey(n)}:${y}`
        if (y > 1 || seen.has(key)) continue
        seen.add(key)
        next.push({ c: n, yellows: y })
      }
    frontier = next
  }
  return null
}

describe('findShortestPathBetweenCities', () => {
  it('finds a road as short as breadth-first search does, keeping to the rules', () => {
    const terrains: Terrain[] = ['black', 'red', 'red', 'yellow', 'green', 'blue']
    const rng = createRng(7)
    let compared = 0
    for (let round = 0; round < 300; round++) {
      // A random 12×12 board, with a city in two opposite corners.
      let board: Board = EMPTY_BOARD
      for (let q = 0; q < 12; q++)
        for (let r = 0; r < 12; r++) {
          const corner = (q < 3 && r < 2) || (q > 8 && r > 9)
          const terrain = corner ? 'black' : terrains[Math.floor(rng.next() * terrains.length)]!
          board = withPiece(board, [sq(q, r, terrain)])
        }
      const cities = findCities(board)
      const a = cities.find((city) => city.coordKeys.has('0,0'))
      const b = cities.find((city) => city.coordKeys.has('11,11'))
      if (!a || !b || a === b) continue
      compared++

      const path = findShortestPathBetweenCities(board, a, b)
      const expected = shortestByBreadthFirst(board, a, b)
      expect(path && path.length - 1).toBe(expected)
      if (!path) continue
      const inner = path.slice(1, -1).map((c) => board[coordKey(c)]!.terrain)
      expect(inner).not.toContain('green')
      expect(inner).not.toContain('blue')
      expect(inner.filter((t) => t === 'yellow').length).toBeLessThanOrEqual(1)
      path.slice(1).forEach((c, i) => {
        const prev = path[i]!
        expect(Math.abs(c.q - prev.q) + Math.abs(c.r - prev.r)).toBe(1)
      })
    }
    expect(compared).toBeGreaterThan(100)
  })
})
