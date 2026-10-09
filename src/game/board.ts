import { coord, coordKey, DIRECTIONS, neighbour, oppositeDirection } from './coords'
import type { Coord } from './coords'
import type { Rng } from './random'
import { facingQuadrants, randomQuadrants } from './tiles'
import type { Quadrants, Terrain } from './tiles'

export interface PlacedTile {
  readonly coord: Coord
  /** Sub-square terrains after rotation, in Quadrant order. */
  readonly quadrants: Quadrants
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
