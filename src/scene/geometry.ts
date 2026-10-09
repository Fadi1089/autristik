import { BoxGeometry, PlaneGeometry } from 'three'
import { BASE_HEIGHT, QUADRANT_SIZE, TILE_SIZE } from './layout'

/** Soil block, sitting on y = 0. */
export const baseGeometry = new BoxGeometry(TILE_SIZE, BASE_HEIGHT, TILE_SIZE).translate(
  0,
  BASE_HEIGHT / 2,
  0,
)

/** One terrain square: unit height, standing on y = 0. Scale Y to the terrain height. */
export const quadrantGeometry = new BoxGeometry(QUADRANT_SIZE, 1, QUADRANT_SIZE).translate(
  0,
  0.5,
  0,
)

/** Flat marker for squares that can take the next tile. */
export const candidateGeometry = new PlaneGeometry(TILE_SIZE * 0.82, TILE_SIZE * 0.82).rotateX(
  -Math.PI / 2,
)
