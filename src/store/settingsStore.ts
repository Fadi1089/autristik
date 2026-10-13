import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  DEFAULT_BINDINGS,
  normalizeBindings,
  upgradeCameraBindings,
  upgradeLegacyBindings,
  withBinding,
  withoutBinding,
} from '../input/bindings'
import type { Action, Bindings, KeySlot } from '../input/bindings'
import { KEYBOARD_LAYOUT_MAPS } from '../input/keyLabels'
import type { KeyboardLayout, LayoutMap } from '../input/keyLabels'
import {
  DEFAULT_MENU_SOUND_VOLUME,
  DEFAULT_TILE_SOUND_VOLUME,
  normalizePlacementSound,
  normalizeSoundVolume,
  normalizeTheme,
} from '../customization'
import type { GameTheme, PlacementSound } from '../customization'
import { browserLanguage, normalizeLanguage } from '../i18n/language'
import type { Language } from '../i18n/language'

interface SettingsStore {
  readonly language: Language
  setLanguage(language: Language): void
  readonly theme: GameTheme
  readonly placementSound: PlacementSound
  readonly soundVolume: number
  readonly placementSoundEnabled: boolean
  setPlacementSoundEnabled(enabled: boolean): void
  readonly menuSoundEnabled: boolean
  readonly menuSoundVolume: number
  readonly musicEnabled: boolean
  readonly musicVolume: number
  readonly clockSoundEnabled: boolean
  readonly clockSoundVolume: number
  readonly feedbackSoundEnabled: boolean
  readonly feedbackSoundVolume: number
  setFeedbackSoundEnabled(enabled: boolean): void
  setFeedbackSoundVolume(volume: number): void
  setClockSoundEnabled(enabled: boolean): void
  setClockSoundVolume(volume: number): void
  setMenuSoundEnabled(enabled: boolean): void
  setMenuSoundVolume(volume: number): void
  setMusicEnabled(enabled: boolean): void
  setMusicVolume(volume: number): void
  setTheme(theme: GameTheme): void
  setPlacementSound(sound: PlacementSound): void
  setSoundVolume(volume: number): void
  readonly bindings: Bindings
  readonly keyboardLayout: KeyboardLayout
  /** Printed key labels shared by settings, hints and rotation buttons. */
  readonly layout: LayoutMap
  /** The key slot waiting for a key press in the settings panel. Game keys are off meanwhile. */
  readonly capturing: { action: Action; slot: KeySlot } | null

  bind(action: Action, slot: KeySlot, code: string): void
  unbind(action: Action, slot: KeySlot): void
  resetBindings(): void
  setKeyboardLayout(layout: KeyboardLayout): void
  setCapturing(capturing: SettingsStore['capturing']): void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      language: browserLanguage(),
      setLanguage: (language) => set({ language }),
      theme: 'light',
      placementSound: 'drop',
      soundVolume: DEFAULT_TILE_SOUND_VOLUME,
      placementSoundEnabled: true,
      setPlacementSoundEnabled: (placementSoundEnabled) => set({ placementSoundEnabled }),
      menuSoundEnabled: true,
      menuSoundVolume: DEFAULT_MENU_SOUND_VOLUME,
      musicEnabled: true,
      musicVolume: 0.18,
      clockSoundEnabled: true,
      clockSoundVolume: 0.25,
      feedbackSoundEnabled: true,
      feedbackSoundVolume: 0.35,
      setFeedbackSoundEnabled: (feedbackSoundEnabled) => set({ feedbackSoundEnabled }),
      setFeedbackSoundVolume: (volume) =>
        set({ feedbackSoundVolume: normalizeSoundVolume(volume, 0.35) }),
      setClockSoundEnabled: (clockSoundEnabled) => set({ clockSoundEnabled }),
      setClockSoundVolume: (volume) =>
        set({ clockSoundVolume: normalizeSoundVolume(volume, 0.25) }),
      setMenuSoundEnabled: (menuSoundEnabled) => set({ menuSoundEnabled }),
      setMenuSoundVolume: (volume) =>
        set({ menuSoundVolume: normalizeSoundVolume(volume, DEFAULT_MENU_SOUND_VOLUME) }),
      setMusicEnabled: (musicEnabled) => set({ musicEnabled }),
      setMusicVolume: (volume) => set({ musicVolume: normalizeSoundVolume(volume, 0.18) }),
      setTheme: (theme) => set({ theme }),
      setPlacementSound: (placementSound) => set({ placementSound }),
      setSoundVolume: (volume) =>
        set({ soundVolume: normalizeSoundVolume(volume, DEFAULT_TILE_SOUND_VOLUME) }),
      bindings: DEFAULT_BINDINGS,
      keyboardLayout: 'qwerty',
      layout: KEYBOARD_LAYOUT_MAPS.qwerty,
      capturing: null,

      bind: (action, slot, code) =>
        set((s) => ({ bindings: withBinding(s.bindings, action, slot, code), capturing: null })),
      unbind: (action, slot) =>
        set((s) => ({ bindings: withoutBinding(s.bindings, action, slot), capturing: null })),
      resetBindings: () => set({ bindings: DEFAULT_BINDINGS, capturing: null }),
      setKeyboardLayout: (keyboardLayout) =>
        set({ keyboardLayout, layout: KEYBOARD_LAYOUT_MAPS[keyboardLayout], capturing: null }),
      setCapturing: (capturing) => set({ capturing }),
    }),
    {
      name: 'autristik:settings',
      version: 6,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        language: s.language,
        bindings: s.bindings,
        keyboardLayout: s.keyboardLayout,
        theme: s.theme,
        placementSound: s.placementSound,
        soundVolume: s.soundVolume,
        placementSoundEnabled: s.placementSoundEnabled,
        menuSoundEnabled: s.menuSoundEnabled,
        menuSoundVolume: s.menuSoundVolume,
        musicEnabled: s.musicEnabled,
        musicVolume: s.musicVolume,
        clockSoundEnabled: s.clockSoundEnabled,
        clockSoundVolume: s.clockSoundVolume,
        feedbackSoundEnabled: s.feedbackSoundEnabled,
        feedbackSoundVolume: s.feedbackSoundVolume,
      }),
      migrate: (persisted, version) => {
        const previous = persisted as
          | {
              bindings?: unknown
              menuSoundVolume?: unknown
              placementSound?: unknown
              soundVolume?: unknown
              specialSoundVolume?: unknown
              placementSoundEnabled?: unknown
              specialSoundEnabled?: unknown
            }
          | undefined
        const stored = previous?.bindings
        return {
          ...(persisted as object),
          soundVolume:
            version < 6 && previous?.soundVolume === 0.5
              ? DEFAULT_TILE_SOUND_VOLUME
              : normalizeSoundVolume(
                  previous?.soundVolume ?? previous?.specialSoundVolume,
                  DEFAULT_TILE_SOUND_VOLUME,
                ),
          placementSoundEnabled:
            previous?.placementSoundEnabled !== false && previous?.specialSoundEnabled !== false,
          placementSound:
            version < 5 && previous?.placementSound === 'wood'
              ? 'drop'
              : normalizePlacementSound(previous?.placementSound),
          bindings:
            version < 3
              ? upgradeCameraBindings(version < 2 ? upgradeLegacyBindings(stored) : stored)
              : normalizeBindings(stored),
          // Lower the old default for existing players; retain customized volumes, including mute.
          menuSoundVolume:
            version < 4 && previous?.menuSoundVolume === 0.25
              ? DEFAULT_MENU_SOUND_VOLUME
              : normalizeSoundVolume(previous?.menuSoundVolume, DEFAULT_MENU_SOUND_VOLUME),
        }
      },
      merge: (persisted, current) => {
        const saved = persisted as
          | {
              language?: unknown
              bindings?: unknown
              keyboardLayout?: unknown
              theme?: unknown
              placementSound?: unknown
              soundVolume?: unknown
              placementSoundEnabled?: unknown
              menuSoundEnabled?: unknown
              menuSoundVolume?: unknown
              musicEnabled?: unknown
              musicVolume?: unknown
              clockSoundEnabled?: unknown
              clockSoundVolume?: unknown
              feedbackSoundEnabled?: unknown
              feedbackSoundVolume?: unknown
            }
          | undefined
        const keyboardLayout = saved?.keyboardLayout === 'azerty' ? 'azerty' : 'qwerty'
        return {
          ...current,
          language: normalizeLanguage(saved?.language),
          bindings: normalizeBindings(saved?.bindings),
          keyboardLayout,
          layout: KEYBOARD_LAYOUT_MAPS[keyboardLayout],
          theme: normalizeTheme(saved?.theme),
          placementSound: normalizePlacementSound(saved?.placementSound),
          soundVolume: normalizeSoundVolume(saved?.soundVolume, DEFAULT_TILE_SOUND_VOLUME),
          placementSoundEnabled:
            typeof saved?.placementSoundEnabled === 'boolean' ? saved.placementSoundEnabled : true,
          menuSoundEnabled:
            typeof saved?.menuSoundEnabled === 'boolean' ? saved.menuSoundEnabled : true,
          menuSoundVolume: normalizeSoundVolume(saved?.menuSoundVolume, DEFAULT_MENU_SOUND_VOLUME),
          musicEnabled: typeof saved?.musicEnabled === 'boolean' ? saved.musicEnabled : true,
          musicVolume: normalizeSoundVolume(saved?.musicVolume, 0.18),
          clockSoundEnabled:
            typeof saved?.clockSoundEnabled === 'boolean' ? saved.clockSoundEnabled : true,
          clockSoundVolume: normalizeSoundVolume(saved?.clockSoundVolume, 0.25),
          feedbackSoundEnabled:
            typeof saved?.feedbackSoundEnabled === 'boolean' ? saved.feedbackSoundEnabled : true,
          feedbackSoundVolume: normalizeSoundVolume(saved?.feedbackSoundVolume, 0.35),
        }
      },
    },
  ),
)
