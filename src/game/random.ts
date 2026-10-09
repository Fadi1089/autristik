/**
 * Small seedable PRNG (mulberry32) so that tile draws are reproducible and the
 * game state stays serialisable: the generator's state is a single 32-bit number.
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number
  /** Picks an item with probability proportional to its weight. */
  weighted<T extends string>(weights: Readonly<Record<T, number>>): T
  /** Current internal state; feed it back into createRng to continue the sequence. */
  readonly state: number
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    weighted<T extends string>(weights: Readonly<Record<T, number>>): T {
      const entries = Object.entries(weights) as [T, number][]
      const total = entries.reduce((sum, [, w]) => sum + w, 0)
      let roll = next() * total
      for (const [item, weight] of entries) {
        roll -= weight
        if (roll < 0) return item
      }
      const last = entries.at(-1)
      if (!last) throw new Error('weighted() needs at least one entry')
      return last[0]
    },
    get state() {
      return state
    },
  }
}
