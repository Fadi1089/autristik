import { useEffect } from 'react'
import {
  stopBackgroundMusic,
  unlockBackgroundMusic,
  updateBackgroundMusic,
} from '../audio/backgroundMusic'
import { useSettingsStore } from '../store/settingsStore'

/** Keep the atmosphere and saved preferences without subscribing to game events or clocks. */
export function useExplorationPresentation() {
  const theme = useSettingsStore((s) => s.theme)
  const language = useSettingsStore((s) => s.language)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
  useEffect(() => {
    const preferences = () => {
      const settings = useSettingsStore.getState()
      return {
        track: 'music-game' as const,
        enabled: settings.musicEnabled,
        volume: settings.musicVolume,
        visible: document.visibilityState !== 'hidden',
      }
    }
    const unlock = () => {
      void unlockBackgroundMusic(preferences())
    }
    const refresh = () => {
      void updateBackgroundMusic(preferences())
    }
    refresh()
    const unsubscribe = useSettingsStore.subscribe((next, previous) => {
      if (next.musicEnabled !== previous.musicEnabled || next.musicVolume !== previous.musicVolume)
        refresh()
    })
    window.addEventListener('pointerdown', unlock, { capture: true })
    window.addEventListener('keydown', unlock, { capture: true })
    document.addEventListener('visibilitychange', refresh)
    return () => {
      unsubscribe()
      window.removeEventListener('pointerdown', unlock, { capture: true })
      window.removeEventListener('keydown', unlock, { capture: true })
      document.removeEventListener('visibilitychange', refresh)
      stopBackgroundMusic()
    }
  }, [])
}
