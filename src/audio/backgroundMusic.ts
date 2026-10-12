import { audioContext, loadBuffer } from './engine'
import { seamlessLoop } from './musicLoop'

export interface MusicPreferences {
  enabled: boolean
  volume: number
  visible: boolean
}

let wanted: MusicPreferences = { enabled: true, volume: 0.18, visible: true }
let unlocked = false
let source: AudioBufferSourceNode | null = null
let gain: GainNode | null = null
let loading: Promise<boolean> | null = null
let appliedGain: number | null = null
let generation = 0

function targetVolume(): number {
  return wanted.enabled && wanted.visible ? wanted.volume : 0
}

function applyVolume(ctx: AudioContext) {
  const volume = targetVolume()
  if (!gain || volume === appliedGain) return
  gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.12)
  appliedGain = volume
}

/** Updates keep the same looping voice and playhead across menus, pauses and preference changes. */
export function updateBackgroundMusic(preferences: MusicPreferences): Promise<boolean> {
  wanted = preferences
  if (!unlocked) return Promise.resolve(true)
  const ctx = audioContext()
  if (!ctx) return Promise.resolve(false)
  if (source) {
    applyVolume(ctx)
    if (targetVolume() > 0 && ctx.state !== 'running')
      return ctx
        .resume()
        .then(() => ctx.state === 'running')
        .catch(() => false)
    return Promise.resolve(true)
  }
  if (targetVolume() <= 0) return Promise.resolve(true)
  if (loading) return loading
  const currentGeneration = generation
  const attempt = (async () => {
    try {
      await ctx.resume()
      const buffer = await loadBuffer(ctx, 'sunset-walk')
      // Settings may have changed, or the app may have unmounted, while loading.
      if (generation !== currentGeneration || targetVolume() <= 0) return true
      if (ctx.state !== 'running') return false
      const voice = ctx.createBufferSource()
      const level = ctx.createGain()
      voice.buffer = seamlessLoop(ctx, buffer)
      voice.loop = true
      level.gain.value = 0
      voice.connect(level)
      level.connect(ctx.destination)
      source = voice
      gain = level
      appliedGain = null
      applyVolume(ctx)
      voice.start()
      return true
    } catch {
      source?.disconnect()
      gain?.disconnect()
      source = null
      gain = null
      appliedGain = null
      return false
    }
  })()
  loading = attempt
  void attempt.then(() => {
    if (loading === attempt) loading = null
  })
  return attempt
}

/** Only actual user input starts the music, as required by browser autoplay policies. */
export function unlockBackgroundMusic(preferences: MusicPreferences): Promise<boolean> {
  unlocked = true
  return updateBackgroundMusic(preferences)
}

export function stopBackgroundMusic() {
  generation++
  unlocked = false
  loading = null
  source?.stop()
  source?.disconnect()
  gain?.disconnect()
  source = null
  gain = null
  appliedGain = null
}
