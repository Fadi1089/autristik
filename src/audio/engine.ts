import type { PlacementSound } from '../customization'
import { synthesizeTileSound } from './tileSounds'
import type { SpecialTileSound } from './tileSounds'

export type AudioClip =
  Exclude<PlacementSound, 'none'> | SpecialTileSound | 'menu-nav' | 'sunset-walk'
let context: AudioContext | null = null
const buffers = new Map<AudioClip, Promise<AudioBuffer>>()

/** One shared context keeps effects and music under the same browser audio permission. */
export function audioContext(): AudioContext | null {
  if (typeof window.AudioContext !== 'function') return null
  try {
    context ??= new window.AudioContext()
    return context
  } catch {
    return null
  }
}

export function loadBuffer(ctx: AudioContext, clip: AudioClip): Promise<AudioBuffer> {
  const cached = buffers.get(clip)
  if (cached) return cached
  if (clip.startsWith('special-')) {
    const samples = synthesizeTileSound(clip as SpecialTileSound, ctx.sampleRate)
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate)
    buffer.getChannelData(0).set(samples)
    const generated = Promise.resolve(buffer)
    buffers.set(clip, generated)
    return generated
  }
  const loading = fetch(`${import.meta.env.BASE_URL}audio/${clip}.ogg`)
    .then((response) => {
      if (!response.ok) throw new Error('Sound unavailable')
      return response.arrayBuffer()
    })
    .then((data) => ctx.decodeAudioData(data))
    .catch((error: unknown) => {
      buffers.delete(clip)
      throw error
    })
  buffers.set(clip, loading)
  return loading
}
