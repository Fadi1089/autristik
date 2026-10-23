import { describe, expect, it } from 'vitest'
import { EMPTY_BOARD, pieceCount, withPiece } from './board'
import type { Board } from './board'
import { coordKey } from './coords'
import {
  canPlace,
  clampCursor,
  evaluatePlacement,
  nearestCandidate,
  placementCandidates,
  terrainsMatch,
} from './matching'
import { createRng } from './random'
import {
  BIOME_WEIGHTS,
  BIOMES,
  pickBiomeCount,
  pickDistinctBiomes,
  pieceSquares,
  randomTerrains,
  randomTetromino,
  SHAPES,
  shapeOffsets,
} from './tiles'
import type { Rotation, Square, Terrain } from './tiles'

const ROTATIONS: readonly Rotation[] = [0, 1, 2, 3]
const square = (q: number, r: number, terrain: Terrain): Square => ({ coord: { q, r }, terrain })

/** A board with one square of `terrain` on each listed cell, each as its own piece. */
function boardOf(cells: readonly [number, number, Terrain][]): Board {
  return cells.reduce<Board>((board, [q, r, t]) => withPiece(board, [square(q, r, t)]), EMPTY_BOARD)
}

describe('tetromino shapes', () => {
  it.each(SHAPES)(
    '%s keeps four connected squares around its anchor in every rotation',
    (shape) => {
      for (const rotation of ROTATIONS) {
        const cells = shapeOffsets(shape, rotation)
        expect(cells).toHaveLength(4)
        expect(cells[0]).toEqual({ q: 0, r: 0 })
        expect(new Set(cells.map(coordKey)).size).toBe(4)
        for (const c of cells)
          expect(cells.some((o) => Math.abs(o.q - c.q) + Math.abs(o.r - c.r) === 1)).toBe(true)
      }
    },
  )

  it('turns clockwise seen from above and comes back after four turns', () => {
    // The I piece lies east-west, then north-south after one turn.
    expect(shapeOffsets('I', 0).every((c) => c.r === 0)).toBe(true)
    expect(shapeOffsets('I', 1).every((c) => c.q === 0)).toBe(true)
    // T's stem points south; one clockwise turn makes it point west.
    expect(shapeOffsets('T', 1)).toContainEqual({ q: -1, r: 0 })
    expect(shapeOffsets('T', 1)).not.toContainEqual({ q: 1, r: 0 })
    // A fourth turn lands back on the starting orientation.
    for (const shape of SHAPES)
      expect(shapeOffsets(shape, 3).map(({ q, r }) => ({ q: -r || 0, r: q }))).toEqual(
        shapeOffsets(shape, 0),
      )
  })

  it('keeps each terrain on its square as the piece turns', () => {
    const piece = { shape: 'L' as const, terrains: ['green', 'red', 'yellow', 'blue'] as const }
    const squares = pieceSquares(piece, 2, { q: 5, r: 5 })
    expect(squares[0]).toEqual(square(5, 5, 'green'))
    expect(squares.map((s) => s.terrain)).toEqual(piece.terrains)
  })

  it('draws every shape with the same probability', () => {
    const rng = createRng(7)
    const counts = new Map<string, number>()
    const draws = 70000
    for (let i = 0; i < draws; i++) {
      const { shape } = randomTetromino(rng)
      counts.set(shape, (counts.get(shape) ?? 0) + 1)
    }
    for (const shape of SHAPES) expect(counts.get(shape)! / draws).toBeCloseTo(1 / 7, 2)
  })
})

describe('biomes distribution and generation', () => {
  it('contains the 5 required biomes', () => {
    expect(BIOMES).toEqual(['black', 'red', 'green', 'yellow', 'blue'])
  })

  it('has correct relative biome selection weights', () => {
    expect(BIOME_WEIGHTS.red).toBeCloseTo(30)
    expect(BIOME_WEIGHTS.green).toBeCloseTo(30)
    expect(BIOME_WEIGHTS.black).toBeCloseTo(17.5)
    expect(BIOME_WEIGHTS.yellow).toBeCloseTo(17.5)
    expect(BIOME_WEIGHTS.blue).toBeCloseTo(5)
    const total = Object.values(BIOME_WEIGHTS).reduce((sum, w) => sum + w, 0)
    expect(total).toBeCloseTo(100)
  })

  it('generates biome counts according to specified probabilities (15%, 45%, 25%, 15%)', () => {
    const rng = createRng(42)
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 }
    const samples = 100000
    for (let i = 0; i < samples; i++) {
      const c = pickBiomeCount(rng)
      counts[c]++
    }
    expect(counts[1] / samples).toBeCloseTo(0.15, 2)
    expect(counts[2] / samples).toBeCloseTo(0.45, 2)
    expect(counts[3] / samples).toBeCloseTo(0.25, 2)
    expect(counts[4] / samples).toBeCloseTo(0.15, 2)
  })

  it('produces 4 squares per tetromino with the expected distinct biome count', () => {
    const rng = createRng(123)
    for (let i = 0; i < 200; i++) {
      const terrains = randomTerrains(rng)
      expect(terrains).toHaveLength(4)
      for (const t of terrains) {
        expect(BIOMES).toContain(t)
      }
      const distinct = new Set(terrains).size
      expect(distinct).toBeGreaterThanOrEqual(1)
      expect(distinct).toBeLessThanOrEqual(4)
    }
  })

  it('uses the configured biome-count and biome-selection weights', () => {
    const probabilities = {
      biomeCounts: { 1: 100, 2: 0, 3: 0, 4: 0 },
      biomeWeights: { black: 0, red: 100, green: 0, yellow: 0, blue: 0 },
    }
    const rng = createRng(123)
    for (let i = 0; i < 100; i++)
      expect(randomTerrains(rng, probabilities)).toEqual(['red', 'red', 'red', 'red'])
  })

  it('excludes zero-weight biomes even when the requested distinct count is too high', () => {
    const probabilities = {
      biomeCounts: { 1: 0, 2: 0, 3: 0, 4: 100 },
      biomeWeights: { black: 0, red: 20, green: 80, yellow: 0, blue: 0 },
    }
    const rng = createRng(31)
    for (let i = 0; i < 100; i++) {
      expect(new Set(randomTerrains(rng, probabilities))).toEqual(new Set(['red', 'green']))
    }
    expect(pickDistinctBiomes(createRng(4), 4, probabilities.biomeWeights)).toHaveLength(2)
  })
})

describe('edge matching', () => {
  it('matches identical terrains only', () => {
    expect(terrainsMatch('green', 'green')).toBe(true)
    expect(terrainsMatch('green', 'red')).toBe(false)
  })

  it('compares every outer edge of the piece with the square it touches', () => {
    const board = boardOf([
      [0, -1, 'green'],
      [1, -1, 'blue'],
    ])
    // An I piece lying east-west just south of them.
    const piece = [
      square(0, 0, 'green'),
      square(1, 0, 'green'),
      square(2, 0, 'green'),
      square(3, 0, 'green'),
    ]
    const result = evaluatePlacement(board, piece)
    expect(result.neighbours).toBe(2)
    expect(result.contacts.filter((c) => c.matches)).toHaveLength(1)
    expect(result).toMatchObject({ harmonious: false, perfect: false })
  })

  it('never counts edges between the piece’s own squares', () => {
    const piece = pieceSquares({ shape: 'O', terrains: ['green', 'blue', 'yellow', 'red'] }, 0, {
      q: 0,
      r: 0,
    })
    expect(evaluatePlacement(EMPTY_BOARD, piece).neighbours).toBe(0)
  })

  it('flags harmonious placements: two or more contacts, all matching', () => {
    const board = boardOf([
      [0, -1, 'green'],
      [1, -1, 'green'],
    ])
    const piece = [
      square(0, 0, 'green'),
      square(1, 0, 'green'),
      square(0, 1, 'yellow'),
      square(1, 1, 'yellow'),
    ]
    const result = evaluatePlacement(board, piece)
    expect(result).toMatchObject({ neighbours: 2, harmonious: true, perfect: false })
  })

  it('flags perfect placements: the piece fills a gap and matches all round', () => {
    // A ring of green around a 2×2 hole.
    const ring: [number, number, Terrain][] = []
    for (let q = -1; q <= 2; q++)
      for (let r = -1; r <= 2; r++) if (q < 0 || q > 1 || r < 0 || r > 1) ring.push([q, r, 'green'])
    const board = boardOf(ring)
    const piece = pieceSquares({ shape: 'O', terrains: ['green', 'green', 'green', 'green'] }, 0, {
      q: 0,
      r: 0,
    })
    const result = evaluatePlacement(board, piece)
    expect(result).toMatchObject({ neighbours: 8, perfect: true })
  })
})

describe('placement rules', () => {
  const board = boardOf([[0, 0, 'green']])

  it('only rejects cells that overlap the board', () => {
    expect(canPlace(board, [square(1, 0, 'green'), square(2, 0, 'green')])).toBe(true)
    expect(canPlace(board, [square(0, 0, 'green'), square(1, 0, 'green')])).toBe(false)
    expect(canPlace(board, [square(1, 1, 'green')])).toBe(true)
    expect(canPlace(board, [square(5, 5, 'green')])).toBe(true)
  })

  it('starts an empty board at the origin', () => {
    expect(canPlace(EMPTY_BOARD, [square(0, 0, 'green')])).toBe(true)
    expect(canPlace(EMPTY_BOARD, [square(1, 0, 'green')])).toBe(true)
  })

  it('keeps each placed piece distinct', () => {
    const two = withPiece(withPiece(EMPTY_BOARD, [square(0, 0, 'green')]), [square(1, 0, 'green')])
    expect(pieceCount(two)).toBe(2)
    expect(two['0,0']!.piece).not.toBe(two['1,0']!.piece)
  })

  it('lists every empty neighbouring cell once', () => {
    expect(placementCandidates(board).map(coordKey).sort()).toEqual(
      ['0,-1', '1,0', '0,1', '-1,0'].sort(),
    )
  })
})

describe('keyboard cursor bounds', () => {
  it('reach every placement of every shape and rotation, from every side', () => {
    const board = boardOf([
      [0, 0, 'green'],
      [1, 0, 'green'],
      [2, 0, 'green'],
      [3, 0, 'green'],
    ])
    for (const shape of SHAPES)
      for (const rotation of ROTATIONS) {
        const piece = { shape, terrains: ['green', 'green', 'green', 'green'] as const }
        for (let q = -10; q <= 13; q++)
          for (let r = -10; r <= 10; r++) {
            if (!canPlace(board, pieceSquares(piece, rotation, { q, r }))) continue
            expect(clampCursor(board, { q, r }), `${shape} ${rotation} at ${q},${r}`).toEqual({
              q,
              r,
            })
          }
      }
  })

  it('keeps the cursor from wandering far from the board', () => {
    const board = boardOf([[0, 0, 'green']])
    expect(clampCursor(board, { q: 50, r: -50 })).toEqual({ q: 45, r: -20 })
  })
})

describe('nearestCandidate', () => {
  it('picks the open cell closest to a point', () => {
    const board = boardOf([[0, 0, 'green']])
    expect(nearestCandidate(board, { q: 5, r: 0 })).toEqual({ q: 1, r: 0 })
  })

  it('returns null for an empty board', () => {
    expect(nearestCandidate(EMPTY_BOARD, { q: 0, r: 0 })).toBeNull()
  })
})
