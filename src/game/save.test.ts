import { describe, expect, it } from 'vitest'
import {
  createGame,
  currentAnchors,
  isStuck,
  placeCurrent,
  skipCurrent,
  upcomingTiles,
} from './game'
import type { GameState } from './game'
import { pieceCount } from './board'
import { fromSave, parseSave, saveText, toSave } from './save'

/** Places the piece in hand wherever it first fits, or skips it if it fits nowhere. */
function advance(game: GameState): GameState {
  if (isStuck(game)) return skipCurrent(game)
  for (const rotation of [0, 1, 2, 3] as const) {
    const at = currentAnchors(game, rotation)[0]
    if (at) return placeCurrent({ ...game, rotation }, at)
  }
  throw new Error('expected somewhere to place the piece')
}

function played(seed: number, moves: number): GameState {
  let game = createGame(seed)
  for (let i = 0; i < moves; i++) game = advance(game)
  return game
}

function load(text: string): GameState {
  const result = parseSave(text)
  if (!result.ok) throw new Error(result.error)
  return result.game
}

describe('saving and loading', () => {
  it('brings back the board, piece in hand, rotation, score and odds', () => {
    const game = { ...played(5, 12), rotation: 3 as const }
    const loaded = load(saveText(game))
    expect(loaded.board).toEqual(game.board)
    expect(loaded.current).toEqual(game.current)
    expect(loaded.rotation).toBe(3)
    expect(loaded.score).toBe(game.score)
    expect(loaded.seed).toBe(game.seed)
    expect(loaded.bonus).toEqual(game.bonus)
    expect(loaded.biomeProbabilities).toEqual(game.biomeProbabilities ?? loaded.biomeProbabilities)
    expect(loaded.lastPlacement).toBeNull()
  })

  it('carries on exactly as the game would have', () => {
    const game = played(9, 10)
    const loaded = load(saveText(game))
    expect(upcomingTiles(loaded)).toEqual(upcomingTiles(game))
    let a = game
    let b = loaded
    for (let i = 0; i < 10; i++) {
      a = advance(a)
      b = advance(b)
    }
    expect(b.board).toEqual(a.board)
    expect(b.score).toBe(a.score)
    expect(b.bonus).toEqual(a.bonus)
  })

  it('keeps a note, and survives a second round trip unchanged', () => {
    const text = saveText(played(3, 4), 'four moves in')
    const result = parseSave(text)
    expect(result.ok && result.note).toBe('four moves in')
    expect(result.ok && saveText(result.game, 'four moves in')).toBe(text)
  })
})

describe('rejecting broken saves', () => {
  const good = () => JSON.parse(saveText(played(2, 3))) as Record<string, unknown>
  const error = (data: unknown) => {
    const result = fromSave(data)
    return result.ok ? null : result.error
  }

  it('refuses text that is not JSON, or JSON that is not a save', () => {
    expect(parseSave('{ nope')).toEqual({ ok: false, error: "the file isn't valid JSON" })
    expect(error({ hello: 'world' })).toBe('this is not a TrisTik save')
    expect(error({ ...good(), version: 2 })).toMatch(/version 2/)
  })

  it('refuses bad numbers', () => {
    expect(error({ ...good(), score: -1 })).toMatch(/score/)
    expect(error({ ...good(), seed: 1.5 })).toMatch(/seed/)
    expect(error({ ...good(), rotation: 4 })).toMatch(/rotation/)
  })

  it('refuses a broken piece in hand', () => {
    expect(error({ ...good(), current: { shape: 'X', terrains: [] } })).toMatch(/shape/)
    expect(error({ ...good(), current: { shape: 'O', terrains: ['red'] } })).toMatch(/four/)
    const purple = { shape: 'O', terrains: ['red', 'red', 'red', 'purple'] }
    expect(error({ ...good(), current: purple })).toMatch(/purple/)
  })

  it('refuses a broken board', () => {
    const board = good().board as { q: number; r: number; terrain: string; piece: number }[]
    expect(error({ ...good(), board: [] })).toMatch(/at least one piece/)
    expect(error({ ...good(), board: [...board, { ...board[0]! }] })).toMatch(/same cell/)
    expect(error({ ...good(), board: board.slice(1) })).toMatch(/3 squares instead of 4/)
    const apart = board.map((s, i) => (i === 0 ? { ...s, q: s.q + 40 } : s))
    expect(error({ ...good(), board: apart })).toMatch(/don't join up/)
  })

  it('refuses odds that ask for more biomes than they allow', () => {
    const biomeProbabilities = {
      biomeCounts: { 1: 0, 2: 0, 3: 100, 4: 0 },
      biomeWeights: { black: 0, red: 50, green: 50, yellow: 0, blue: 0 },
    }
    expect(error({ ...good(), biomeProbabilities })).toMatch(/odds/)
  })

  it('accepts a save without odds, using the default ones', () => {
    const data = good()
    delete data.biomeProbabilities
    expect(fromSave(data).ok).toBe(true)
  })

  it('keeps old saves readable without inventing past objectives', () => {
    const data = good()
    delete data.bonus
    const result = fromSave(data)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    expect(result.game.bonus).toBeUndefined()
    expect(toSave(result.game).bonus).toBeUndefined()
    expect(advance(result.game).bonus?.placements).toBe(4)
  })

  it('keeps the bonus history, and reads bonus progress saved before it was kept', () => {
    const game = played(3, 25)
    expect(game.bonus?.history).toHaveLength(1)
    expect(load(saveText(game)).bonus).toEqual(game.bonus)
    const data = toSave(game) as unknown as { bonus: Record<string, unknown> }
    const bonus: Record<string, unknown> = { ...data.bonus, objective: null, placements: 21 }
    bonus.completed = 0
    delete bonus.history
    const result = fromSave({ ...data, bonus })
    expect(result.ok && result.game.bonus?.history).toEqual([])
  })

  it('rejects a bonus history out of order or with too many completions', () => {
    const past = { biome: 'green', target: 7, issuedAt: 10, completed: false }
    const bonus = { placements: 25, completed: 0, seed: 42, objective: { ...past, issuedAt: 20 } }
    const ok = fromSave({ ...good(), bonus: { ...bonus, history: [past] } })
    expect(ok.ok).toBe(true)
    expect(error({ ...good(), bonus: { ...bonus, history: [past, past] } })).toMatch(/order/)
    expect(error({ ...good(), bonus: { ...bonus, history: { 0: past } } })).toMatch(/list/)
    expect(
      error({ ...good(), bonus: { ...bonus, history: [{ ...past, completed: true }] } }),
    ).toMatch(/completed/)
  })

  it('rejects invalid bonus counters, random state, target, biome, and deadline', () => {
    const bonus = {
      placements: 10,
      completed: 0,
      seed: 42,
      objective: {
        biome: 'green',
        target: 7,
        issuedAt: 10,
        completed: false,
      },
    }
    expect(error({ ...good(), bonus: { ...bonus, placements: -1 } })).toMatch(/bonus/)
    expect(error({ ...good(), bonus: { ...bonus, completed: 2 } })).toMatch(/bonus/)
    expect(error({ ...good(), bonus: { ...bonus, seed: -1 } })).toMatch(/bonus/)
    for (const change of [
      { target: 6 },
      { target: 14 },
      { target: 7.5 },
      { biome: 'purple' },
      { issuedAt: 9 },
      { issuedAt: 20 },
      { completed: true },
    ])
      expect(
        error({ ...good(), bonus: { ...bonus, objective: { ...bonus.objective, ...change } } }),
      ).toMatch(/bonus/)
  })

  it('saves a fresh game with the starting piece, its single tiles and its base point', () => {
    const game = createGame(1)
    const save = toSave(game)
    // The tetromino's four squares, and one for each single tile.
    expect(save.board).toHaveLength(4 + pieceCount(game.board) - 1)
    expect(save.score).toBe(1)
  })

  it('loads a fresh game back, single tiles and all', () => {
    expect(fromSave(toSave(createGame(1))).ok).toBe(true)
  })
})
