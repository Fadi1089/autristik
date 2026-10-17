import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import { cameraPan, GRID_CAMERA, gridPhase, groundAtScreen } from './gridMath'

describe('unbounded grid coverage', () => {
  it.each([0.45, 1, 16 / 9, 4])(
    'covers every screen edge at aspect %s after distant pans',
    (aspect) => {
      const camera = new PerspectiveCamera(GRID_CAMERA.fov, aspect, 0.1, 512)
      for (const polar of [GRID_CAMERA.minPolarAngle, Math.PI / 4, GRID_CAMERA.maxPolarAngle])
        for (const distance of [GRID_CAMERA.minDistance, GRID_CAMERA.maxDistance])
          for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2])
            for (const origin of [new Vector3(), new Vector3(100000, 0, -100000)]) {
              camera.position.setFromSphericalCoords(distance, polar, heading).add(origin)
              camera.lookAt(origin)
              for (const x of [-1, 0, 1])
                for (const y of [-1, 0, 1]) {
                  const point = groundAtScreen(camera, x, y)
                  expect(point).not.toBeNull()
                  expect(point!.y).toBeCloseTo(0)
                  expect(Number.isFinite(point!.x) && Number.isFinite(point!.z)).toBe(true)
                  // Reconstructed intersections project back to the same screen coordinates,
                  // even beyond the old finite floor and the camera's far clipping distance.
                  const projected = point!.project(camera)
                  expect(projected.x).toBeCloseTo(x, 5)
                  expect(projected.y).toBeCloseTo(y, 5)
                }
            }
    },
  )

  it('keeps the grid phase anchored for positive and negative coordinates far from the origin', () => {
    for (const phase of [0, 0.125, 0.5, 4.875])
      for (const periods of [-1000000, -1, 0, 1, 1000000])
        expect(gridPhase(periods * 5 + phase)).toBe(phase)
    expect(gridPhase(-0.25)).toBe(4.75)
  })
})

describe('free camera keyboard movement', () => {
  it('follows heading, normalises diagonal speed and stays on the ground plane', () => {
    const right = cameraPan(1, 0, 0, 20, 1 / 60)
    expect(right.x).toBeGreaterThan(0)
    expect(right.y).toBe(0)
    expect(cameraPan(1, 1, 0, 20, 1 / 60).length()).toBeCloseTo(right.length())
    const turned = cameraPan(0, -1, Math.PI / 2, 20, 1 / 60)
    expect(turned.x).toBeCloseTo(-right.x)
    expect(turned.z).toBeCloseTo(0)
    expect(cameraPan(0, 0, 0, 20, 1)).toEqual(new Vector3())
  })
  it('moves equally at different frame rates, without jumping after a hidden tab', () => {
    expect(cameraPan(1, 0, 0, 20, 1 / 30).x).toBeCloseTo(cameraPan(1, 0, 0, 20, 1 / 60).x * 2)
    expect(cameraPan(1, 0, 0, 20, 100).length()).toBeCloseTo(cameraPan(1, 0, 0, 20, 0.05).length())
  })
})
