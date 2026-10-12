import type { PlacementSound } from '../customization'
import { audioContext, loadBuffer } from './engine'
import type { AudioClip } from './engine'
import type { SpecialTileSound } from './tileSounds'

const voices: AudioBufferSourceNode[] = []

/** Called from user input to unlock browser audio and prepare the selected clip. */
export async function preparePlacementAudio(
  sound: PlacementSound | SpecialTileSound | 'menu-nav',
): Promise<boolean> {
  if (sound === 'none') return true
  try {
    const ctx = audioContext()
    if (!ctx) return false
    await Promise.all([ctx.resume(), loadBuffer(ctx, sound)])
    return ctx.state === 'running'
  } catch {
    return false
  }
}

/** Short, overlapping one-shots; no looping and no external request once cached. */
export async function playPlacementSound(
  sound: PlacementSound | SpecialTileSound,
  volume: number,
): Promise<boolean> {
  if (sound === 'none' || volume <= 0) return true
  return playClip(sound, volume)
}

/** Hover alone cannot grant audio permission; avoid queuing sounds before the first input. */
export function playMenuSound(volume: number): Promise<boolean> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.userActivation &&
    !navigator.userActivation.hasBeenActive
  )
    return Promise.resolve(false)
  return playClip('menu-nav', volume)
}

async function playClip(
  sound: Exclude<AudioClip, 'sunset-walk'>,
  volume: number,
): Promise<boolean> {
  if (volume <= 0) return true
  try {
    if (!(await preparePlacementAudio(sound))) return false
    const ctx = audioContext()!
    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    source.buffer = await loadBuffer(ctx, sound)
    const level = Math.max(0, Math.min(1, volume))
    gain.gain.value = level
    let filter: BiquadFilterNode | null = null
    if (sound === 'menu-nav') {
      // A lower, muffled click with a rounded attack; leave tile placement sounds untouched.
      source.playbackRate.value = 0.75
      filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 1200
      filter.Q.value = 0.5
      source.connect(filter)
      filter.connect(gain)
      const now = ctx.currentTime
      const duration = source.buffer.duration / source.playbackRate.value
      const attack = Math.min(0.006, duration / 4)
      const release = Math.min(0.012, duration / 3)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(level, now + attack)
      gain.gain.setValueAtTime(level, now + duration - release)
      gain.gain.linearRampToValueAtTime(0, now + duration)
    } else {
      source.connect(gain)
    }
    gain.connect(ctx.destination)
    if (voices.length >= 4) voices.shift()?.stop()
    voices.push(source)
    source.onended = () => {
      const index = voices.indexOf(source)
      if (index >= 0) voices.splice(index, 1)
      source.disconnect()
      filter?.disconnect()
      gain.disconnect()
    }
    source.start(ctx.currentTime)
    return true
  } catch {
    return false
  }
}
