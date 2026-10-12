import { useEffect } from 'react'
import { playPlacementSound, preparePlacementAudio } from '../audio/placementAudio'
import { isNewPlacement } from '../audio/placementEvents'
import { soundForTile } from '../audio/tileSounds'
import {
  stopBackgroundMusic,
  unlockBackgroundMusic,
  updateBackgroundMusic,
} from '../audio/backgroundMusic'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'

/** Presentation follows preferences and game events without changing game rules. */
export function usePresentation() {
  const theme = useSettingsStore((s) => s.theme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const musicPreferences = () => {
      const { musicEnabled, musicVolume } = useSettingsStore.getState()
      return {
        enabled: musicEnabled,
        volume: musicVolume,
        visible: document.visibilityState !== 'hidden',
      }
    }
    const unlock = () => {
      const settings = useSettingsStore.getState()
      if (settings.soundVolume > 0) void preparePlacementAudio(settings.placementSound)
      if (settings.menuSoundEnabled && settings.menuSoundVolume > 0)
        void preparePlacementAudio('menu-nav')
      void unlockBackgroundMusic(musicPreferences())
    }
    const visibility = () => {
      void updateBackgroundMusic(musicPreferences())
    }
    // Capture input before the menu consumes arrow keys or a settings key capture stops propagation.
    window.addEventListener('pointerdown', unlock, { capture: true })
    window.addEventListener('keydown', unlock, { capture: true })
    document.addEventListener('visibilitychange', visibility)
    const unsubscribeSettings = useSettingsStore.subscribe((next, previous) => {
      if (next.musicEnabled !== previous.musicEnabled || next.musicVolume !== previous.musicVolume)
        void updateBackgroundMusic(musicPreferences())
    })
    const unsubscribe = useGameStore.subscribe((next, previous) => {
      if (!isNewPlacement(next, previous) || document.visibilityState === 'hidden') return
      const { placementSound, soundVolume } = useSettingsStore.getState()
      if (next.lastPlacement)
        void playPlacementSound(
          soundForTile(
            next.lastPlacement.quadrants,
            next.lastPlacement.tileMultiplier,
            placementSound,
          ),
          soundVolume,
        )
    })
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true })
      window.removeEventListener('keydown', unlock, { capture: true })
      document.removeEventListener('visibilitychange', visibility)
      unsubscribeSettings()
      unsubscribe()
      stopBackgroundMusic()
    }
  }, [])
}
