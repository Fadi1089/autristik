import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import { Direction, neighbour } from '../game/coords'
import { createFallingGame, landingPosition, spawnFalling } from '../game/falling'
import { boardTiles, withTile } from '../game/board'
import { isTileInFrame, planFallFraming, planStartFraming } from './cameraFraming'
import { viewportWithoutHud } from './hudViewport'

function cameraFor(aspect = 16 / 9, heading = 0, polar = Math.PI / 4) {
  const camera = new PerspectiveCamera(50, aspect, 0.1, 512)
  camera.position.setFromSphericalCoords(16 * Math.SQRT2, polar, heading)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  return camera
}

describe('falling tile camera framing', () => {
  it.each([
    [1920, 1080],
    [800, 900],
    [400, 900],
  ])(
    'keeps the starting island and every approach direction clear of the HUD at %s × %s',
    (width, height) => {
      const viewport = viewportWithoutHud(width, height, [
        { left: 24, right: width - 24, top: 24, bottom: 170 },
        { left: width - 224, right: width - 24, top: height / 2 - 240, bottom: height / 2 + 240 },
      ])
      for (const direction of [Direction.North, Direction.East, Direction.South, Direction.West]) {
        const initial = createFallingGame(42)
        const game = {
          ...initial,
          fallDirection: direction,
          falling: spawnFalling(initial.board, direction),
        }
        for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          for (const polar of [0.25, 0.8, 1.1]) {
            const camera = cameraFor(width / height, heading, polar)
            const orientation = camera.quaternion.clone()
            const frame = planStartFraming(camera, game, 4, 256, viewport)!
            expect(frame.distance).toBeLessThan(256)
            camera.position
              .copy(frame.target)
              .add(new Vector3(0, 0, frame.distance).applyQuaternion(orientation))
            camera.lookAt(frame.target)
            expect(camera.quaternion.angleTo(orientation)).toBeLessThan(1e-6)
            expect(isTileInFrame(camera, game.falling!, viewport)).toBe(true)
            for (const tile of boardTiles(game.board))
              expect(isTileInFrame(camera, tile.coord, viewport)).toBe(true)
            const fallFrame = planFallFraming(camera, game, frame.target, 4, 256, viewport)!
            camera.position
              .copy(fallFrame.target)
              .add(new Vector3(0, 0, fallFrame.distance).applyQuaternion(orientation))
            camera.lookAt(fallFrame.target)
            expect(isTileInFrame(camera, game.falling!, viewport)).toBe(true)
            expect(isTileInFrame(camera, landingPosition(game)!, viewport)).toBe(true)
          }
        }
      }
    },
  )
  it('treats a tile behind the right tray as hidden even while it is within the screen', () => {
    const camera = cameraFor()
    const tile = { q: 12, r: 0 }
    expect(isTileInFrame(camera, tile)).toBe(true)
    const viewport = viewportWithoutHud(1920, 1080, [
      { left: 1500, right: 1900, top: 50, bottom: 1030 },
    ])
    expect(isTileInFrame(camera, tile, viewport)).toBe(false)
  })
  it.each([16 / 9, 1, 0.45])(
    'starts centred on the island with every tile and the approaching ghost visible at aspect %s',
    (aspect) => {
      for (const direction of [Direction.South]) {
        // Every new game starts with this approach direction.
        const initial = createFallingGame(42)
        const game = {
          ...initial,
          fallDirection: direction,
          falling: spawnFalling(initial.board, direction),
        }
        const camera = cameraFor(aspect)
        camera.position.multiplyScalar(8) // A distant previous-game zoom must not carry over.
        const framing = planStartFraming(camera, game, 4, 65)!
        expect(framing.target).toEqual(new Vector3(0, 0, 0))
        expect(framing.distance).toBeLessThan(65)
        camera.position
          .copy(framing.target)
          .add(new Vector3(0, 1, 1).normalize().multiplyScalar(framing.distance))
        camera.lookAt(framing.target)
        expect(isTileInFrame(camera, game.falling!)).toBe(true)
        for (const tile of boardTiles(game.board))
          expect(isTileInFrame(camera, tile.coord)).toBe(true)
      }
    },
  )

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
