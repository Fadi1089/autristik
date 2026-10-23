import type { Coord } from './coords'
import type { Rng } from './random'

/**
 * 5 biomes available:
 * - black (noir)
 * - red (rouge)
 * - green (vert)
 * - yellow (jaune)
 * - blue (bleu)
 */
export const BIOMES = ['black', 'red', 'green', 'yellow', 'blue'] as const
export type Biome = (typeof BIOMES)[number]

/** Alias for compatibility with existing terrain terminology. */
export const TERRAINS = BIOMES
export type Terrain = Biome

/** The biome/terrain of a piece's four squares, in the order of its shape's squares. */
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

export interface BiomeCountWeights {
  readonly 1: number
  readonly 2: number
  readonly 3: number
  readonly 4: number
}

export interface BiomeProbabilities {
  readonly biomeCounts: BiomeCountWeights
  readonly biomeWeights: Readonly<Record<Biome, number>>
}

/**
 * Default biome probabilities:
 * - Counts: 45% 2 biomes, 25% 3 biomes, 15% 1 biome, 15% 4 biomes.
 * - Selection: Red 30%, Green 30%, Black 17.5%, Yellow 17.5%, Blue 5%.
 */
export const DEFAULT_BIOME_PROBABILITIES: BiomeProbabilities = {
  biomeCounts: {
    1: 15,
    2: 45,
    3: 25,
    4: 15,
  },
  biomeWeights: {
    red: 30,
    green: 30,
    black: 17.5,
    yellow: 17.5,
    blue: 5,
  },
}

export const BIOME_WEIGHTS = DEFAULT_BIOME_PROBABILITIES.biomeWeights
export const TERRAIN_WEIGHTS = BIOME_WEIGHTS

/**
 * Pick up to `count` distinct biomes without replacement. Zero-weight biomes are excluded.
 */
export function pickDistinctBiomes(
  rng: Rng,
  count: number,
  weights: Readonly<Record<Biome, number>> = DEFAULT_BIOME_PROBABILITIES.biomeWeights,
): Biome[] {
  const pool = BIOMES.filter((biome) => Number.isFinite(weights[biome]) && weights[biome] > 0)
  // Settings prevent an all-zero configuration, but a malformed direct caller still gets a piece.
  if (pool.length === 0) return pickDistinctBiomes(rng, count)
  const chosen: Biome[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const activeWeights: Record<string, number> = {}
    for (const b of pool) {
      activeWeights[b] = weights[b]
    }
    const picked = rng.weighted(activeWeights) as Biome
    chosen.push(picked)
    const idx = pool.indexOf(picked)
    if (idx >= 0) pool.splice(idx, 1)
  }
  return chosen
}

/**
 * Number of biomes per tetromino (4 squares).
 */
export function pickBiomeCount(
  rng: Rng,
  counts: BiomeCountWeights = DEFAULT_BIOME_PROBABILITIES.biomeCounts,
): 1 | 2 | 3 | 4 {
  const c1 = Math.max(0, counts[1] ?? 0)
  const c2 = Math.max(0, counts[2] ?? 0)
  const c3 = Math.max(0, counts[3] ?? 0)
  const c4 = Math.max(0, counts[4] ?? 0)
  const total = c1 + c2 + c3 + c4
  if (total <= 0) return 2
  const roll = rng.next() * total
  if (roll < c1) return 1
  if (roll < c1 + c2) return 2
  if (roll < c1 + c2 + c3) return 3
  return 4
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const res = [...arr]
  for (let i = res.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1))
    const temp = res[i]!
    res[i] = res[j]!
    res[j] = temp
  }
  return res
}

/**
 * Generates 4 squares for a tetromino according to the biome count distribution
 * and biome weights.
 */
export function randomTerrains(rng: Rng, probs?: BiomeProbabilities): Terrains {
  const counts = probs?.biomeCounts ?? DEFAULT_BIOME_PROBABILITIES.biomeCounts
  const weights = probs?.biomeWeights ?? DEFAULT_BIOME_PROBABILITIES.biomeWeights

  const requestedCount = pickBiomeCount(rng, counts)
  const biomes = pickDistinctBiomes(rng, requestedCount, weights)
  const count = biomes.length

  switch (count) {
    case 1: {
      const b = biomes[0]!
      return [b, b, b, b]
    }
    case 2: {
      const [b1, b2] = biomes
      const extra1 = rng.next() < 0.5 ? b1! : b2!
      const extra2 = rng.next() < 0.5 ? b1! : b2!
      return shuffle([b1!, b2!, extra1, extra2], rng) as unknown as Terrains
    }
    case 3: {
      const [b1, b2, b3] = biomes
      const dup = [b1!, b2!, b3!][Math.floor(rng.next() * 3)]!
      return shuffle([b1!, b2!, b3!, dup], rng) as unknown as Terrains
    }
    case 4: {
      return shuffle(biomes, rng) as unknown as Terrains
    }
    default:
      throw new Error('A tetromino needs at least one available biome')
  }
}

/** Every shape is equally likely; biomes are drawn per the specified probabilities. */
export function randomTetromino(rng: Rng, probs?: BiomeProbabilities): Tetromino {
  const shape = SHAPES[Math.floor(rng.next() * SHAPES.length)]!
  return { shape, terrains: randomTerrains(rng, probs) }
}
