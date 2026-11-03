import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_BINDINGS, normalizeBindings, withBinding, withoutBinding } from '../input/bindings'
import type { Action, Bindings, KeySlot } from '../input/bindings'
import { KEYBOARD_LAYOUT_MAPS } from '../input/keyLabels'
import type { KeyboardLayout, LayoutMap } from '../input/keyLabels'
import { fallbackKeyboardLayout } from '../input/keyboardDetection'
import { BIOMES, DEFAULT_BIOME_PROBABILITIES, validBiomeProbabilities } from '../game/tiles'
import type { Biome, BiomeProbabilities } from '../game/tiles'

const initialKeyboardLayout = fallbackKeyboardLayout(
  typeof navigator === 'undefined' ? '' : navigator.language,
)

interface SettingsStore {
  readonly bindings: Bindings
  readonly keyboardLayout: KeyboardLayout
  readonly keyboardLayoutManual: boolean
  /** Printed key labels for the player's keyboard layout. */
  readonly layout: LayoutMap | null
  readonly biomeProbabilities: BiomeProbabilities
  /** The key slot waiting for a key press in the settings panel. Game keys are off meanwhile. */
  readonly capturing: { action: Action; slot: KeySlot } | null

  bind(action: Action, slot: KeySlot, code: string): void
  unbind(action: Action, slot: KeySlot): void
  resetBindings(): void
  resetBiomeProbabilities(): void
  /** Replaces all the odds at once, e.g. with a loaded game's; invalid odds are ignored. */
  setBiomeProbabilities(probabilities: BiomeProbabilities): void
  setBiomeCountWeight(count: 1 | 2 | 3 | 4, value: number): void
  setBiomeWeight(biome: Biome, value: number): void
  setKeyboardLayout(keyboardLayout: KeyboardLayout): void
  setDetectedKeyboardLayout(keyboardLayout: KeyboardLayout): void
  setCapturing(capturing: SettingsStore['capturing']): void
}

function validWeight(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : fallback
}

function normalizeProbabilities(stored: unknown): BiomeProbabilities {
  if (typeof stored !== 'object' || stored === null) return DEFAULT_BIOME_PROBABILITIES
  const saved = stored as {
    biomeCounts?: Record<number, unknown>
    biomeWeights?: Record<string, unknown>
  }
  const biomeCounts = { ...DEFAULT_BIOME_PROBABILITIES.biomeCounts }
  const biomeWeights = { ...DEFAULT_BIOME_PROBABILITIES.biomeWeights }
  for (const count of [1, 2, 3, 4] as const)
    biomeCounts[count] = validWeight(saved.biomeCounts?.[count], biomeCounts[count])
  for (const biome of BIOMES)
    biomeWeights[biome] = validWeight(saved.biomeWeights?.[biome], biomeWeights[biome])

  const normalized = {
    biomeCounts: Object.values(biomeCounts).every((weight) => weight === 0)
      ? DEFAULT_BIOME_PROBABILITIES.biomeCounts
      : biomeCounts,
    biomeWeights: Object.values(biomeWeights).every((weight) => weight === 0)
      ? DEFAULT_BIOME_PROBABILITIES.biomeWeights
      : biomeWeights,
  }
  // Fewer biomes enabled than a piece may ask for: bring the default biome weights back.
  return validBiomeProbabilities(normalized)
    ? normalized
    : { ...normalized, biomeWeights: DEFAULT_BIOME_PROBABILITIES.biomeWeights }
}

/** Applies a change to the odds, unless it would leave settings that can't draw every piece. */
function withChange(
  probabilities: BiomeProbabilities,
  change: Partial<BiomeProbabilities>,
): BiomeProbabilities {
  const next = { ...probabilities, ...change }
  return validBiomeProbabilities(next) ? next : probabilities
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      bindings: DEFAULT_BINDINGS,
      keyboardLayout: initialKeyboardLayout,
      keyboardLayoutManual: false,
      layout: KEYBOARD_LAYOUT_MAPS[initialKeyboardLayout],
      biomeProbabilities: DEFAULT_BIOME_PROBABILITIES,
      capturing: null,

      bind: (action, slot, code) =>
        set((s) => ({ bindings: withBinding(s.bindings, action, slot, code), capturing: null })),
      unbind: (action, slot) =>
        set((s) => ({ bindings: withoutBinding(s.bindings, action, slot), capturing: null })),
      resetBindings: () => set({ bindings: DEFAULT_BINDINGS, capturing: null }),
      resetBiomeProbabilities: () => set({ biomeProbabilities: DEFAULT_BIOME_PROBABILITIES }),
      setBiomeProbabilities: (probabilities) =>
        set((s) => ({ biomeProbabilities: withChange(s.biomeProbabilities, probabilities) })),
      setBiomeCountWeight: (count, value) =>
        set(({ biomeProbabilities: p }) => ({
          biomeProbabilities: withChange(p, {
            biomeCounts: { ...p.biomeCounts, [count]: validWeight(value, p.biomeCounts[count]) },
          }),
        })),
      setBiomeWeight: (biome, value) =>
        set(({ biomeProbabilities: p }) => ({
          biomeProbabilities: withChange(p, {
            biomeWeights: { ...p.biomeWeights, [biome]: validWeight(value, p.biomeWeights[biome]) },
          }),
        })),
      setKeyboardLayout: (keyboardLayout) =>
        set({
          keyboardLayout,
          layout: KEYBOARD_LAYOUT_MAPS[keyboardLayout],
          keyboardLayoutManual: true,
        }),
      setDetectedKeyboardLayout: (keyboardLayout) => {
        const current = get()
        if (current.keyboardLayoutManual || current.keyboardLayout === keyboardLayout) return
        set({ keyboardLayout, layout: KEYBOARD_LAYOUT_MAPS[keyboardLayout] })
      },
      setCapturing: (capturing) => set({ capturing }),
    }),
    {
      name: 'autristik:settings',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        bindings: s.bindings,
        keyboardLayout: s.keyboardLayout,
        keyboardLayoutManual: s.keyboardLayoutManual,
        biomeProbabilities: s.biomeProbabilities,
      }),
      merge: (persisted, current) => {
        const saved = persisted as
          | {
              bindings?: unknown
              keyboardLayout?: unknown
              keyboardLayoutManual?: unknown
              biomeProbabilities?: unknown
            }
          | undefined
        const savedLayout = saved?.keyboardLayout
        const validLayout = savedLayout === 'azerty' || savedLayout === 'qwerty'
        // Previous versions saved a layout without its source. Preserve those preferences.
        const keyboardLayoutManual = validLayout && saved?.keyboardLayoutManual !== false
        const keyboardLayout = keyboardLayoutManual ? savedLayout : current.keyboardLayout
        return {
          ...current,
          bindings: normalizeBindings(saved?.bindings),
          keyboardLayout,
          keyboardLayoutManual,
          layout: KEYBOARD_LAYOUT_MAPS[keyboardLayout],
          biomeProbabilities: normalizeProbabilities(saved?.biomeProbabilities),
        }
      },
    },
  ),
)
