import { MUSIC_FILES } from './musicTracks'
import type { MusicTrack } from './musicTracks'

export interface MusicPreferences {
  track: MusicTrack
  enabled: boolean
  volume: number
  visible: boolean
}
let wanted: MusicPreferences = { track: 'music-menu', enabled: true, volume: 0.18, visible: true }
let player: HTMLAudioElement | null = null
let loading: Promise<boolean> | null = null
let generation = 0

function applyVolume() {
  if (player)
    player.volume = wanted.enabled && wanted.visible ? Math.max(0, Math.min(1, wanted.volume)) : 0
}

/** Native streaming can autoplay independently of a suspended effects AudioContext. */
export function updateBackgroundMusic(preferences: MusicPreferences): Promise<boolean> {
  if (wanted.track !== preferences.track) {
    generation++
    loading = null
    disposePlayer()
  }
  wanted = preferences
  if (player) {
    applyVolume()
    return Promise.resolve(true)
  }
  if (!wanted.enabled || !wanted.visible || wanted.volume <= 0) return Promise.resolve(true)
  if (loading) return loading
  const currentGeneration = generation
  const attempt = (async () => {
    try {
      if (typeof Audio !== 'function') return false
      const media = new Audio(`${import.meta.env.BASE_URL}audio/${MUSIC_FILES[preferences.track]}`)
      media.loop = true
      media.preload = 'auto'
      player = media
      applyVolume()
      // Called immediately, including at mount. Autoplay failures leave input free to retry.
      await media.play()
      return true
    } catch {
      if (generation === currentGeneration) disposePlayer()
      return false
    }
  })()
  loading = attempt
  void attempt.then(() => {
    if (loading === attempt) loading = null
  })
  return attempt
}

/** Retry blocked autoplay on a real gesture anywhere in the page. */
export function unlockBackgroundMusic(preferences: MusicPreferences): Promise<boolean> {
  return updateBackgroundMusic(preferences)
}

export function stopBackgroundMusic() {
  generation++
  loading = null
  disposePlayer()
}

function disposePlayer() {
  player?.pause()
  player?.removeAttribute('src')
  player?.load()
  player = null
}
