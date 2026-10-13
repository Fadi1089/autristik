import { audioContext, loadBuffer } from './engine'
import { GAME_CUES } from './gameCueSounds'
import type { GameCue } from './gameCueSounds'

let generation = 0
const voices = new Set<AudioBufferSourceNode>()

/** Prime independent alerts on a real gesture, even when other sounds are muted. */
export async function prepareGameCueAudio(): Promise<boolean> {
  try {
    const ctx = audioContext()
    if (!ctx) return false
    await Promise.all([ctx.resume(), ...GAME_CUES.map((cue) => loadBuffer(ctx, cue))])
    return ctx.state === 'running'
  } catch {
    return false
  }
}

export async function playGameCue(cue: GameCue, volume: number): Promise<boolean> {
  if (!Number.isFinite(volume) || volume <= 0) return true
  const wantedGeneration = generation
  try {
    const ctx = audioContext()
    if (!ctx) return false
    await ctx.resume()
    const buffer = await loadBuffer(ctx, cue)
    if (wantedGeneration !== generation || ctx.state !== 'running') return false
    const voice = ctx.createBufferSource()
    const gain = ctx.createGain()
    voice.buffer = buffer
    gain.gain.value = Math.min(1, volume)
    voice.connect(gain)
    gain.connect(ctx.destination)
    // Rapid drops may replace the previous alert; do not queue an obsolete supply count.
    for (const previous of voices) previous.stop()
    voices.clear()
    voices.add(voice)
    voice.onended = () => {
      voices.delete(voice)
      voice.disconnect()
      gain.disconnect()
    }
    voice.start()
    return true
  } catch {
    return false
  }
}

export function stopGameCues() {
  generation++
  for (const voice of voices) voice.stop()
  voices.clear()
}
