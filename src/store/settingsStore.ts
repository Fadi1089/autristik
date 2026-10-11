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

interface SettingsStore {
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
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ bindings: s.bindings, keyboardLayout: s.keyboardLayout }),
      migrate: (persisted, version) => {
        const stored = (persisted as { bindings?: unknown } | undefined)?.bindings
        return {
          ...(persisted as object),
          bindings: upgradeCameraBindings(version < 2 ? upgradeLegacyBindings(stored) : stored),
        }
      },
      merge: (persisted, current) => {
        const saved = persisted as { bindings?: unknown; keyboardLayout?: unknown } | undefined
        const keyboardLayout = saved?.keyboardLayout === 'azerty' ? 'azerty' : 'qwerty'
        return {
          ...current,
          bindings: normalizeBindings(saved?.bindings),
          keyboardLayout,
          layout: KEYBOARD_LAYOUT_MAPS[keyboardLayout],
        }
      },
    },
  ),
)
