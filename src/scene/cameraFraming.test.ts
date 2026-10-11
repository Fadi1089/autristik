import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import { Direction, neighbour } from '../game/coords'
import { createFallingGame, landingPosition, spawnFalling } from '../game/falling'
import { withTile } from '../game/board'
import { isTileInFrame, planFallFraming } from './cameraFraming'

function cameraFor(aspect = 16 / 9, heading = 0, polar = Math.PI / 4) {
  const camera = new PerspectiveCamera(50, aspect, 0.1, 200)
  camera.position.setFromSphericalCoords(16 * Math.SQRT2, polar, heading)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  return camera
}

describe('falling tile camera framing', () => {
  it('detects off-screen tiles after panning, zooming and when they are behind the camera', () => {
    const camera = cameraFor()
    expect(isTileInFrame(camera, { q: 0, r: 0 })).toBe(true)
    expect(isTileInFrame(camera, { q: 100, r: 0 })).toBe(false)
    expect(isTileInFrame(camera, { q: 0, r: 100 })).toBe(false)
    camera.position.set(100, 16, 16)
    camera.lookAt(100, 0, 0)
    expect(isTileInFrame(camera, { q: 0, r: 0 })).toBe(false)
    camera.position.set(0, 2, 2)
    camera.lookAt(0, 0, 0)
    expect(isTileInFrame(camera, { q: 5, r: 0 })).toBe(false)
  })

  it.each([Direction.North, Direction.East, Direction.South, Direction.West])(
    'frames the whole fall corridor and island edge in direction %s at any camera angle',
    (direction) => {
      const initial = createFallingGame(42)
      const board = withTile(initial.board, {
        coord: { q: 20, r: 30 },
        quadrants: ['grass', 'grass', 'grass', 'grass'],
      })
      const lane = direction === Direction.East || direction === Direction.West ? 30 : 20
      const game = {
        ...initial,
        board,
        fallDirection: direction,
        falling: spawnFalling(board, direction, lane),
      }
      const landing = landingPosition(game)!
      const anchor = neighbour(landing, direction)
      for (const aspect of [16 / 9, 2 / 3]) {
        for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          for (const polar of [0.25, 0.8, 1.1]) {
            const camera = cameraFor(aspect, heading, polar)
            const orientation = camera.quaternion.clone()
            const framing = planFallFraming(camera, game, new Vector3(), 4, 65)!
            expect(framing.distance).toBeGreaterThanOrEqual(16 * Math.SQRT2)
            camera.position
              .copy(framing.target)
              .add(new Vector3(0, 0, framing.distance).applyQuaternion(orientation))
            camera.lookAt(framing.target)
            expect(camera.quaternion.angleTo(orientation)).toBeLessThan(1e-6)
            expect(isTileInFrame(camera, game.falling)).toBe(true)
            expect(isTileInFrame(camera, landing)).toBe(true)
            expect(isTileInFrame(camera, anchor)).toBe(true)
            // Advancing along the corridor must not require following every falling step.
            expect(
              isTileInFrame(camera, {
                q: (game.falling.q + landing.q) / 2,
                r: (game.falling.r + landing.r) / 2,
              }),
            ).toBe(true)
          }
        }
      }
    },
  )

  it('does not frame absent tiles or ended games, and leaves game state and camera unchanged', () => {
    const game = createFallingGame(42)
    const camera = cameraFor()
    const position = camera.position.clone()
    const target = new Vector3()
    expect(planFallFraming(camera, { ...game, falling: null }, target, 4, 65)).toBeNull()
    expect(planFallFraming(camera, { ...game, current: null }, target, 4, 65)).toBeNull()
    planFallFraming(camera, game, target, 4, 65)
    expect(camera.position).toEqual(position)
    expect(target).toEqual(new Vector3())
    expect(game).toEqual(createFallingGame(42))
  })
})
