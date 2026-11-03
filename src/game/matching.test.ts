import { describe, expect, it } from 'vitest'
import { EMPTY_BOARD, pieceCount, withPiece } from './board'
import type { Board } from './board'
import { coordKey } from './coords'
import {
  blueConflict,
  canPlace,
  clampCursor,
  evaluatePlacement,
  nearestCandidate,
  placementAnchors,
  placementCandidates,
  terrainsMatch,
} from './matching'
import { createRng } from './random'
import {
  BIOME_WEIGHTS,
  BIOMES,
  pickBiomeCount,
  pickDistinctBiomes,
  validBiomeProbabilities,
  DEFAULT_BIOME_PROBABILITIES,
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

  it('gives each picked biome a square and fills the rest by their normalized weights', () => {
    const probabilities = {
      biomeCounts: { 1: 0, 2: 100, 3: 0, 4: 0 },
      biomeWeights: { black: 0, red: 30, green: 0, yellow: 0, blue: 5 },
    }
    const rng = createRng(77)
    const samples = 20000
    let reds = 0
    for (let i = 0; i < samples; i++) {
      const terrains = randomTerrains(rng, probabilities)
      expect(new Set(terrains)).toEqual(new Set(['red', 'blue']))
      reds += terrains.filter((t) => t === 'red').length
    }
    // One guaranteed red, plus two squares that are red 30 / 35 of the time.
    expect(reds / samples).toBeCloseTo(1 + 2 * (30 / 35), 1)
  })

  it('fills the one free square of a 3-biome piece by the picked weights', () => {
    const probabilities = {
      biomeCounts: { 1: 0, 2: 0, 3: 100, 4: 0 },
      biomeWeights: { black: 0, red: 60, green: 30, yellow: 10, blue: 0 },
    }
    const rng = createRng(5)
    const samples = 20000
    const extra = { red: 0, green: 0, yellow: 0 }
    for (let i = 0; i < samples; i++) {
      const terrains = randomTerrains(rng, probabilities)
      expect(new Set(terrains)).toEqual(new Set(['red', 'green', 'yellow']))
      const doubled = terrains.find((t, j) => terrains.indexOf(t) !== j) as keyof typeof extra
      extra[doubled]++
    }
    expect(extra.red / samples).toBeCloseTo(0.6, 1)
    expect(extra.green / samples).toBeCloseTo(0.3, 1)
    expect(extra.yellow / samples).toBeCloseTo(0.1, 1)
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

  it('only accepts settings with enough biomes for the largest biome count', () => {
    const valid = (counts: [number, number, number, number], weights: number[]) =>
      validBiomeProbabilities({
        biomeCounts: { 1: counts[0], 2: counts[1], 3: counts[2], 4: counts[3] },
        biomeWeights: {
          black: weights[0] ?? 0,
          red: weights[1] ?? 0,
          green: weights[2] ?? 0,
          yellow: weights[3] ?? 0,
          blue: weights[4] ?? 0,
        },
      })
    expect(valid([100, 0, 0, 0], [0, 100])).toBe(true)
    expect(valid([0, 100, 0, 0], [0, 100])).toBe(false)
    expect(valid([0, 100, 0, 0], [0, 100, 50])).toBe(true)
    expect(valid([0, 0, 99, 0], [0, 0, 0, 1, 9])).toBe(false) // three asked, two available
    expect(valid([0, 0, 99, 0], [0, 0, 5, 1, 9])).toBe(true)
    expect(valid([10, 10, 10, 10], [1, 1, 1, 1])).toBe(true)
    expect(valid([10, 10, 10, 10], [1, 1, 1])).toBe(false)
    expect(valid([0, 0, 0, 0], [1, 1, 1, 1, 1])).toBe(false)
    expect(validBiomeProbabilities(DEFAULT_BIOME_PROBABILITIES)).toBe(true)
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

  it('needs the piece to touch the board along an edge, without overlapping it', () => {
    expect(canPlace(board, [square(1, 0, 'green'), square(2, 0, 'green')])).toBe(true)
    expect(canPlace(board, [square(0, 0, 'green'), square(1, 0, 'green')])).toBe(false)
    expect(canPlace(board, [square(1, 1, 'green')])).toBe(false) // corner only
    expect(canPlace(board, [square(5, 5, 'green')])).toBe(false)
  })

  it('lays blue against any biome, but only blue against blue on the board', () => {
    expect(canPlace(board, [square(1, 0, 'red')])).toBe(true)
    expect(canPlace(board, [square(1, 0, 'blue')])).toBe(true)
    const water = boardOf([[0, 0, 'blue']])
    expect(canPlace(water, [square(1, 0, 'blue')])).toBe(true)
    expect(canPlace(water, [square(1, 0, 'yellow')])).toBe(false)
  })

  it('rejects a piece if any of its non-blue squares touches blue on the board', () => {
    const shore = boardOf([
      [0, 0, 'blue'],
      [1, 0, 'green'],
    ])
    expect(canPlace(shore, [square(0, 1, 'blue'), square(1, 1, 'green')])).toBe(true)
    expect(canPlace(shore, [square(0, 1, 'blue'), square(1, 1, 'blue')])).toBe(true)
    expect(canPlace(shore, [square(0, 1, 'green'), square(1, 1, 'green')])).toBe(false)
    expect(blueConflict('blue', 'red')).toBe(true) // red laid against blue
    expect(blueConflict('red', 'blue')).toBe(false) // blue laid against red
    expect(blueConflict('blue', 'blue')).toBe(false)
    expect(blueConflict('red', 'green')).toBe(false)
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

describe('placementAnchors', () => {
  const board = boardOf([
    [0, 0, 'green'],
    [1, 0, 'blue'],
  ])
  const pieces = SHAPES.map((shape) => ({
    shape,
    terrains: ['green', 'blue', 'red', 'green'] as const,
  }))

  it('lists exactly the anchors where the piece fits at that rotation', () => {
    for (const piece of pieces)
      for (const rotation of ROTATIONS) {
        const expected: string[] = []
        for (let r = -6; r <= 6; r++)
          for (let q = -6; q <= 7; q++)
            if (canPlace(board, pieceSquares(piece, rotation, { q, r })))
              expected.push(coordKey({ q, r }))
        const anchors = placementAnchors(board, piece, rotation).map(coordKey)
        expect(anchors.sort(), `${piece.shape} ${rotation}`).toEqual(expected.sort())
      }
  })

  it('changes as the piece turns', () => {
    const I = pieces.find((p) => p.shape === 'I')!
    expect(placementAnchors(board, I, 0)).not.toEqual(placementAnchors(board, I, 1))
  })

  it('finds nothing for a piece without blue on an all-blue board', () => {
    const lake = boardOf([[0, 0, 'blue']])
    const field = { shape: 'O' as const, terrains: ['red', 'red', 'red', 'red'] as const }
    for (const rotation of ROTATIONS) expect(placementAnchors(lake, field, rotation)).toEqual([])
    const water = { shape: 'O' as const, terrains: ['blue', 'blue', 'blue', 'blue'] as const }
    expect(placementAnchors(boardOf([[0, 0, 'green']]), water, 0)).not.toEqual([])
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
