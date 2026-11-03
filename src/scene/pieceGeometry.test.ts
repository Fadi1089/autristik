import { describe, expect, it } from 'vitest'
import { shapeOffsets, SHAPES } from '../game/tiles'
import type { Rotation, Square, Terrain } from '../game/tiles'
import { BASE_HEIGHT, cellBoxes, TERRAIN_HEIGHT } from './layout'
import { footprintOutline, pieceGeometry, terrainRegions } from './pieceGeometry'

const ROTATIONS: readonly Rotation[] = [0, 1, 2, 3]

/** Shoelace area of a closed outline. */
function area(points: readonly [number, number][]): number {
  let sum = 0
  points.forEach(([x, z], i) => {
    const [nx, nz] = points[(i + 1) % points.length]!
    sum += x * nz - nx * z
  })
  return Math.abs(sum) / 2
}

const piece = (shape: (typeof SHAPES)[number], terrains: Terrain[], rotation: Rotation = 0) =>
  shapeOffsets(shape, rotation).map((coord, i): Square => ({ coord, terrain: terrains[i]! }))

describe('terrainRegions', () => {
  it('joins same-biome squares that share an edge, and only those', () => {
    const regions = terrainRegions(piece('I', ['red', 'red', 'blue', 'red']))
    // I offsets run (0,0) (-1,0) (1,0) (2,0): red at -1..0, blue at 1, red at 2.
    expect(regions.map((r) => [r.terrain, r.cells.length]).sort()).toEqual(
      [
        ['blue', 1],
        ['red', 1],
        ['red', 2],
      ].sort(),
    )
  })
})

describe('footprintOutline', () => {
  it('traces the outline of every shape', () => {
    for (const shape of SHAPES)
      for (const rotation of ROTATIONS) {
        const cells = shapeOffsets(shape, rotation)
        const boxes = cells.flatMap((c) => cellBoxes(cells, c))
        const boxArea = boxes.reduce((sum, b) => sum + b.width * b.depth, 0)
        const outline = footprintOutline(boxes)
        expect(area(outline), `${shape} ${rotation}`).toBeCloseTo(boxArea, 9)
        // An I has 4 corners, an O 4, and every other tetromino 6 or 8.
        expect([4, 6, 8]).toContain(outline.length)
      }
  })

  it('follows the soil where two biomes of one piece meet at its edge', () => {
    // An O split into a red west half and a blue east half: each half is one straight strip.
    const squares = piece('O', ['red', 'blue', 'red', 'blue'])
    const cells = squares.map((s) => s.coord)
    for (const region of terrainRegions(squares)) {
      const outline = footprintOutline(region.cells.flatMap((c) => cellBoxes(cells, c)))
      expect(outline).toHaveLength(4)
    }
  })
})

describe('pieceGeometry', () => {
  it('stacks the biomes on the soil, each at its height, with nothing reaching below the soil top', () => {
    const geometry = pieceGeometry(piece('T', ['black', 'blue', 'black', 'black']))
    geometry.computeBoundingBox()
    expect(geometry.boundingBox!.min.y).toBeCloseTo(0, 6)
    expect(geometry.boundingBox!.max.y).toBeCloseTo(BASE_HEIGHT + TERRAIN_HEIGHT.black, 6)
    expect(geometry.getAttribute('color').count).toBe(geometry.getAttribute('position').count)
  })

  it('keeps every layer inside the footprint of the soil, corners rounded off', () => {
    for (const shape of SHAPES) {
      const squares = piece(shape, ['red', 'green', 'blue', 'yellow'])
      const cells = squares.map((s) => s.coord)
      const boxes = cells.flatMap((c) => cellBoxes(cells, c))
      const position = pieceGeometry(squares).getAttribute('position')
      // Positions are float32, so allow for rounding.
      for (let i = 0; i < position.count; i++) {
        const [x, z] = [position.getX(i), position.getZ(i)]
        const inside = boxes.some(
          (b) => Math.abs(x - b.x) <= b.width / 2 + 1e-6 && Math.abs(z - b.z) <= b.depth / 2 + 1e-6,
        )
        expect(inside, `${shape} vertex ${x},${z}`).toBe(true)
      }
    }
  })
})
