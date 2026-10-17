import { Vector3 } from 'three'
import type { Camera } from 'three'

export const GRID_CELL_SIZE = 1
export const GRID_SECTION_SIZE = 5
export const GRID_CAMERA = {
  position: [0, 14, 14] as [number, number, number],
  fov: 45,
  minDistance: 4,
  maxDistance: 45,
  minPolarAngle: 0.15,
  maxPolarAngle: 0.95,
}

/** Keep GPU coordinates small without moving the world-space grid at large pan distances. */
export function gridPhase(value: number): number {
  const period = GRID_CELL_SIZE * GRID_SECTION_SIZE
  return ((value % period) + period) % period
}

/** Screen-aligned ground translation with equal diagonal and single-axis speeds. */
export function cameraPan(
  x: number,
  y: number,
  azimuth: number,
  distance: number,
  seconds: number,
): Vector3 {
  const length = Math.hypot(x, y)
  if (!length) return new Vector3()
  const speed = (distance * 0.65 * Math.min(0.05, Math.max(0, seconds))) / length
  return new Vector3(
    (x * Math.cos(azimuth) + y * Math.sin(azimuth)) * speed,
    0,
    (-x * Math.sin(azimuth) + y * Math.cos(azimuth)) * speed,
  )
}

/** CPU equivalent of the shader intersection, for complete screen coverage checks. */
export function groundAtScreen(camera: Camera, x: number, y: number): Vector3 | null {
  camera.updateMatrixWorld()
  const ray = new Vector3(x, y, 0.5).unproject(camera).sub(camera.position).normalize()
  if (ray.y >= -1e-6) return null
  return camera.position.clone().addScaledVector(ray, -camera.position.y / ray.y)
}
