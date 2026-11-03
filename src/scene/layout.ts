import type { Coord } from '../game/coords'
import type { Terrain } from '../game/tiles'

/** World-space size of one grid cell; each cell holds one terrain square, as big as a 2×2 tile's squares were. */
export const TILE_SIZE = 0.5
/**
 * Inset of a piece's outer edges. Squares of one piece meet flush, like the squares of a
 * 2×2 tile did; between pieces the ground shows through, so each piece stays distinct.
 */
export const PIECE_GAP = 0.04 * TILE_SIZE
/** Height of the soil block every piece sits on. */
export const BASE_HEIGHT = 0.11

/** Height of each terrain/biome block above the soil. */
export const TERRAIN_HEIGHT: Readonly<Record<Terrain, number>> = {
  blue: 0.02,
  green: 0.035,
  yellow: 0.05,
  red: 0.065,
  black: 0.08,
}

export const BIOME_HEIGHT = TERRAIN_HEIGHT

export function coordToWorld({ q, r }: Coord): [x: number, z: number] {
  return [q * TILE_SIZE, r * TILE_SIZE]
}

export function worldToCoord(x: number, z: number): Coord {
  // `|| 0` folds -0 into 0 so coordinates compare and key cleanly.
  return { q: Math.round(x / TILE_SIZE) || 0, r: Math.round(z / TILE_SIZE) || 0 }
}

export interface Footprint {
  readonly x: number
  readonly z: number
  readonly width: number
  readonly depth: number
}

/** Most boxes one cell needs: a middle band, plus a band above and below where it joins on. */
export const BOXES_PER_CELL = 3

/**
 * Ground boxes for one cell of a piece, shared by its soil and its terrain square. Together
 * the piece's boxes are its cells pulled in evenly by PIECE_GAP all round, inner corners
 * included: squares of one piece meet flush, and nothing pokes out at an L's inside corner.
 *
 * The cell is split into a 3×3 grid: a core, four edge strips of width PIECE_GAP and four
 * corners. A strip stays when the piece continues past that edge; a corner stays only when
 * the piece continues past both of its edges and diagonally too.
 */
export function cellBoxes(piece: readonly Coord[], c: Coord): Footprint[] {
  const has = (dq: number, dr: number) => piece.some((p) => p.q === c.q + dq && p.r === c.r + dr)
  const g = PIECE_GAP
  const half = TILE_SIZE / 2
  const [x, z] = coordToWorld(c)
  const west = has(-1, 0)
  const east = has(1, 0)
  const box = (left: number, right: number, top: number, bottom: number): Footprint => ({
    x: x + (left + right) / 2,
    z: z + (top + bottom) / 2,
    width: right - left,
    depth: bottom - top,
  })
  // The middle band runs across the cell, through its west and east strips when they stay.
  const boxes = [box(west ? -half : g - half, east ? half : half - g, g - half, half - g)]
  // Above and below: the strip, widened over a corner only where the piece fills it.
  for (const dr of [-1, 1]) {
    if (!has(0, dr)) continue
    const left = west && has(-1, dr) ? -half : g - half
    const right = east && has(1, dr) ? half : half - g
    boxes.push(dr < 0 ? box(left, right, -half, g - half) : box(left, right, half - g, half))
  }
  return boxes
}

/**
 * Style for drei's Html labels, so they never catch the pointer. Its `pointerEvents` prop only
 * applies in transform mode; otherwise a pointer moving over a label reaches the canvas's
 * event handlers measured from the label's corner, and the hovered square jumps far away.
 */
export const PASS_THROUGH = { pointerEvents: 'none' } as const

/**
 * A point on screen (client pixels) as a pointer in normalized device coordinates for the
 * canvas inside `rect`: -1 to 1 left to right, and 1 to -1 top to bottom.
 */
export function devicePointer(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
): [x: number, y: number] {
  return [
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  ]
}
