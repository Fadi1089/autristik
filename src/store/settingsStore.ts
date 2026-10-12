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
  normalizePlacementSound,
  normalizeSoundVolume,
  normalizeTheme,
} from '../customization'
import type { GameTheme, PlacementSound } from '../customization'

interface SettingsStore {
  readonly theme: GameTheme
  readonly placementSound: PlacementSound
  readonly soundVolume: number
  readonly menuSoundEnabled: boolean
  readonly menuSoundVolume: number
  readonly musicEnabled: boolean
  readonly musicVolume: number
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
      theme: 'light',
      placementSound: 'wood',
      soundVolume: 0.5,
      menuSoundEnabled: true,
      menuSoundVolume: DEFAULT_MENU_SOUND_VOLUME,
      musicEnabled: true,
      musicVolume: 0.18,
      setMenuSoundEnabled: (menuSoundEnabled) => set({ menuSoundEnabled }),
      setMenuSoundVolume: (volume) =>
        set({ menuSoundVolume: normalizeSoundVolume(volume, DEFAULT_MENU_SOUND_VOLUME) }),
      setMusicEnabled: (musicEnabled) => set({ musicEnabled }),
      setMusicVolume: (volume) => set({ musicVolume: normalizeSoundVolume(volume, 0.18) }),
      setTheme: (theme) => set({ theme }),
      setPlacementSound: (placementSound) => set({ placementSound }),
      setSoundVolume: (volume) => set({ soundVolume: normalizeSoundVolume(volume) }),
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
      version: 4,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        bindings: s.bindings,
        keyboardLayout: s.keyboardLayout,
        theme: s.theme,
        placementSound: s.placementSound,
        soundVolume: s.soundVolume,
        menuSoundEnabled: s.menuSoundEnabled,
        menuSoundVolume: s.menuSoundVolume,
        musicEnabled: s.musicEnabled,
        musicVolume: s.musicVolume,
      }),
      migrate: (persisted, version) => {
        const previous = persisted as { bindings?: unknown; menuSoundVolume?: unknown } | undefined
        const stored = previous?.bindings
        return {
          ...(persisted as object),
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
              bindings?: unknown
              keyboardLayout?: unknown
              theme?: unknown
              placementSound?: unknown
              soundVolume?: unknown
              menuSoundEnabled?: unknown
              menuSoundVolume?: unknown
              musicEnabled?: unknown
              musicVolume?: unknown
            }
          | undefined
        const keyboardLayout = saved?.keyboardLayout === 'azerty' ? 'azerty' : 'qwerty'
        return {
          ...current,
          bindings: normalizeBindings(saved?.bindings),
          keyboardLayout,
          layout: KEYBOARD_LAYOUT_MAPS[keyboardLayout],
          theme: normalizeTheme(saved?.theme),
          placementSound: normalizePlacementSound(saved?.placementSound),
          soundVolume: normalizeSoundVolume(saved?.soundVolume),
          menuSoundEnabled:
            typeof saved?.menuSoundEnabled === 'boolean' ? saved.menuSoundEnabled : true,
          menuSoundVolume: normalizeSoundVolume(saved?.menuSoundVolume, DEFAULT_MENU_SOUND_VOLUME),
          musicEnabled: typeof saved?.musicEnabled === 'boolean' ? saved.musicEnabled : true,
          musicVolume: normalizeSoundVolume(saved?.musicVolume, 0.18),
        }
      },
    },
  ),
)
