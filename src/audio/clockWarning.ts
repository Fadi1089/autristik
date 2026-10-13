import { audioContext, loadBuffer } from './engine'
import type { GameState } from '../game/game'
import { lowTime } from '../game/alerts'

export function clockWarningActive(
  state: Pick<GameState, 'variant' | 'current' | 'timeRemaining'> & {
    started: boolean
    menuOpen: boolean
  },
): boolean {
  return (
    state.started &&
    !state.menuOpen &&
    state.current !== null &&
    state.variant === 'time-attack' &&
    lowTime(state.timeRemaining)
  )
}

export interface ClockPreferences {
  active: boolean
  enabled: boolean
  volume: number
  visible: boolean
}

let wanted: ClockPreferences = { active: false, enabled: true, volume: 0.25, visible: true }
let unlocked = false
let source: AudioBufferSourceNode | null = null
let gain: GainNode | null = null
let loading: Promise<boolean> | null = null
let generation = 0
let appliedVolume: number | null = null

function audible(): boolean {
  return wanted.active && wanted.enabled && wanted.visible && wanted.volume > 0
}

function stopVoice() {
  generation++
  loading = null
  source?.stop()
  source?.disconnect()
  gain?.disconnect()
  source = null
  gain = null
  appliedVolume = null
}

function applyVolume(ctx: AudioContext) {
  const volume = Math.max(0, Math.min(1, wanted.volume))
  if (gain && volume !== appliedVolume) {
    gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.015)
    appliedVolume = volume
  }
}

/** One native looping voice; repeated timer ticks never create overlapping clocks. */
export function updateClockWarning(preferences: ClockPreferences): Promise<boolean> {
  wanted = preferences
  if (!audible()) {
    if (source || loading) stopVoice()
    return Promise.resolve(true)
  }
  if (!unlocked) return Promise.resolve(true)
  const ctx = audioContext()
  if (!ctx) return Promise.resolve(false)
  if (source) {
    applyVolume(ctx)
    return Promise.resolve(true)
  }
  if (loading) return loading
  const currentGeneration = generation
  const attempt = (async () => {
    try {
      await ctx.resume()
      const buffer = await loadBuffer(ctx, 'clock-tick')
      if (generation !== currentGeneration || !audible()) return true
      if (ctx.state !== 'running') return false
      const voice = ctx.createBufferSource()
      const level = ctx.createGain()
      voice.buffer = buffer
      voice.loop = true
      level.gain.value = 0
      voice.connect(level)
      level.connect(ctx.destination)
      source = voice
      gain = level
      applyVolume(ctx)
      voice.start()
      return true
    } catch {
      if (generation === currentGeneration) stopVoice()
      return false
    }
  })()
  loading = attempt
  void attempt.then(() => {
    if (loading === attempt) loading = null
  })
  return attempt
}

/** Browser audio permission is shared, but the clock remains independent of music. */
export function unlockClockWarning(preferences: ClockPreferences): Promise<boolean> {
  unlocked = true
  // Prime audio during the gesture even if music and placement effects are disabled.
  if (preferences.enabled && preferences.volume > 0)
    void audioContext()
      ?.resume()
      .catch(() => undefined)
  return updateClockWarning(preferences)
}

export function stopClockWarning() {
  unlocked = false
  stopVoice()
}
