import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_BINDINGS, normalizeBindings, withBinding, withoutBinding } from '../input/bindings'
import type { Action, Bindings, KeySlot } from '../input/bindings'
import { KEYBOARD_LAYOUT_MAPS } from '../input/keyLabels'
import type { KeyboardLayout, LayoutMap } from '../input/keyLabels'
import { BIOMES, DEFAULT_BIOME_PROBABILITIES } from '../game/tiles'
import type { Biome, BiomeCountWeights, BiomeProbabilities } from '../game/tiles'

interface SettingsStore {
  readonly bindings: Bindings
  readonly keyboardLayout: KeyboardLayout
  /** Printed key labels for the player's keyboard layout. */
  readonly layout: LayoutMap | null
  readonly biomeProbabilities: BiomeProbabilities
  /** The key slot waiting for a key press in the settings panel. Game keys are off meanwhile. */
  readonly capturing: { action: Action; slot: KeySlot } | null

  bind(action: Action, slot: KeySlot, code: string): void
  unbind(action: Action, slot: KeySlot): void
  resetBindings(): void
  resetBiomeProbabilities(): void
  setBiomeCountWeight(count: 1 | 2 | 3 | 4, value: number): void
  setBiomeWeight(biome: Biome, value: number): void
  setKeyboardLayout(keyboardLayout: KeyboardLayout): void
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

  if (Object.values(biomeCounts).every((weight) => weight === 0))
    return { biomeCounts: DEFAULT_BIOME_PROBABILITIES.biomeCounts, biomeWeights }
  if (Object.values(biomeWeights).every((weight) => weight === 0))
    return { biomeCounts, biomeWeights: DEFAULT_BIOME_PROBABILITIES.biomeWeights }
  return { biomeCounts, biomeWeights }
}

function withBiomeCountWeight(
  weights: BiomeCountWeights,
  count: 1 | 2 | 3 | 4,
  value: number,
): BiomeCountWeights {
  const next: BiomeCountWeights = {
    ...weights,
    [count]: validWeight(value, weights[count]),
  }
  return Object.values(next).some((weight) => weight > 0) ? next : weights
}

function withBiomeWeight(
  weights: Readonly<Record<Biome, number>>,
  biome: Biome,
  value: number,
): Readonly<Record<Biome, number>> {
  const next = { ...weights, [biome]: validWeight(value, weights[biome]) }
  return Object.values(next).some((weight) => weight > 0) ? next : weights
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      bindings: DEFAULT_BINDINGS,
      keyboardLayout: 'qwerty',
      layout: KEYBOARD_LAYOUT_MAPS.qwerty,
      biomeProbabilities: DEFAULT_BIOME_PROBABILITIES,
      capturing: null,

      bind: (action, slot, code) =>
        set((s) => ({ bindings: withBinding(s.bindings, action, slot, code), capturing: null })),
      unbind: (action, slot) =>
        set((s) => ({ bindings: withoutBinding(s.bindings, action, slot), capturing: null })),
      resetBindings: () => set({ bindings: DEFAULT_BINDINGS, capturing: null }),
      resetBiomeProbabilities: () => set({ biomeProbabilities: DEFAULT_BIOME_PROBABILITIES }),
      setBiomeCountWeight: (count, value) =>
        set((s) => ({
          biomeProbabilities: {
            ...s.biomeProbabilities,
            biomeCounts: withBiomeCountWeight(s.biomeProbabilities.biomeCounts, count, value),
          },
        })),
      setBiomeWeight: (biome, value) =>
        set((s) => ({
          biomeProbabilities: {
            ...s.biomeProbabilities,
            biomeWeights: withBiomeWeight(s.biomeProbabilities.biomeWeights, biome, value),
          },
        })),
      setKeyboardLayout: (keyboardLayout) =>
        set({ keyboardLayout, layout: KEYBOARD_LAYOUT_MAPS[keyboardLayout] }),
      setCapturing: (capturing) => set({ capturing }),
    }),
    {
      name: 'autristik:settings',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        bindings: s.bindings,
        keyboardLayout: s.keyboardLayout,
        biomeProbabilities: s.biomeProbabilities,
      }),
      merge: (persisted, current) => {
        const saved = persisted as
          { bindings?: unknown; keyboardLayout?: unknown; biomeProbabilities?: unknown } | undefined
        const keyboardLayout: KeyboardLayout =
          saved?.keyboardLayout === 'azerty' ? 'azerty' : 'qwerty'
        return {
          ...current,
          bindings: normalizeBindings(saved?.bindings),
          keyboardLayout,
          layout: KEYBOARD_LAYOUT_MAPS[keyboardLayout],
          biomeProbabilities: normalizeProbabilities(saved?.biomeProbabilities),
        }
      },
    },
  ),
)
