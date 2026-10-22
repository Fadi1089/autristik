import { BoxGeometry, PlaneGeometry } from 'three'
import { BASE_HEIGHT, TILE_SIZE } from './layout'

/** Soil block for one cell, sitting on y = 0. Scaled in x/z to its footprint. */
export const baseGeometry = new BoxGeometry(TILE_SIZE, BASE_HEIGHT, TILE_SIZE).translate(
  0,
  BASE_HEIGHT / 2,
  0,
)

/** One terrain square for a whole cell: unit height, standing on y = 0. Scaled to its footprint and terrain height. */
export const squareGeometry = new BoxGeometry(TILE_SIZE, 1, TILE_SIZE).translate(0, 0.5, 0)

/** Flat marker for squares that can take the next tile. */
export const candidateGeometry = new PlaneGeometry(TILE_SIZE * 0.82, TILE_SIZE * 0.82).rotateX(
  -Math.PI / 2,
)
