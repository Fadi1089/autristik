import { describe, expect, it } from 'vitest'
import { shapeOffsets, SHAPES } from '../game/tiles'
import type { Rotation } from '../game/tiles'
import { cellBoxes, coordToWorld, devicePointer, PIECE_GAP, TILE_SIZE } from './layout'
import type { Footprint } from './layout'

const ROTATIONS: readonly Rotation[] = [0, 1, 2, 3]
const half = TILE_SIZE / 2

const inside = (box: Footprint, x: number, z: number) =>
  Math.abs(x - box.x) < box.width / 2 && Math.abs(z - box.z) < box.depth / 2

describe('piece boxes', () => {
  it.each(SHAPES)(
    'cover %s pulled in evenly all round, inner corners included, without overlaps',
    (shape) => {
      for (const rotation of ROTATIONS) {
        const cells = shapeOffsets(shape, rotation)
        const boxes = cells.flatMap((c) => cellBoxes(cells, c))
        const filled = (q: number, r: number) => cells.some((c) => c.q === q && c.r === r)
        // Sample every cell and its neighbours on a fine grid that never lands on an edge.
        const steps = 20
        for (const c of cells)
          for (let i = 0; i < steps; i++)
            for (let j = 0; j < steps; j++) {
              const [cx, cz] = coordToWorld(c)
              const x = cx - half + ((i + 0.5) / steps) * TILE_SIZE
              const z = cz - half + ((j + 0.5) / steps) * TILE_SIZE
              // Kept when no cell outside the piece lies within PIECE_GAP (square distance).
              let clear = true
              for (let dq = -1; dq <= 1; dq++)
                for (let dr = -1; dr <= 1; dr++) {
                  if (filled(c.q + dq, c.r + dr)) continue
                  const [ox, oz] = coordToWorld({ q: c.q + dq, r: c.r + dr })
                  const gap = Math.max(Math.abs(x - ox) - half, Math.abs(z - oz) - half, 0)
                  if (gap < PIECE_GAP) clear = false
                }
              const covering = boxes.filter((b) => inside(b, x, z)).length
              expect(covering, `${shape} ${rotation} at ${x.toFixed(3)},${z.toFixed(3)}`).toBe(
                clear ? 1 : 0,
              )
            }
      }
    },
  )

  it('needs at most three boxes per cell, and one for a lone square', () => {
    for (const shape of SHAPES)
      for (const c of shapeOffsets(shape))
        expect(cellBoxes(shapeOffsets(shape), c).length).toBeLessThanOrEqual(3)
    expect(cellBoxes([{ q: 0, r: 0 }], { q: 0, r: 0 })).toHaveLength(1)
  })
})

describe('devicePointer', () => {
  const rect = { left: 100, top: 50, width: 800, height: 600 }

  it('maps the canvas corners and centre to device coordinates', () => {
    expect(devicePointer(100, 50, rect)).toEqual([-1, 1])
    expect(devicePointer(900, 650, rect)).toEqual([1, -1])
    expect(devicePointer(500, 350, rect)).toEqual([0, 0])
  })

  it('measures from the canvas, not from where the event landed', () => {
    // A pointer over a small label near the centre is still near the centre.
    const [x, y] = devicePointer(510, 340, rect)
    expect(x).toBeCloseTo(0.025)
    expect(y).toBeCloseTo(1 / 30)
  })
})
