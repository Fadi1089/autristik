import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
import type { Square } from '../game/tiles'
import { BASE_HEIGHT, cellBoxes, TERRAIN_HEIGHT } from './layout'

/** Enlarge the entire piece about its centre, rather than enlarging individual cells. */
export const GHOST_ENVELOPE_SCALE = 1.04

type Point = readonly [number, number, number]
const snap = (value: number) => Math.round(value * 1e9) / 1e9

/** The exposed surface of the piece's union: no hidden faces between touching cells. */
export function createGhostEnvelope(squares: readonly Square[]): BufferGeometry {
  const geometry = new BufferGeometry()
  if (squares.length === 0) return geometry
  const cells = squares.map((square) => square.coord)
  const boxes = squares.flatMap((square) =>
    cellBoxes(cells, square.coord).map((box) => ({
      x0: snap(box.x - box.width / 2),
      x1: snap(box.x + box.width / 2),
      z0: snap(box.z - box.depth / 2),
      z1: snap(box.z + box.depth / 2),
      height: BASE_HEIGHT + TERRAIN_HEIGHT[square.terrain],
    })),
  )
  // Split at every footprint edge so adjacent surfaces share exactly the same boundaries.
  const xs = [...new Set(boxes.flatMap((box) => [box.x0, box.x1]))].sort((a, b) => a - b)
  const zs = [...new Set(boxes.flatMap((box) => [box.z0, box.z1]))].sort((a, b) => a - b)
  const heights = xs.slice(0, -1).map((x0, x) =>
    zs.slice(0, -1).map((z0, z) => {
      const cx = (x0 + xs[x + 1]!) / 2
      const cz = (z0 + zs[z + 1]!) / 2
      return (
        boxes.find((box) => cx > box.x0 && cx < box.x1 && cz > box.z0 && cz < box.z1)?.height ?? 0
      )
    }),
  )
  const heightAt = (x: number, z: number) => heights[x]?.[z] ?? 0
  const positions: number[] = []
  const quad = (a: Point, b: Point, c: Point, d: Point) => {
    positions.push(...a, ...b, ...c, ...a, ...c, ...d)
  }

  heights.forEach((row, x) =>
    row.forEach((height, z) => {
      if (height === 0) return
      const x0 = xs[x]!,
        x1 = xs[x + 1]!,
        z0 = zs[z]!,
        z1 = zs[z + 1]!
      quad([x0, height, z0], [x0, height, z1], [x1, height, z1], [x1, height, z0])
      quad([x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1])
      const west = heightAt(x - 1, z)
      const east = heightAt(x + 1, z)
      const north = heightAt(x, z - 1)
      const south = heightAt(x, z + 1)
      if (west < height) quad([x0, west, z0], [x0, west, z1], [x0, height, z1], [x0, height, z0])
      if (east < height) quad([x1, east, z0], [x1, height, z0], [x1, height, z1], [x1, east, z1])
      if (north < height) quad([x0, north, z0], [x0, height, z0], [x1, height, z0], [x1, north, z0])
      if (south < height) quad([x0, south, z1], [x1, south, z1], [x1, height, z1], [x0, height, z1])
    }),
  )

  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.computeBoundingBox()
  const centre = geometry.boundingBox!.getCenter(new Vector3())
  geometry.translate(-centre.x, -centre.y, -centre.z)
  geometry.scale(GHOST_ENVELOPE_SCALE, GHOST_ENVELOPE_SCALE, GHOST_ENVELOPE_SCALE)
  geometry.translate(centre.x, centre.y, centre.z)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
