import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_BINDINGS, normalizeBindings, withBinding, withoutBinding } from '../input/bindings'
import type { Action, Bindings, KeySlot } from '../input/bindings'
import { KEYBOARD_LAYOUT_MAPS } from '../input/keyLabels'
import type { KeyboardLayout, LayoutMap } from '../input/keyLabels'
import { fallbackKeyboardLayout } from '../input/keyboardDetection'
import { isGameMode } from '../game/modes'
import type { GameMode } from '../game/modes'
import {
  BIOMES,
  DEFAULT_BIOME_PROBABILITIES,
  DEFAULT_SHAPE_WEIGHTS,
  SHAPES,
  validBiomeProbabilities,
} from '../game/tiles'
import type { Biome, BiomeProbabilities, Shape } from '../game/tiles'

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
  /** The mode last picked for a new game, offered first the next time. */
  readonly mode: GameMode
  /** Highest final score of a finished performance game, 0 before the first one. */
  readonly bestPerformance: number
  /** The key slot waiting for a key press in the settings panel. Game keys are off meanwhile. */
  readonly capturing: { action: Action; slot: KeySlot } | null

  bind(action: Action, slot: KeySlot, code: string): void
  unbind(action: Action, slot: KeySlot): void
  resetBindings(): void
  resetBiomeProbabilities(): void
  /**
   * Replaces all the odds at once, e.g. with a loaded game's; invalid odds are ignored, and odds
   * without shape weights draw every shape equally.
   */
  setBiomeProbabilities(probabilities: BiomeProbabilities): void
  setShapeWeight(shape: Shape, value: number): void
  setBiomeCountWeight(count: 1 | 2 | 3 | 4, value: number): void
  setBiomeWeight(biome: Biome, value: number): void
  setKeyboardLayout(keyboardLayout: KeyboardLayout): void
  setDetectedKeyboardLayout(keyboardLayout: KeyboardLayout): void
  setCapturing(capturing: SettingsStore['capturing']): void
  setMode(mode: GameMode): void
  /** Keeps a finished performance game's score if it beats the best so far. */
  recordPerformance(score: number): void
}

function validWeight(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : fallback
}

function normalizeProbabilities(stored: unknown): BiomeProbabilities {
  if (typeof stored !== 'object' || stored === null) return DEFAULT_BIOME_PROBABILITIES
  const saved = stored as {
    shapeWeights?: Record<string, unknown>
    biomeCounts?: Record<number, unknown>
    biomeWeights?: Record<string, unknown>
  }
  const shapeWeights = { ...DEFAULT_SHAPE_WEIGHTS }
  for (const shape of SHAPES)
    shapeWeights[shape] = validWeight(saved.shapeWeights?.[shape], shapeWeights[shape])
  const biomeCounts = { ...DEFAULT_BIOME_PROBABILITIES.biomeCounts }
  const biomeWeights = { ...DEFAULT_BIOME_PROBABILITIES.biomeWeights }
  for (const count of [1, 2, 3, 4] as const)
    biomeCounts[count] = validWeight(saved.biomeCounts?.[count], biomeCounts[count])
  for (const biome of BIOMES)
    biomeWeights[biome] = validWeight(saved.biomeWeights?.[biome], biomeWeights[biome])

  const normalized = {
    shapeWeights: Object.values(shapeWeights).every((weight) => weight === 0)
      ? DEFAULT_SHAPE_WEIGHTS
      : shapeWeights,
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
      mode: 'score',
      bestPerformance: 0,
      capturing: null,

      bind: (action, slot, code) =>
        set((s) => ({ bindings: withBinding(s.bindings, action, slot, code), capturing: null })),
      unbind: (action, slot) =>
        set((s) => ({ bindings: withoutBinding(s.bindings, action, slot), capturing: null })),
      resetBindings: () => set({ bindings: DEFAULT_BINDINGS, capturing: null }),
      resetBiomeProbabilities: () => set({ biomeProbabilities: DEFAULT_BIOME_PROBABILITIES }),
      setBiomeProbabilities: (probabilities) =>
        set((s) => ({
          // Odds from before the shape weights could be set draw every shape equally.
          biomeProbabilities: withChange(s.biomeProbabilities, {
            shapeWeights: DEFAULT_SHAPE_WEIGHTS,
            ...probabilities,
          }),
        })),
      setShapeWeight: (shape, value) =>
        set(({ biomeProbabilities: p }) => {
          const weights = p.shapeWeights ?? DEFAULT_SHAPE_WEIGHTS
          return {
            biomeProbabilities: withChange(p, {
              shapeWeights: { ...weights, [shape]: validWeight(value, weights[shape]) },
            }),
          }
        }),
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
      setMode: (mode) => set({ mode }),
      recordPerformance: (score) =>
        set((s) => (score > s.bestPerformance ? { bestPerformance: score } : s)),
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
        mode: s.mode,
        bestPerformance: s.bestPerformance,
      }),
      merge: (persisted, current) => {
        const saved = persisted as
          | {
              bindings?: unknown
              keyboardLayout?: unknown
              keyboardLayoutManual?: unknown
              biomeProbabilities?: unknown
              mode?: unknown
              bestPerformance?: unknown
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
          mode: isGameMode(saved?.mode) ? saved.mode : current.mode,
          bestPerformance:
            Number.isSafeInteger(saved?.bestPerformance) && (saved!.bestPerformance as number) > 0
              ? (saved!.bestPerformance as number)
              : 0,
        }
      },
    },
  ),
)
