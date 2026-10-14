import { Box3, Vector3 } from 'three'
import type { PerspectiveCamera } from 'three'
import { boardTiles } from '../game/board'
import { neighbour } from '../game/coords'
import type { Coord } from '../game/coords'
import { landingPosition } from '../game/falling'
import type { FallingGameState } from '../game/falling'
import { coordToWorld, TILE_SIZE } from './layout'
import { FULL_VIEWPORT } from './hudViewport'
import type { CameraViewport } from './hudViewport'

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
export function isTileInFrame(
  camera: PerspectiveCamera,
  coord: Coord,
  viewport = FULL_VIEWPORT,
): boolean {
  camera.updateMatrixWorld()
  const [x, z] = coordToWorld(coord)
  for (const dx of [-HALF_SIZE, HALF_SIZE]) {
    for (const dz of [-HALF_SIZE, HALF_SIZE]) {
      for (const y of [0, HEIGHT]) {
        projected.set(x + dx, y, z + dz).project(camera)
        if (
          projected.x < viewport.left ||
          projected.x > viewport.right ||
          projected.y < viewport.bottom ||
          projected.y > viewport.top ||
          Math.abs(projected.z) > 1
        )
          return false
      }
    }
  }
  return true
}

/** Fit points into an asymmetric viewport while keeping the camera angle and ground target. */
function fitPoints(
  camera: PerspectiveCamera,
  points: Vector3[],
  target: Vector3,
  minDistance: number,
  maxDistance: number,
  viewport?: CameraViewport,
): FallFraming {
  const inverseRotation = camera.quaternion.clone().invert()
  const verticalTan = Math.tan((camera.getEffectiveFOV() * Math.PI) / 360)
  const horizontalTan = verticalTan * camera.aspect
  const centreX = viewport ? (viewport.left + viewport.right) / 2 : 0
  const centreY = viewport ? (viewport.top + viewport.bottom) / 2 : 0
  const fitX = viewport ? (viewport.right - viewport.left) * 0.45 : FIT_X
  const fitY = viewport ? (viewport.top - viewport.bottom) * 0.45 : FIT_Y
  const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
  const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
  const front = new Vector3(0, 0, 1).applyQuaternion(camera.quaternion)
  // Include a depth shift so the off-centre target remains on the ground plane.
  const depthShift = (centreX * horizontalTan * right.y + centreY * verticalTan * up.y) / front.y
  const distanceScale = 1 - depthShift
  let depth = minDistance / distanceScale
  for (const point of points) {
    const local = point.clone().sub(target).applyQuaternion(inverseRotation)
    depth = Math.max(
      depth,
      local.z + Math.abs(local.x + centreX * horizontalTan * local.z) / (horizontalTan * fitX),
      local.z + Math.abs(local.y + centreY * verticalTan * local.z) / (verticalTan * fitY),
      local.z + camera.near + 1,
    )
  }
  const distance = Math.min(maxDistance, depth * distanceScale)
  depth = distance / distanceScale
  target
    .addScaledVector(right, -centreX * horizontalTan * depth)
    .addScaledVector(up, -centreY * verticalTan * depth)
    .addScaledVector(front, depthShift * depth)
  target.y = 0
  return { target, distance }
}

/** Frame the current fall corridor and the local island edge without rotating the view. */
export function planFallFraming(
  camera: PerspectiveCamera,
  state: FallingGameState,
  currentTarget: Vector3,
  minDistance: number,
  maxDistance: number,
  viewport?: CameraViewport,
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
  return fitPoints(
    camera,
    points,
    target,
    Math.max(minDistance, camera.position.distanceTo(currentTarget)),
    maxDistance,
    viewport,
  )
}

/** Start on the island centre, zooming just enough to include the approaching tile. */
export function planStartFraming(
  camera: PerspectiveCamera,
  state: FallingGameState,
  minDistance: number,
  maxDistance: number,
  viewport?: CameraViewport,
): FallFraming | null {
  if (!state.falling || !state.current) return null
  const island = boardTiles(state.board).map((tile) => tile.coord)
  const centrePoints = (island.length ? island : [{ q: 0, r: 0 }]).flatMap(tileCorners)
  const target = new Box3().setFromPoints(centrePoints).getCenter(new Vector3())
  target.y = 0
  const points = [...centrePoints, ...tileCorners(state.falling)]
  return fitPoints(camera, points, target, minDistance, maxDistance, viewport)
}
