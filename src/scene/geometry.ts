import { PlaneGeometry } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { BASE_HEIGHT, QUADRANT_SIZE, TERRAIN_HEIGHT, TILE_SIZE } from './layout'

/** Soil block, sitting on y = 0. */
export const baseGeometry = new RoundedBoxGeometry(
  TILE_SIZE,
  BASE_HEIGHT,
  TILE_SIZE,
  1,
  0.035,
).translate(0, BASE_HEIGHT / 2, 0)

/** One terrain square: unit height, standing on y = 0. Scale Y to the terrain height. */
export const quadrantGeometry = new RoundedBoxGeometry(
  QUADRANT_SIZE,
  1,
  QUADRANT_SIZE,
  1,
  0.025,
).translate(0, 0.5, 0)

/** The joker has one continuous gold top rather than four terrain patches. */
export const goldTopGeometry = new RoundedBoxGeometry(
  TILE_SIZE,
  TERRAIN_HEIGHT.rainbow,
  TILE_SIZE,
  1,
  0.035,
).translate(0, TERRAIN_HEIGHT.rainbow / 2, 0)

/** The small supply sheets use the same softened square silhouette. */
export const traySheetGeometry = new RoundedBoxGeometry(TILE_SIZE, 0.07 * 0.92, TILE_SIZE, 1, 0.015)

/** Flat marker for squares that can take the next tile. */
export const candidateGeometry = new PlaneGeometry(TILE_SIZE * 0.82, TILE_SIZE * 0.82).rotateX(
  -Math.PI / 2,
)
