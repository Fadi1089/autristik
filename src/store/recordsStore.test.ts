import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { useRecordsStore as Records } from './recordsStore'
import type { useGameStore as Game } from './gameStore'

const saved = new Map<string, string>()
let records: typeof Records
let game: typeof Game
let normalize: typeof import('./recordsStore').normalizeRecords

beforeAll(async () => {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  })
  vi.stubGlobal('window', { location: { search: '?seed=42' } })
  const module = await import('./recordsStore')
  records = module.useRecordsStore
  normalize = module.normalizeRecords
  game = (await import('./gameStore')).useGameStore
})
beforeEach(() => {
  records.setState({ records: {} })
  game.getState().restart(42, 'easy', 'classic', 'standard')
})
afterAll(() => vi.unstubAllGlobals())

describe('persistent scores by format and tile set', () => {
  it('keeps four independent fractional records and never lowers an existing best', async () => {
    const record = records.getState().recordScore
    record('classic', 'standard', 22.5)
    record('superblock', 'standard', 100)
    record('classic', 'time-attack', 50)
    record('superblock', 'time-attack', 200)
    record('classic', 'standard', 10)
    record('classic', 'standard', NaN)
    record('classic', 'standard', Infinity)
    record('classic', 'standard', -1)
    expect(records.getState().records).toEqual({
      'standard:classic': 22.5,
      'standard:superblock': 100,
      'time-attack:classic': 50,
      'time-attack:superblock': 200,
    })
    expect(JSON.parse(saved.get('autristik:records')!).state.records['standard:classic']).toBe(22.5)
    await records.persist.rehydrate()
    expect(records.getState().records['time-attack:superblock']).toBe(200)
  })

  it('validates restored records and retains zero as a legitimate first score', () => {
    expect(normalize(null)).toEqual({})
    expect(
      normalize({
        'standard:classic': 0,
        'standard:superblock': '99',
        'time-attack:classic': -1,
        'time-attack:superblock': NaN,
        'other:classic': 999,
      }),
    ).toEqual({ 'standard:classic': 0 })
  })

  it('saves improvements live and snapshots the previous best on every new game', () => {
    records.getState().recordScore('classic', 'standard', 80)
    game.getState().restart(42, 'easy', 'classic', 'standard')
    expect(game.getState().bestAtStart).toBe(80)
    game.setState({ score: 100 })
    expect(records.getState().records['standard:classic']).toBe(100)
    expect(game.getState().bestAtStart).toBe(80)
    game.getState().restart(42)
    expect(game.getState().bestAtStart).toBe(100)
    game.getState().restart(42, 'easy', 'superblock', 'time-attack')
    expect(game.getState().bestAtStart).toBeNull()
    game.setState({ score: 120 })
    expect(records.getState().records['time-attack:superblock']).toBe(120)
    expect(records.getState().records['standard:classic']).toBe(100)
  })

  it('reads the chosen mode record on first Play and records a completed zero-point run', () => {
    records.getState().recordScore('superblock', 'time-attack', 17.5)
    game.setState({ started: false, menuOpen: true })
    game.getState().setNextMode('superblock')
    game.getState().setNextVariant('time-attack')
    game.getState().closeMenu()
    expect(game.getState().bestAtStart).toBe(17.5)
    game.getState().restart(42, 'easy', 'classic', 'standard')
    game.setState({ current: null, falling: null, remaining: 0 })
    expect(records.getState().records['standard:classic']).toBe(0)
  })
})
