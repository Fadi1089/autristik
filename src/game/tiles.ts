import type { Coord } from './coords'
import type { Rng } from './random'

export const TERRAINS = ['grass', 'forest', 'field', 'water', 'village'] as const
export type Terrain = (typeof TERRAINS)[number]

/** The terrain of a piece's four squares, in the order of its shape's squares. */
export type Terrains = readonly [Terrain, Terrain, Terrain, Terrain]

/** The seven tetrominoes. */
export const SHAPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const
export type Shape = (typeof SHAPES)[number]

/** A piece: four terrain squares laid out as a tetromino, one square per board cell. */
export interface Tetromino {
  readonly shape: Shape
  readonly terrains: Terrains
}

/** One square of a piece placed (or about to be placed) on the board. */
export interface Square {
  readonly coord: Coord
  readonly terrain: Terrain
}

/** Number of clockwise quarter turns. */
export type Rotation = 0 | 1 | 2 | 3

export function normalizeRotation(turns: number): Rotation {
  return (((turns % 4) + 4) % 4) as Rotation
}

/**
 * Square offsets from the anchor, the square under the pointer, which comes first so a
 * piece always turns around it. `q` grows east and `r` grows south.
 */
const SHAPE_OFFSETS: Readonly<Record<Shape, readonly Coord[]>> = {
  I: [
    { q: 0, r: 0 },
    { q: -1, r: 0 },
    { q: 1, r: 0 },
    { q: 2, r: 0 },
  ],
  O: [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: 0, r: 1 },
    { q: 1, r: 1 },
  ],
  T: [
    { q: 0, r: 0 },
    { q: -1, r: 0 },
    { q: 1, r: 0 },
    { q: 0, r: 1 },
  ],
  S: [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ],
  Z: [
    { q: 0, r: 0 },
    { q: -1, r: 0 },
    { q: 0, r: 1 },
    { q: 1, r: 1 },
  ],
  J: [
    { q: 0, r: 0 },
    { q: -1, r: -1 },
    { q: -1, r: 0 },
    { q: 1, r: 0 },
  ],
  L: [
    { q: 0, r: 0 },
    { q: 1, r: -1 },
    { q: -1, r: 0 },
    { q: 1, r: 0 },
  ],
}

/** A shape's square offsets after `rotation` clockwise quarter turns (seen from above). */
export function shapeOffsets(shape: Shape, rotation: Rotation = 0): Coord[] {
  return SHAPE_OFFSETS[shape].map((offset) => {
    let { q, r } = offset
    // One clockwise turn: north (0, -1) becomes east (1, 0).
    for (let turn = 0; turn < rotation; turn++) [q, r] = [-r || 0, q]
    return { q, r }
  })
}

/** Farthest any square sits from its piece's anchor, along one axis (turning only swaps axes). */
export const SHAPE_REACH = Math.max(
  ...SHAPES.flatMap((shape) => SHAPE_OFFSETS[shape].flatMap((o) => [Math.abs(o.q), Math.abs(o.r)])),
)

/** The squares a piece covers when its anchor sits on `at`. */
export function pieceSquares(piece: Tetromino, rotation: Rotation, at: Coord): Square[] {
  return shapeOffsets(piece.shape, rotation).map((offset, i) => ({
    coord: { q: at.q + offset.q, r: at.r + offset.r },
    terrain: piece.terrains[i]!,
  }))
}

const TERRAIN_WEIGHTS: Readonly<Record<Terrain, number>> = {
  grass: 4,
  forest: 3,
  field: 3,
  water: 1.5,
  village: 1,
}

/** Chance that a square copies the piece's dominant terrain, which makes pieces easier to match. */
const DOMINANT_SQUARE_CHANCE = 0.55

export function randomTerrains(rng: Rng): Terrains {
  const dominant = rng.weighted(TERRAIN_WEIGHTS)
  const pick = () =>
    rng.next() < DOMINANT_SQUARE_CHANCE ? dominant : rng.weighted(TERRAIN_WEIGHTS)
  return [pick(), pick(), pick(), pick()]
}

/** Every shape is equally likely; terrain is drawn as it was for the old 2×2 tiles. */
export function randomTetromino(rng: Rng): Tetromino {
  const shape = SHAPES[Math.floor(rng.next() * SHAPES.length)]!
  return { shape, terrains: randomTerrains(rng) }
}
