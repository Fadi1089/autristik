import type { Coord } from '../game/coords'
import type { Quadrant, Terrain } from '../game/tiles'
import { quadrantOffset } from '../game/tiles'

/** World-space size of one grid square. Tiles sit flush against each other. */
export const TILE_SIZE = 1
/** Side length of one of the four terrain squares on a tile. */
export const QUADRANT_SIZE = TILE_SIZE / 2
/** Height of the soil block every tile sits on. */
export const BASE_HEIGHT = 0.22

/** Height of each terrain block above the soil. */
export const TERRAIN_HEIGHT: Readonly<Record<Terrain, number>> = {
  water: 0.025,
  grass: 0.06,
  field: 0.08,
  forest: 0.14,
  village: 0.18,
  rainbow: 0.1,
  void: 0.1,
  bedrock: 0.12,
}

export function coordToWorld({ q, r }: Coord): [x: number, z: number] {
  return [q * TILE_SIZE, r * TILE_SIZE]
}

export function worldToCoord(x: number, z: number): Coord {
  // `|| 0` folds -0 into 0 so coordinates compare and key cleanly.
  return { q: Math.round(x / TILE_SIZE) || 0, r: Math.round(z / TILE_SIZE) || 0 }
}

/** Centre of a terrain square relative to its tile's centre. */
export function quadrantToLocal(quadrant: Quadrant): [x: number, z: number] {
  const { x, z } = quadrantOffset(quadrant)
  return [(x * QUADRANT_SIZE) / 2, (z * QUADRANT_SIZE) / 2]
}
