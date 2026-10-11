import { Box3, Vector3 } from 'three'
import type { PerspectiveCamera } from 'three'
import { boardTiles } from '../game/board'
import { neighbour } from '../game/coords'
import type { Coord } from '../game/coords'
import { landingPosition } from '../game/falling'
import type { FallingGameState } from '../game/falling'
import { coordToWorld, TILE_SIZE } from './layout'

export interface FallFraming {
  readonly target: Vector3
  readonly distance: number
}

// Extra room for the moving ghost, terrain height, seam dots and the HUD.
const HALF_SIZE = TILE_SIZE * 0.65
const HEIGHT = 0.7
const FIT_X = 0.8
const FIT_Y = 0.65
const projected = new Vector3()

function tileCorners(coord: Coord): Vector3[] {
  const [x, z] = coordToWorld(coord)
  const corners: Vector3[] = []
  for (const dx of [-HALF_SIZE, HALF_SIZE]) {
    for (const dz of [-HALF_SIZE, HALF_SIZE]) {
      for (const y of [0, HEIGHT]) corners.push(new Vector3(x + dx, y, z + dz))
    }
  }
  return corners
}

/** Check the entire ghost footprint, including corners, depth and its floating height. */
export function isTileInFrame(camera: PerspectiveCamera, coord: Coord): boolean {
  camera.updateMatrixWorld()
  const [x, z] = coordToWorld(coord)
  for (const dx of [-HALF_SIZE, HALF_SIZE]) {
    for (const dz of [-HALF_SIZE, HALF_SIZE]) {
      for (const y of [0, HEIGHT]) {
        projected.set(x + dx, y, z + dz).project(camera)
        if (
          Math.abs(projected.x) > 0.95 ||
          Math.abs(projected.y) > 0.95 ||
          Math.abs(projected.z) > 1
        )
          return false
      }
    }
  }
  return true
}

/** Frame the current fall corridor and the local island edge without rotating the view. */
export function planFallFraming(
  camera: PerspectiveCamera,
  state: FallingGameState,
  currentTarget: Vector3,
  minDistance: number,
  maxDistance: number,
): FallFraming | null {
  const landing = landingPosition(state)
  if (!state.falling || !landing) return null
  const anchor = neighbour(landing, state.fallDirection)
  const points = [
    state.falling,
    landing,
    ...boardTiles(state.board)
      .filter(
        (tile) => Math.abs(tile.coord.q - anchor.q) <= 2 && Math.abs(tile.coord.r - anchor.r) <= 2,
      )
      .map((tile) => tile.coord),
  ].flatMap(tileCorners)
  const target = new Box3().setFromPoints(points).getCenter(new Vector3())
  target.y = 0
  const inverseRotation = camera.quaternion.clone().invert()
  const verticalTan = Math.tan((camera.getEffectiveFOV() * Math.PI) / 360)
  const horizontalTan = verticalTan * camera.aspect
  let distance = Math.max(minDistance, camera.position.distanceTo(currentTarget))
  for (const point of points) {
    const local = point.clone().sub(target).applyQuaternion(inverseRotation)
    distance = Math.max(
      distance,
      local.z + Math.abs(local.x) / (horizontalTan * FIT_X),
      local.z + Math.abs(local.y) / (verticalTan * FIT_Y),
      local.z + camera.near + 1,
    )
  }
  return { target, distance: Math.min(maxDistance, distance) }
}
