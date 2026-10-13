import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { GAME_MODES } from '../game/modes'
import type { GameMode } from '../game/modes'
import { GAME_VARIANTS } from '../game/variants'
import type { GameVariant } from '../game/variants'

export type RecordKey = `${GameVariant}:${GameMode}`
export type ScoreRecords = Readonly<Partial<Record<RecordKey, number>>>

export function recordKey(mode: GameMode, variant: GameVariant): RecordKey {
  return `${variant}:${mode}`
}

/** Invalid saved entries never become records or leak between modes. */
export function normalizeRecords(value: unknown): ScoreRecords {
  if (!value || typeof value !== 'object') return {}
  const entries = value as Record<string, unknown>
  const records: Partial<Record<RecordKey, number>> = {}
  for (const variant of GAME_VARIANTS)
    for (const mode of GAME_MODES) {
      const key = recordKey(mode, variant)
      const score = entries[key]
      if (typeof score === 'number' && Number.isFinite(score) && score >= 0) records[key] = score
    }
  return records
}

interface RecordsStore {
  readonly records: ScoreRecords
  recordScore(mode: GameMode, variant: GameVariant, score: number): void
}

// Blocked or full browser storage keeps records usable for the current session.
const storage = {
  getItem: (name: string) => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value)
    } catch {
      /* Retain the in-memory record. */
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name)
    } catch {
      /* Storage may be unavailable. */
    }
  },
}

export const useRecordsStore = create<RecordsStore>()(
  persist(
    (set) => ({
      records: {},
      recordScore: (mode, variant, score) => {
        if (!Number.isFinite(score) || score < 0) return
        set((state) => {
          const key = recordKey(mode, variant)
          const best = state.records[key]
          return best !== undefined && score <= best
            ? state
            : { records: { ...state.records, [key]: score } }
        })
      },
    }),
    {
      name: 'autristik:records',
      version: 1,
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({ records: state.records }),
      merge: (saved, current) => ({
        ...current,
        records: normalizeRecords((saved as { records?: unknown } | undefined)?.records),
      }),
    },
  ),
)

export function bestScore(mode: GameMode, variant: GameVariant): number | null {
  return useRecordsStore.getState().records[recordKey(mode, variant)] ?? null
}
