import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_BINDINGS, normalizeBindings, withBinding, withoutBinding } from '../input/bindings'
import type { Action, Bindings, KeySlot } from '../input/bindings'
import { loadLayoutMap } from '../input/keyLabels'
import type { LayoutMap } from '../input/keyLabels'

interface SettingsStore {
  readonly bindings: Bindings
  /** Printed key labels for the player's keyboard layout, when the browser exposes them. */
  readonly layout: LayoutMap | null
  /** The key slot waiting for a key press in the settings panel. Game keys are off meanwhile. */
  readonly capturing: { action: Action; slot: KeySlot } | null

  bind(action: Action, slot: KeySlot, code: string): void
  unbind(action: Action, slot: KeySlot): void
  resetBindings(): void
  setCapturing(capturing: SettingsStore['capturing']): void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      bindings: DEFAULT_BINDINGS,
      layout: null,
      capturing: null,

      bind: (action, slot, code) =>
        set((s) => ({ bindings: withBinding(s.bindings, action, slot, code), capturing: null })),
      unbind: (action, slot) =>
        set((s) => ({ bindings: withoutBinding(s.bindings, action, slot), capturing: null })),
      resetBindings: () => set({ bindings: DEFAULT_BINDINGS, capturing: null }),
      setCapturing: (capturing) => set({ capturing }),
    }),
    {
      name: 'autristik:settings',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ bindings: s.bindings }),
      merge: (persisted, current) => ({
        ...current,
        bindings: normalizeBindings((persisted as { bindings?: unknown } | undefined)?.bindings),
      }),
    },
  ),
)

void loadLayoutMap().then((layout) => {
  if (layout) useSettingsStore.setState({ layout })
})
