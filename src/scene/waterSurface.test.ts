import { describe, expect, it } from 'vitest'
import type { Point, Triangle } from './waterSurface'
import { distanceToOutline, refine } from './waterSurface'

/** Signed area: positive for a triangle wound anticlockwise. */
const area = (p: readonly Point[], [a, b, c]: Triangle) =>
  ((p[b]![0] - p[a]![0]) * (p[c]![1] - p[a]![1]) - (p[c]![0] - p[a]![0]) * (p[b]![1] - p[a]![1])) /
  2

const edgeKey = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`)

describe('refine', () => {
  // A long thin rectangle as two triangles, like the slivers a shape is cut into.
  const points: Point[] = [
    [0, 0],
    [1, 0],
    [1, 0.2],
    [0, 0.2],
  ]
  const triangles: Triangle[] = [
    [0, 1, 2],
    [0, 2, 3],
  ]
  const { points: out, triangles: tris } = refine(points, triangles, 0.05)

  it('cuts every edge down to the longest allowed', () => {
    for (const [a, b, c] of tris)
      for (const [u, v] of [
        [a, b],
        [b, c],
        [c, a],
      ] as const)
        expect(Math.hypot(out[u]![0] - out[v]![0], out[u]![1] - out[v]![1])).toBeLessThanOrEqual(
          0.05 + 1e-9,
        )
  })

  it('covers the same area, every piece still wound the same way', () => {
    expect(tris.every((t) => area(out, t) > 0)).toBe(true)
    expect(tris.reduce((sum, t) => sum + area(out, t), 0)).toBeCloseTo(0.2, 9)
  })

  it('leaves no crack: each inside edge is shared by exactly two pieces', () => {
    const uses = new Map<string, number>()
    for (const [a, b, c] of tris)
      for (const key of [edgeKey(a, b), edgeKey(b, c), edgeKey(c, a)])
        uses.set(key, (uses.get(key) ?? 0) + 1)
    // Edges used once lie on the rectangle's outline, 2 · (1 + 0.2) long in all.
    let outline = 0
    for (const [key, count] of uses) {
      expect(count).toBeLessThanOrEqual(2)
      if (count === 1) {
        const [a, b] = key.split(',').map(Number) as [number, number]
        outline += Math.hypot(out[a]![0] - out[b]![0], out[a]![1] - out[b]![1])
      }
    }
    expect(outline).toBeCloseTo(2.4, 9)
  })
})

describe('distanceToOutline', () => {
  const square: Point[] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ]
  it('measures to the nearest side, and to a corner beyond the sides', () => {
    expect(distanceToOutline([0.5, 0.2], square)).toBeCloseTo(0.2)
    expect(distanceToOutline([0.5, 0.5], square)).toBeCloseTo(0.5)
    expect(distanceToOutline([1.3, 1.4], square)).toBeCloseTo(0.5)
  })
})
