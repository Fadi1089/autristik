import { describe, expect, it } from 'vitest'
import { Color } from 'three'
import { pieceSquares } from '../game/tiles'
import { TERRAIN_COLORS } from '../palette'
import { burst, DUST, LANDING_DELAY, SPECKS } from './dust'

describe('placement dust', () => {
  const piece = pieceSquares({ shape: 'T', terrains: ['grass', 'forest', 'field', 'water'] }, 0, {
    q: 3,
    r: -2,
  })

  it('stays a light touch: a few specks and some dust from the outer edges only', () => {
    // A T has 10 outer edges; dust comes from some of them, never from inside the piece.
    for (let i = 0; i < 50; i++) {
      const particles = burst(piece)
      const dust = particles.filter((p) => p.kind === 'dust')
      expect(particles.filter((p) => p.kind === 'speck')).toHaveLength(SPECKS)
      expect(dust.length).toBeLessThanOrEqual(10)
      expect(particles.length).toBeLessThanOrEqual(SPECKS + 10)
    }
  })

  it('waits for the piece to land, then lives for under a second', () => {
    for (const p of burst(piece)) {
      expect(p.age).toBeLessThanOrEqual(-LANDING_DELAY)
      expect(p.life).toBeLessThanOrEqual(1)
    }
  })

  it('uses cream dust and specks in the colours of the piece’s own terrain', () => {
    const terrain = new Set(Object.values(TERRAIN_COLORS).map((c) => new Color(c).getHex()))
    for (const p of burst(piece)) {
      if (p.kind === 'dust') expect(p.color).toBe(DUST)
      else expect(terrain.has(p.color.getHex())).toBe(true)
    }
  })
})
