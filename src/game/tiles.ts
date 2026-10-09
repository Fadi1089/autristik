import { oppositeDirection } from './coords'
import type { Direction } from './coords'
import type { Rng } from './random'

export const TERRAINS = ['grass', 'forest', 'field', 'water', 'village'] as const
export type Terrain = (typeof TERRAINS)[number]

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

const TERRAIN_WEIGHTS: Readonly<Record<Terrain, number>> = {
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
