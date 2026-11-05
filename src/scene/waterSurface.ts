/** A point seen from above. */
export type Point = readonly [x: number, y: number]
export type Triangle = readonly [a: number, b: number, c: number]

/**
 * `triangles` cut up until no edge is longer than `maxEdge`, so the surface has points enough to
 * bend in waves. Each pass halves every edge that is too long, the same way for both triangles
 * that share it, so the pieces always meet edge to edge, with no point lying along a
 * neighbour's edge where a crack could open once the points move. Each triangle keeps its
 * winding.
 */
export function refine(
  points: readonly Point[],
  triangles: readonly Triangle[],
  maxEdge: number,
): { points: Point[]; triangles: Triangle[] } {
  const out = [...points]
  let tris = [...triangles]
  const long = (a: number, b: number) =>
    Math.hypot(out[a]![0] - out[b]![0], out[a]![1] - out[b]![1]) > maxEdge
  for (let pass = 0; pass < 32; pass++) {
    const middles = new Map<string, number>()
    const middle = (a: number, b: number) => {
      const key = a < b ? `${a},${b}` : `${b},${a}`
      let m = middles.get(key)
      if (m === undefined) {
        out.push([(out[a]![0] + out[b]![0]) / 2, (out[a]![1] + out[b]![1]) / 2])
        middles.set(key, (m = out.length - 1))
      }
      return m
    }
    let cut = false
    const next: Triangle[] = []
    for (const tri of tris) {
      // Turned round so a split edge, if there is one, comes first.
      let [a, b, c] = tri
      const splits = [long(a, b), long(b, c), long(c, a)]
      const count = splits.filter(Boolean).length
      if (count === 0) {
        next.push(tri)
        continue
      }
      cut = true
      if (count === 3) {
        const ab = middle(a, b)
        const bc = middle(b, c)
        const ca = middle(c, a)
        next.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca])
        continue
      }
      // One or two edges: turn so ab is split, and for two, bc as well.
      const turns = count === 1 ? splits.indexOf(true) : (splits.indexOf(false) + 1) % 3
      for (let i = 0; i < turns; i++) [a, b, c] = [b, c, a]
      const ab = middle(a, b)
      if (count === 1) next.push([a, ab, c], [ab, b, c])
      else {
        const bc = middle(b, c)
        next.push([ab, b, bc], [a, ab, bc], [a, bc, c])
      }
    }
    tris = next
    if (!cut) break
  }
  return { points: out, triangles: tris }
}

/** How far `p` lies from the closed loop `outline`. */
export function distanceToOutline(p: Point, outline: readonly Point[]): number {
  let best = Infinity
  for (let i = 0; i < outline.length; i++) {
    const [ax, ay] = outline[i]!
    const [bx, by] = outline[(i + 1) % outline.length]!
    const dx = bx - ax
    const dy = by - ay
    const along = dx * dx + dy * dy
    const t =
      along > 0 ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / along)) : 0
    best = Math.min(best, Math.hypot(p[0] - ax - t * dx, p[1] - ay - t * dy))
  }
  return best
}
