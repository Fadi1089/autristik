import { describe, expect, it } from 'vitest'
import { BEDROCK_TILE, RAINBOW_TILE, VOID_TILE, REGULAR_TERRAINS } from '../game/tiles'
import { soundForTile, SPECIAL_TILE_SOUNDS, synthesizeTileSound } from './tileSounds'

describe('tile-specific sound selection', () => {
  it('uses the same selected sound for all standard terrain combinations', () => {
    for (const a of REGULAR_TERRAINS)
      for (const b of REGULAR_TERRAINS) {
        expect(soundForTile([a, b, b, a], 1, 'wood')).toBe('wood')
        expect(soundForTile([a, b, b, a], 1, 'glass')).toBe('glass')
      }
  })
  it('distinguishes all six special sounds and preserves global silence', () => {
    const grass = ['grass', 'grass', 'grass', 'grass'] as const
    expect(soundForTile(VOID_TILE, 1, 'wood')).toBe('special-void')
    expect(soundForTile(RAINBOW_TILE, 1, 'wood')).toBe('special-gold')
    expect(soundForTile(BEDROCK_TILE, 1, 'wood')).toBe('special-bedrock')
    expect(soundForTile(grass, 2, 'wood')).toBe('special-bronze')
    expect(soundForTile(grass, 3, 'wood')).toBe('special-silver')
    expect(soundForTile(grass, 5, 'wood')).toBe('special-diamond')
    for (const tile of [grass, VOID_TILE, RAINBOW_TILE, BEDROCK_TILE])
      expect(soundForTile(tile, 5, 'none')).toBe('none')
  })
  it.each(SPECIAL_TILE_SOUNDS)(
    'generates a short, finite and unclipped %s effect with click-free endpoints',
    (sound) => {
      for (const rate of [22050, 48000]) {
        const samples = synthesizeTileSound(sound, rate)
        expect(samples.length / rate).toBeGreaterThan(0.2)
        expect(samples.length / rate).toBeLessThan(1)
        expect(samples[0]).toBe(0)
        expect(samples.at(-1)).toBe(0)
        let peak = 0
        for (const sample of samples) {
          expect(Number.isFinite(sample)).toBe(true)
          peak = Math.max(peak, Math.abs(sample))
        }
        expect(peak).toBeGreaterThan(0.05)
        expect(peak).toBeLessThan(1)
      }
    },
  )
})
