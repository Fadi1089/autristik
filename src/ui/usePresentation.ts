import { useEffect } from 'react'
import { playPlacementSound, preparePlacementAudio } from '../audio/placementAudio'
import { isNewPlacement } from '../audio/placementEvents'
import { soundForTile } from '../audio/tileSounds'
import { musicTrackForGame } from '../audio/musicTracks'
import {
  stopBackgroundMusic,
  unlockBackgroundMusic,
  updateBackgroundMusic,
} from '../audio/backgroundMusic'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'
import { gameCueEvent } from '../audio/gameCueEvents'
import { playGameCue, prepareGameCueAudio, stopGameCues } from '../audio/gameCueAudio'
import {
  clockWarningActive,
  stopClockWarning,
  unlockClockWarning,
  updateClockWarning,
} from '../audio/clockWarning'

/** Presentation follows preferences and game events without changing game rules. */
export function usePresentation() {
  const language = useSettingsStore((s) => s.language)
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
  const theme = useSettingsStore((s) => s.theme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const clockPreferences = () => {
      const { clockSoundEnabled, clockSoundVolume } = useSettingsStore.getState()
      return {
        active: clockWarningActive(useGameStore.getState()),
        enabled: clockSoundEnabled,
        volume: clockSoundVolume,
        visible: document.visibilityState !== 'hidden',
      }
    }
    const musicPreferences = () => {
      const { musicEnabled, musicVolume } = useSettingsStore.getState()
      return {
        track: musicTrackForGame(useGameStore.getState()),
        enabled: musicEnabled,
        volume: musicVolume,
        visible: document.visibilityState !== 'hidden',
      }
    }
    const unlock = () => {
      const settings = useSettingsStore.getState()
      if (settings.placementSoundEnabled && settings.soundVolume > 0)
        void preparePlacementAudio(settings.placementSound)
      if (settings.placementSoundEnabled && settings.soundVolume > 0)
        void preparePlacementAudio('special-gold')
      if (settings.menuSoundEnabled && settings.menuSoundVolume > 0)
        void preparePlacementAudio('menu-nav')
      void unlockBackgroundMusic(musicPreferences())
      void unlockClockWarning(clockPreferences())
      if (settings.feedbackSoundEnabled && settings.feedbackSoundVolume > 0)
        void prepareGameCueAudio()
    }
    const visibility = () => {
      void updateBackgroundMusic(musicPreferences())
      void updateClockWarning(clockPreferences())
      if (document.visibilityState === 'hidden') stopGameCues()
    }
    // Capture input before the menu consumes arrow keys or a settings key capture stops propagation.
    window.addEventListener('pointerdown', unlock, { capture: true })
    window.addEventListener('keydown', unlock, { capture: true })
    document.addEventListener('visibilitychange', visibility)
    // Try the home track immediately; a browser rejection is retried on actual input.
    void updateBackgroundMusic(musicPreferences())
    const unsubscribeSettings = useSettingsStore.subscribe((next, previous) => {
      if (!next.feedbackSoundEnabled || next.feedbackSoundVolume <= 0) stopGameCues()
      if (next.musicEnabled !== previous.musicEnabled || next.musicVolume !== previous.musicVolume)
        void updateBackgroundMusic(musicPreferences())
      if (
        next.clockSoundEnabled !== previous.clockSoundEnabled ||
        next.clockSoundVolume !== previous.clockSoundVolume
      )
        void updateClockWarning(clockPreferences())
    })
    const unsubscribe = useGameStore.subscribe((next, previous) => {
      if (musicTrackForGame(next) !== musicTrackForGame(previous))
        void updateBackgroundMusic(musicPreferences())
      if (next.runId !== previous.runId || next.menuOpen) stopGameCues()
      const cue = gameCueEvent(next, previous)
      const preferences = useSettingsStore.getState()
      if (cue && preferences.feedbackSoundEnabled && document.visibilityState !== 'hidden')
        void playGameCue(cue, preferences.feedbackSoundVolume)
      if (clockWarningActive(next) !== clockWarningActive(previous))
        void updateClockWarning(clockPreferences())
      if (!isNewPlacement(next, previous) || document.visibilityState === 'hidden') return
      if (next.lastPlacement) {
        const sound = soundForTile(
          next.lastPlacement.quadrants,
          next.lastPlacement.intrinsicMultiplier,
          preferences.placementSound,
        )
        if (preferences.placementSoundEnabled)
          void playPlacementSound(sound, preferences.soundVolume)
      }
    })
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true })
      window.removeEventListener('keydown', unlock, { capture: true })
      document.removeEventListener('visibilitychange', visibility)
      unsubscribeSettings()
      unsubscribe()
      stopBackgroundMusic()
      stopClockWarning()
      stopGameCues()
    }
  }, [])
}
