import { Color, Vector3 } from 'three'
import { DIRECTIONS, directionOffset } from '../game/coords'
import type { Square } from '../game/tiles'
import { TERRAIN_COLORS } from '../palette'
import { BASE_HEIGHT, coordToWorld, TERRAIN_HEIGHT, TILE_SIZE } from './layout'

/** Room for a couple of overlapping bursts; each placement makes about ten particles. */
export const CAPACITY = 40
/** Wait for the dropping piece to touch down before the dust rises. */
export const LANDING_DELAY = 0.22
/** Share of a piece's outer edges that puff out a little dust. */
export const PUFF_CHANCE = 0.55
export const SPECKS = 3
export const GRAVITY = 3.2
export const DUST = new Color('#fbf4e6')

export interface Particle {
  readonly position: Vector3
  readonly velocity: Vector3
  readonly color: Color
  readonly size: number
  readonly life: number
  /** Dust drifts and slows; specks hop and fall back. */
  readonly kind: 'dust' | 'speck'
  age: number
}

const between = (min: number, max: number) => min + Math.random() * (max - min)

/** A soft handful of particles for a piece that just landed. */
export function burst(squares: readonly Square[]): Particle[] {
  const inPiece = (q: number, r: number) => squares.some((s) => s.coord.q === q && s.coord.r === r)
  const particles: Particle[] = []
  for (const square of squares) {
    const [x, z] = coordToWorld(square.coord)
    for (const direction of DIRECTIONS) {
      const { q, r } = directionOffset(direction)
      if (inPiece(square.coord.q + q, square.coord.r + r) || Math.random() > PUFF_CHANCE) continue
      // From the foot of an outer edge, rolling outwards along the ground.
      const along = between(-0.35, 0.35) * TILE_SIZE
      particles.push({
        kind: 'dust',
        position: new Vector3(
          x + (q * TILE_SIZE) / 2 + (r ? along : 0),
          BASE_HEIGHT * 0.3,
          z + (r * TILE_SIZE) / 2 + (q ? along : 0),
        ),
        velocity: new Vector3(q * between(0.35, 0.6), between(0.12, 0.25), r * between(0.35, 0.6)),
        color: DUST,
        size: between(0.045, 0.075),
        life: between(0.7, 1),
        age: -LANDING_DELAY,
      })
    }
  }
  for (let i = 0; i < SPECKS; i++) {
    const square = squares[Math.floor(Math.random() * squares.length)]!
    const [x, z] = coordToWorld(square.coord)
    const angle = Math.random() * Math.PI * 2
    particles.push({
      kind: 'speck',
      position: new Vector3(x, BASE_HEIGHT + TERRAIN_HEIGHT[square.terrain], z),
      velocity: new Vector3(
        Math.cos(angle) * between(0.25, 0.45),
        between(0.9, 1.2),
        Math.sin(angle) * between(0.25, 0.45),
      ),
      color: new Color(TERRAIN_COLORS[square.terrain]),
      size: between(0.018, 0.026),
      life: between(0.6, 0.8),
      age: -LANDING_DELAY - between(0, 0.08),
    })
  }
  return particles
}
