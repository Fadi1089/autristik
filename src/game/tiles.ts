import { oppositeDirection } from './coords'
import type { Direction } from './coords'
import type { Rng } from './random'

export const REGULAR_TERRAINS = ['grass', 'forest', 'field', 'water', 'village'] as const
export const TERRAINS = [...REGULAR_TERRAINS, 'rainbow', 'void', 'bedrock'] as const
export type Terrain = (typeof TERRAINS)[number]
export type TileMultiplier = 1 | 2 | 3 | 5
export interface TileDraw {
  readonly quadrants: Quadrants
  readonly multiplier: TileMultiplier
}

/**
 * A tile is a 2×2 grid of terrain squares. Quadrants are numbered clockwise from
 * the north-west corner, matching the clockwise order of Direction.
 */
export const Quadrant = {
  NorthWest: 0,
  NorthEast: 1,
  SouthEast: 2,
  SouthWest: 3,
} as const
export type Quadrant = (typeof Quadrant)[keyof typeof Quadrant]

export const QUADRANTS: readonly Quadrant[] = [
  Quadrant.NorthWest,
  Quadrant.NorthEast,
  Quadrant.SouthEast,
  Quadrant.SouthWest,
]

/** Terrain of each sub-square, in Quadrant order: [NW, NE, SE, SW]. */
export type Quadrants = readonly [Terrain, Terrain, Terrain, Terrain]

/** Number of clockwise quarter turns. */
export type Rotation = 0 | 1 | 2 | 3

export function normalizeRotation(turns: number): Rotation {
  return (((turns % 4) + 4) % 4) as Rotation
}

/** Column (-1 west, +1 east) and row (-1 north, +1 south) of a quadrant inside its tile. */
export function quadrantOffset(quadrant: Quadrant): { readonly x: -1 | 1; readonly z: -1 | 1 } {
  return {
    x: quadrant === Quadrant.NorthWest || quadrant === Quadrant.SouthWest ? -1 : 1,
    z: quadrant === Quadrant.NorthWest || quadrant === Quadrant.NorthEast ? -1 : 1,
  }
}

/**
 * The two quadrants along one side, ordered clockwise around the tile.
 * North is [NW, NE], east is [NE, SE], south is [SE, SW], west is [SW, NW].
 */
export function sideQuadrants(direction: Direction): readonly [Quadrant, Quadrant] {
  return [normalizeRotation(direction) as Quadrant, normalizeRotation(direction + 1) as Quadrant]
}

/**
 * Pairs each quadrant on our `direction` side with the neighbour quadrant it touches,
 * as [ours, theirs]. Our north-west square touches the northern neighbour's
 * south-west square, our north-east touches its south-east, and so on.
 */
export function facingQuadrants(direction: Direction): readonly [Quadrant, Quadrant][] {
  const [a, b] = sideQuadrants(direction)
  const [c, d] = sideQuadrants(oppositeDirection(direction))
  // Both sides are listed clockwise, so they run in opposite directions along the seam.
  return [
    [a, d],
    [b, c],
  ]
}

/**
 * Rotates a tile clockwise (seen from above) by `turns` quarter turns:
 * after one turn the old north-west square sits in the north-east corner.
 */
export function rotateQuadrants(quadrants: Quadrants, turns: number): Quadrants {
  const t = normalizeRotation(turns)
  const at = (q: Quadrant) => quadrants[normalizeRotation(q - t)]
  return [
    at(Quadrant.NorthWest),
    at(Quadrant.NorthEast),
    at(Quadrant.SouthEast),
    at(Quadrant.SouthWest),
  ]
}

const TERRAIN_WEIGHTS: Readonly<Record<(typeof REGULAR_TERRAINS)[number], number>> = {
  grass: 4,
  forest: 3,
  field: 3,
  water: 1.5,
  village: 1,
}

/** Chance that a quadrant copies the tile's dominant terrain, which makes tiles easier to match. */
const DOMINANT_QUADRANT_CHANCE = 0.55

export function randomQuadrants(rng: Rng): Quadrants {
  const dominant = rng.weighted(TERRAIN_WEIGHTS)
  const pick = () =>
    rng.next() < DOMINANT_QUADRANT_CHANCE ? dominant : rng.weighted(TERRAIN_WEIGHTS)
  return [pick(), pick(), pick(), pick()]
}

/** A whole joker tile (rendered gold); keep its original terrain id in the game model. */
export const RAINBOW_TILE: Quadrants = ['rainbow', 'rainbow', 'rainbow', 'rainbow']
export const RAINBOW_TILE_CHANCE = 0.05
export const VOID_TILE: Quadrants = ['void', 'void', 'void', 'void']
export const VOID_UNLOCK_PLACEMENTS = 20
export const VOID_TILE_CHANCE = 0.01
export const BEDROCK_TILE: Quadrants = ['bedrock', 'bedrock', 'bedrock', 'bedrock']

/** Special terrains are whole tiles, never individual patches on a normal draw. */
export function tileKind(quadrants: Quadrants): 'normal' | 'gold' | 'void' | 'bedrock' {
  if (quadrants.every((terrain) => terrain === 'rainbow')) return 'gold'
  if (quadrants.every((terrain) => terrain === 'void')) return 'void'
  if (quadrants.every((terrain) => terrain === 'bedrock')) return 'bedrock'
  return 'normal'
}

/** Gold 5%, void 1% after 20 placements, bedrock 4%, bronze 6%, silver 3%, diamond 1%. */
export function randomTile(rng: Rng, placements = 0): TileDraw {
  const roll = rng.next()
  if (roll < RAINBOW_TILE_CHANCE) return { quadrants: RAINBOW_TILE, multiplier: 1 }
  if (roll < 0.08) {
    if (placements >= VOID_UNLOCK_PLACEMENTS && roll < RAINBOW_TILE_CHANCE + VOID_TILE_CHANCE)
      return { quadrants: VOID_TILE, multiplier: 1 }
    return { quadrants: randomQuadrants(rng), multiplier: 1 }
  }
  if (roll < 0.12) return { quadrants: BEDROCK_TILE, multiplier: 1 }
  const multiplier = roll < 0.18 ? 2 : roll < 0.21 ? 3 : roll < 0.22 ? 5 : 1
  return { quadrants: randomQuadrants(rng), multiplier }
}

/** Draw from the playable supply; the starting island uses regular terrain only. */
export function randomTileQuadrants(rng: Rng, placements = 0): Quadrants {
  return randomTile(rng, placements).quadrants
}
