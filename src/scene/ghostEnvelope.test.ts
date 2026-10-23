import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { pieceSquares, SHAPES } from '../game/tiles'
import type { Rotation } from '../game/tiles'
import { createGhostEnvelope, GHOST_ENVELOPE_SCALE } from './ghostEnvelope'
import { BASE_HEIGHT, cellBoxes, TERRAIN_HEIGHT } from './layout'

describe('ghost envelope', () => {
  it.each(SHAPES)(
    'wraps %s about its centre, with only exterior faces at every rotation',
    (shape) => {
      for (const rotation of [0, 1, 2, 3] as const satisfies readonly Rotation[]) {
        const squares = pieceSquares(
          { shape, terrains: ['black', 'blue', 'red', 'green'] },
          rotation,
          { q: 0, r: 0 },
        )
        const cells = squares.map((square) => square.coord)
        const boxes = squares.flatMap((square) =>
          cellBoxes(cells, square.coord).map((box) => ({
            ...box,
            height: BASE_HEIGHT + TERRAIN_HEIGHT[square.terrain],
          })),
        )
        const min = new Vector3(
          Math.min(...boxes.map((box) => box.x - box.width / 2)),
          0,
          Math.min(...boxes.map((box) => box.z - box.depth / 2)),
        )
        const max = new Vector3(
          Math.max(...boxes.map((box) => box.x + box.width / 2)),
          Math.max(...boxes.map((box) => box.height)),
          Math.max(...boxes.map((box) => box.z + box.depth / 2)),
        )
        const centre = min.clone().add(max).multiplyScalar(0.5)
        const inside = (p: Vector3) =>
          boxes.some(
            (box) =>
              Math.abs(p.x - box.x) < box.width / 2 &&
              Math.abs(p.z - box.z) < box.depth / 2 &&
              p.y > 0 &&
              p.y < box.height,
          )
        const geometry = createGhostEnvelope(squares)
        const positions = geometry.getAttribute('position')
        const normals = geometry.getAttribute('normal')
        expect(geometry.boundingBox!.getCenter(new Vector3()).distanceTo(centre)).toBeLessThan(1e-6)
        expect(
          geometry
            .boundingBox!.getSize(new Vector3())
            .distanceTo(max.clone().sub(min).multiplyScalar(GHOST_ENVELOPE_SCALE)),
        ).toBeLessThan(1e-6)
        for (let i = 0; i < positions.count; i += 3) {
          const midpoint = new Vector3()
          for (let vertex = 0; vertex < 3; vertex++)
            midpoint.add(new Vector3().fromBufferAttribute(positions, i + vertex))
          midpoint.divideScalar(3).sub(centre).divideScalar(GHOST_ENVELOPE_SCALE).add(centre)
          const normal = new Vector3().fromBufferAttribute(normals, i).multiplyScalar(0.00001)
          // An exterior face must have solid volume on its inward side and air on its outward side.
          expect(inside(midpoint.clone().sub(normal))).toBe(true)
          expect(inside(midpoint.clone().add(normal))).toBe(false)
        }
        geometry.dispose()
      }
    },
  )

  it('handles a missing piece without invalid geometry', () => {
    const geometry = createGhostEnvelope([])
    expect(geometry.getAttribute('position')).toBeUndefined()
    geometry.dispose()
  })
})
