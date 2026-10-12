import { coord, coordKey, DIRECTIONS, neighbour, oppositeDirection } from './coords'
import type { Coord } from './coords'
import type { Rng } from './random'
import { facingQuadrants, randomQuadrants, tileKind } from './tiles'
import type { Quadrants, Terrain, TileMultiplier } from './tiles'

export interface PlacedTile {
  readonly coord: Coord
  /** Sub-square terrains after rotation, in Quadrant order. */
  readonly quadrants: Quadrants
  readonly multiplier?: TileMultiplier
}

/** Placed tiles keyed by coordKey. */
export type Board = Readonly<Record<string, PlacedTile>>

export const EMPTY_BOARD: Board = {}

export function getTile(board: Board, c: Coord): PlacedTile | undefined {
  return board[coordKey(c)]
}

export function isOccupied(board: Board, c: Coord): boolean {
  return getTile(board, c) !== undefined
}

export function withTile(board: Board, tile: PlacedTile): Board {
  return { ...board, [coordKey(tile.coord)]: tile }
}

export function boardTiles(board: Board): PlacedTile[] {
  return Object.values(board)
}

export function tileCount(board: Board): number {
  return Object.keys(board).length
}

/** Occupied cells in the eight-neighbour blast area; diagonals are included. */
export function destructionTargets(board: Board, centre: Coord): Coord[] {
  return boardTiles(board)
    .filter(
      (tile) =>
        tileKind(tile.quadrants) !== 'bedrock' &&
        Math.abs(tile.coord.q - centre.q) <= 1 &&
        Math.abs(tile.coord.r - centre.r) <= 1,
    )
    .map((tile) => tile.coord)
}

export function withoutTiles(board: Board, coords: readonly Coord[]): Board {
  const removed = new Set<string>(coords.map(coordKey))
  return Object.fromEntries(
    Object.entries(board).filter(
      ([key, tile]) => !removed.has(key) || tileKind(tile.quadrants) === 'bedrock',
    ),
  )
}

const islandCache = new WeakMap<Board, readonly Board[]>()

/** Cardinally connected islands, cached by immutable board identity for animation-frame callers. */
export function boardIslands(board: Board): readonly Board[] {
  const cached = islandCache.get(board)
  if (cached) return cached
  const remaining = new Map(Object.entries(board))
  const islands: Board[] = []
  while (remaining.size) {
    const first = remaining.values().next().value!
    const queue = [first]
    const island: Record<string, PlacedTile> = {}
    remaining.delete(coordKey(first.coord))
    for (let i = 0; i < queue.length; i++) {
      const tile = queue[i]!
      island[coordKey(tile.coord)] = tile
      for (const direction of DIRECTIONS) {
        const key = coordKey(neighbour(tile.coord, direction))
        const next = remaining.get(key)
        if (next) {
          remaining.delete(key)
          queue.push(next)
        }
      }
    }
    islands.push(island)
  }
  islandCache.set(board, islands)
  return islands
}

export function boardIsland(board: Board, anchor: Coord): Board {
  return boardIslands(board).find((island) => isOccupied(island, anchor)) ?? board
}

const START_TILE: Quadrants = ['grass', 'forest', 'field', 'water']

/**
 * A centre tile plus one tile on each side. The side tiles are random, but the
 * two squares facing the centre always match it, so the starting board is harmonious.
 */
export function createStartingBoard(rng: Rng): Board {
  const centre = coord(0, 0)
  let board = withTile(EMPTY_BOARD, { coord: centre, quadrants: START_TILE })

  for (const d of DIRECTIONS) {
    const quadrants = [...randomQuadrants(rng)] as [Terrain, Terrain, Terrain, Terrain]
    for (const [mine, theirs] of facingQuadrants(oppositeDirection(d))) {
      quadrants[mine] = START_TILE[theirs]
    }
    board = withTile(board, { coord: neighbour(centre, d), quadrants })
  }
  return board
}
