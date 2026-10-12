import type { PlacementSound } from '../customization'
import { tileKind } from '../game/tiles'
import type { Quadrants, TileMultiplier } from '../game/tiles'

export const SPECIAL_TILE_SOUNDS = [
  'special-void',
  'special-gold',
  'special-bedrock',
  'special-bronze',
  'special-silver',
  'special-diamond',
] as const
export type SpecialTileSound = (typeof SPECIAL_TILE_SOUNDS)[number]

/** Use the tile just placed, not the new tile drawn afterwards. Silent mutes every tile. */
export function soundForTile(
  quadrants: Quadrants,
  multiplier: TileMultiplier,
  standard: PlacementSound,
): PlacementSound | SpecialTileSound {
  if (standard === 'none') return 'none'
  const kind = tileKind(quadrants)
  if (kind !== 'normal') return `special-${kind}`
  if (multiplier === 2) return 'special-bronze'
  if (multiplier === 3) return 'special-silver'
  if (multiplier === 5) return 'special-diamond'
  return standard
}

/** Original, short PCM effects: suction, coin-like gold, rock and three distinct bonus timbres. */
export function synthesizeTileSound(sound: SpecialTileSound, sampleRate: number): Float32Array {
  const duration =
    sound === 'special-void'
      ? 0.85
      : sound === 'special-bedrock'
        ? 0.28
        : sound === 'special-diamond'
          ? 0.72
          : 0.55
  const samples = new Float32Array(Math.ceil(duration * sampleRate))
  const frequency =
    sound === 'special-gold'
      ? 660
      : sound === 'special-bronze'
        ? 220
        : sound === 'special-silver'
          ? 620
          : 1046
  let phase = 0,
    low = 0,
    highLow = 0,
    seed = 42
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate
    const p = t / duration
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const noise = (seed / 2 ** 32) * 2 - 1
    const attack = Math.min(1, t / 0.008)
    const tail = Math.min(1, (duration - t) / 0.035)
    let value: number
    if (sound === 'special-void') {
      const cutoff = 2500 * 0.035 ** p
      low += (1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate)) * (noise - low)
      highLow += (1 - Math.exp((-2 * Math.PI * cutoff * 0.25) / sampleRate)) * (noise - highLow)
      phase += (2 * Math.PI * (160 * 0.2 ** p)) / sampleRate
      const swell = Math.sin(Math.PI * p) ** 0.7
      value = ((low - highLow) * 2.2 + Math.sin(phase) * 0.16) * swell * attack * tail
    } else if (sound === 'special-bedrock') {
      low += (1 - Math.exp((-2 * Math.PI * 550) / sampleRate)) * (noise - low)
      value =
        (Math.sin(2 * Math.PI * 65 * t) * 0.6 + low * 0.55) * Math.exp(-16 * t) * attack * tail
    } else {
      const ratios = sound === 'special-diamond' ? [1, 1.5, 2.5] : [1, 2.41, 3.73]
      value = 0
      ratios.forEach((ratio, partial) => {
        const delay = sound === 'special-diamond' ? partial * 0.035 : 0
        const local = t - delay
        if (local >= 0)
          value +=
            (Math.sin(2 * Math.PI * frequency * ratio * local) *
              Math.exp(-(6 + partial * 3) * local) *
              Math.min(1, local / 0.005)) /
            (partial + 1)
      })
      value *= 0.42 * tail
    }
    samples[i] = Math.max(-0.9, Math.min(0.9, value))
  }
  samples[0] = 0
  samples[samples.length - 1] = 0
  return samples
}
