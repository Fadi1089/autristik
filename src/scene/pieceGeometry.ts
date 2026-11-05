import { BufferAttribute, Color, ExtrudeGeometry, Shape, Vector2 } from 'three'
import type { BufferGeometry } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { coordKey } from '../game/coords'
import type { Coord } from '../game/coords'
import type { Square, Terrain } from '../game/tiles'
import { SCENE_COLORS, TERRAIN_COLORS } from '../palette'
import { BASE_HEIGHT, cellBoxes, TERRAIN_HEIGHT } from './layout'
import type { Footprint } from './layout'

/** Radius of a piece's rounded outer corners, seen from above. */
export const CORNER_RADIUS = 0.035
export const CORNER_SEGMENTS = 6

/** The four sides of a cell. */
const SIDES = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const

/** Squares of one piece that share a biome and an edge, drawn as one cap. */
export interface TerrainRegion {
  readonly terrain: Terrain
  readonly cells: readonly Coord[]
}

/** Splits a piece into its biome regions: same-biome squares joined along an edge. */
export function terrainRegions(squares: readonly Square[]): TerrainRegion[] {
  const byKey = new Map(squares.map((s) => [coordKey(s.coord), s]))
  const seen = new Set<string>()
  const regions: TerrainRegion[] = []
  for (const start of squares) {
    if (seen.has(coordKey(start.coord))) continue
    const cells: Coord[] = []
    const queue = [start.coord]
    seen.add(coordKey(start.coord))
    while (queue.length > 0) {
      const c = queue.pop()!
      cells.push(c)
      for (const [dq, dr] of SIDES) {
        const n = { q: c.q + dq, r: c.r + dr }
        const key = coordKey(n)
        if (seen.has(key) || byKey.get(key)?.terrain !== start.terrain) continue
        seen.add(key)
        queue.push(n)
      }
    }
    regions.push({ terrain: start.terrain, cells })
  }
  return regions
}

/**
 * The outline of a union of footprints in world x/z, as a clockwise loop of corners seen
 * from above (z growing south). The footprints may be any axis-aligned boxes that join into
 * one shape without holes.
 */
export function footprintOutline(boxes: readonly Footprint[]): [x: number, z: number][] {
  // Split the plane along every box edge; each piece of that grid is wholly in or out.
  const cuts = (values: number[]) =>
    [...new Set(values.map((v) => Math.round(v * 1e6) / 1e6))].sort((a, b) => a - b)
  const xs = cuts(boxes.flatMap((b) => [b.x - b.width / 2, b.x + b.width / 2]))
  const zs = cuts(boxes.flatMap((b) => [b.z - b.depth / 2, b.z + b.depth / 2]))
  const filled = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= xs.length - 1 || j >= zs.length - 1) return false
    const x = (xs[i]! + xs[i + 1]!) / 2
    const z = (zs[j]! + zs[j + 1]!) / 2
    return boxes.some((b) => Math.abs(x - b.x) < b.width / 2 && Math.abs(z - b.z) < b.depth / 2)
  }

  // Each filled piece's open sides, run clockwise (seen from above, z growing south), chain
  // into one clockwise loop. Corners are indices into xs and zs.
  const edges = new Map<string, Edge>()
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = 0; j < zs.length - 1; j++) {
      if (!filled(i, j)) continue
      const sides: Edge[] = [
        { from: [i, j], to: [i + 1, j], inward: [0, 1], open: !filled(i, j - 1) },
        { from: [i + 1, j], to: [i + 1, j + 1], inward: [-1, 0], open: !filled(i + 1, j) },
        { from: [i + 1, j + 1], to: [i, j + 1], inward: [0, -1], open: !filled(i, j + 1) },
        { from: [i, j + 1], to: [i, j], inward: [1, 0], open: !filled(i - 1, j) },
      ]
      for (const side of sides) if (side.open) edges.set(side.from.join(), side)
    }

  const loop: Edge[] = []
  let edge = edges.values().next().value
  while (edge && loop.length < edges.size) {
    loop.push(edge)
    edge = edges.get(edge.to.join())
  }

  const points: [number, number][] = []
  loop.forEach((a, i) => {
    const b = loop[(i + 1) % loop.length]!
    // Straight runs need no point, only the turns.
    if (a.inward[0] === b.inward[0] && a.inward[1] === b.inward[1]) return
    points.push([xs[a.to[0]]!, zs[a.to[1]]!])
  })
  return points
}

interface Edge {
  readonly from: readonly [number, number]
  readonly to: readonly [number, number]
  /** Unit normal pointing into the shape. */
  readonly inward: readonly [number, number]
  readonly open: boolean
}

/** Whether the corner at `points[i]` of a clockwise outline points outwards. */
function isConvex(points: readonly [number, number][], i: number): boolean {
  const [px, pz] = points[(i + points.length - 1) % points.length]!
  const [x, z] = points[i]!
  const [nx, nz] = points[(i + 1) % points.length]!
  return (x - px) * (nz - z) - (z - pz) * (nx - x) > 0
}

const cornerKey = ([x, z]: readonly [number, number]) =>
  `${Math.round(x * 1e6)},${Math.round(z * 1e6)}`

/** The piece's outer corners, which get rounded wherever a layer reaches them. */
function outerCorners(outline: readonly [number, number][]): Set<string> {
  return new Set(outline.filter((_, i) => isConvex(outline, i)).map(cornerKey))
}

/**
 * An outline as a shape, with the corners in `rounded` turned into short curves. Shapes are
 * drawn in x/y; turning the extrusion upright later maps shape y to world -z.
 */
function roundedShape(outline: readonly [number, number][], rounded: ReadonlySet<string>): Shape {
  const shape = new Shape()
  const at = ([x, z]: readonly [number, number]) => new Vector2(x, -z)
  outline.forEach((corner, i) => {
    const point = at(corner)
    const previous = at(outline[(i + outline.length - 1) % outline.length]!)
    const next = at(outline[(i + 1) % outline.length]!)
    const start = rounded.has(cornerKey(corner))
      ? point.clone().add(previous.clone().sub(point).setLength(CORNER_RADIUS))
      : point
    if (i === 0) shape.moveTo(start.x, start.y)
    else shape.lineTo(start.x, start.y)
    if (rounded.has(cornerKey(corner))) {
      const end = point.clone().add(next.clone().sub(point).setLength(CORNER_RADIUS))
      shape.quadraticCurveTo(point.x, point.y, end.x, end.y)
    }
  })
  shape.closePath()
  return shape
}

const color = new Color()

/** A flat-topped block from `bottom` up to `top`, over `shape`, painted one colour. */
function block(shape: Shape, bottom: number, top: number, paint: string): BufferGeometry {
  const geometry = new ExtrudeGeometry(shape, {
    depth: top - bottom,
    bevelEnabled: false,
    curveSegments: CORNER_SEGMENTS,
  })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, bottom, 0)
  const count = geometry.getAttribute('position').count
  const colors = new Float32Array(count * 3)
  color.set(paint)
  for (let i = 0; i < count; i++) color.toArray(colors, i * 3)
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  return geometry
}

/**
 * A piece's outline seen from above, and the outline of each of its biome regions, pulled in
 * from neighbouring pieces, with the piece's outer corners slightly rounded.
 */
export function pieceShapes(squares: readonly Square[]): {
  outline: Shape
  regions: { terrain: Terrain; shape: Shape }[]
} {
  const cells = squares.map((s) => s.coord)
  const outline = footprintOutline(cells.flatMap((c) => cellBoxes(cells, c)))
  const rounded = outerCorners(outline)
  return {
    outline: roundedShape(outline, rounded),
    regions: terrainRegions(squares).map(({ terrain, cells: own }) => ({
      terrain,
      shape: roundedShape(footprintOutline(own.flatMap((c) => cellBoxes(cells, c))), rounded),
    })),
  }
}

/**
 * A whole piece as one geometry with per-vertex colours: its soil block, then a block per
 * biome region on top at that biome's height. Every layer follows the same outline, pulled
 * in from neighbouring pieces, and the piece's outer corners are slightly rounded all the way
 * up, so the sides stay flush.
 */
export function pieceGeometry(squares: readonly Square[]): BufferGeometry {
  const { outline, regions } = pieceShapes(squares)
  const layers = [
    block(outline, 0, BASE_HEIGHT, SCENE_COLORS.soil),
    ...regions.map(({ terrain, shape }) =>
      block(shape, BASE_HEIGHT, BASE_HEIGHT + TERRAIN_HEIGHT[terrain], TERRAIN_COLORS[terrain]),
    ),
  ]
  const merged = mergeGeometries(layers)
  for (const layer of layers) layer.dispose()
  return merged
}
