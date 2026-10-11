import { describe, expect, it } from 'vitest'
import { coordKey } from './coords'
import {
  createGame,
  currentQuadrants,
  endReason,
  isGameOver,
  placeCurrent,
  previewPlacement,
  rotateCurrent,
} from './game'
import { LEVEL_UP_TILES, levelGoal } from './levels'
import { evaluatePlacement, placementCandidates } from './matching'
import { withTile } from './board'
import type { Quadrants } from './tiles'
import type { GameState } from './game'

describe('game flow', () => {
  it('is deterministic for a given seed', () => {
    expect(createGame(42)).toEqual(createGame(42))
  })

  it('placing a tile consumes it, scores it and draws the next one', () => {
    const game = createGame(7, 5)
    const target = placementCandidates(game.board)[0]
    if (!target) throw new Error('expected a candidate square')

    const preview = previewPlacement(game, target)
    const next = placeCurrent(game, target)

    expect(preview).not.toBeNull()
    expect(next.board[coordKey(target)]?.quadrants).toEqual(currentQuadrants(game))
    expect(next.score).toBe(game.score + (preview?.points ?? 0))
    expect(next.remaining).toBe(game.remaining - 1 + (preview?.bonusTiles ?? 0))
  })

  it('ignores invalid placements', () => {
    const game = createGame(1)
    expect(placeCurrent(game, { q: 0, r: 0 })).toBe(game) // occupied
    expect(placeCurrent(game, { q: 9, r: 9 })).toBe(game) // detached
  })

  it('ends when the stack runs out', () => {
    let game = createGame(3, 3)
    for (let i = 0; i < 100 && !isGameOver(game); i++) {
      const target = placementCandidates(game.board)[0]
      if (!target) break
      game = placeCurrent(game, target)
    }
    expect(isGameOver(game)).toBe(true)
    expect(game.remaining).toBe(0)
  })
})

describe('starting board', () => {
  it('is harmonious: every side touching the centre matches', () => {
    for (const seed of [1, 2, 3, 99, 12345]) {
      const { board } = createGame(seed)
      const centre = board[coordKey({ q: 0, r: 0 })]
      if (!centre) throw new Error('missing centre tile')
      const ring = Object.fromEntries(
        Object.entries(board).filter(([key]) => key !== coordKey(centre.coord)),
      )
      const result = evaluatePlacement(ring, centre.coord, centre.quadrants)
      expect(result).toMatchObject({ neighbours: 4, perfect: true })
    }
  })
})

describe('score-based levels', () => {
  it('starts on level 1 with the first goal and no countdown', () => {
    const game = createGame(5)
    expect(game).toMatchObject({ level: 1, levelScore: 0 })
    expect(game).not.toHaveProperty('timeLeft')
  })

  it('asks for more points as levels go up', () => {
    for (let level = 1; level < 20; level++) {
      expect(levelGoal(level + 1)).toBeGreaterThan(levelGoal(level))
    }
  })

  it('ends and refuses placements only once the tile supply is empty', () => {
    expect(endReason(createGame(5))).toBeNull()
    const out = createGame(5, 0)
    expect(endReason(out)).toBe('tiles')
    const target = placementCandidates(out.board)[0]
    if (!target) throw new Error('expected a candidate square')
    expect(placeCurrent(out, target)).toBe(out)
  })

  it('moves to the next level when a placement reaches the goal', () => {
    const game = { ...createGame(7), levelScore: levelGoal(1) - 1 }
    const target = placementCandidates(game.board).find(
      (c) => (previewPlacement(game, c)?.points ?? 0) > 0,
    )
    if (!target) throw new Error('expected a scoring square')
    const preview = previewPlacement(game, target)

    const next = placeCurrent(game, target)
    expect(next.level).toBe(2)
    expect(next.levelScore).toBe(0)
    expect(next.remaining).toBe(game.remaining - 1 + (preview?.bonusTiles ?? 0) + LEVEL_UP_TILES)
    expect(next.lastPlacement?.leveledUp).toBe(true)
  })

  it('adds points to the level total without leveling up below the goal', () => {
    const game = createGame(7)
    const target = placementCandidates(game.board).find(
      (c) => (previewPlacement(game, c)?.points ?? 0) > 0,
    )
    if (!target) throw new Error('expected a scoring square')
    const points = previewPlacement(game, target)?.points ?? 0
    const next = placeCurrent(game, target)
    expect(next).toMatchObject({ level: 1, levelScore: points })
    expect(next.lastPlacement?.leveledUp).toBe(false)
  })
})

describe('combo game flow', () => {
  const grass: Quadrants = ['grass', 'grass', 'grass', 'grass']
  const starting = () => ({
    ...createGame(42),
    board: withTile({}, { coord: { q: 0, r: 0 }, quadrants: grass }),
    current: grass,
  })

  it('multiplies only the new tile and commits exactly the previewed gain', () => {
    const game = { ...starting(), score: 100, combo: 2 }
    const target = { q: 1, r: 0 }
    const preview = previewPlacement(game, target)!
    expect(preview).toMatchObject({ basePoints: 10, multiplier: 1.75, points: 17.5, combo: 3 })
    expect(game.combo).toBe(2)
    const next = placeCurrent(game, target)
    expect(next).toMatchObject({
      score: 117.5,
      combo: 3,
      levelScore: 17.5,
      remaining: 29,
    })
    expect(next.lastPlacement).toMatchObject(preview)
  })

  it('recalculates the combo preview on rotation without advancing the streak', () => {
    const game = {
      ...starting(),
      combo: 2,
      current: ['forest', 'grass', 'grass', 'forest'] as Quadrants,
    }
    const target = { q: 1, r: 0 }
    expect(previewPlacement(game, target)).toMatchObject({ multiplier: 1, combo: 0, points: 0 })
    const rotated = rotateCurrent(game, 2)
    const preview = previewPlacement(rotated, target)!
    expect(rotated.combo).toBe(2)
    expect(preview).toMatchObject({ multiplier: 1.75, combo: 3, points: 17.5 })
    expect(placeCurrent(rotated, target).lastPlacement).toMatchObject(preview)
  })

  it('counts the multiplied gain towards the new level goal', () => {
    const game = { ...starting(), combo: 7, levelScore: levelGoal(1) - 25 }
    const next = placeCurrent(game, { q: 1, r: 0 })
    expect(next.lastPlacement).toMatchObject({
      basePoints: 10,
      points: 30,
      multiplier: 3,
      leveledUp: true,
    })
    expect(next).toMatchObject({
      level: 2,
      levelScore: 0,
      combo: 8,
      remaining: 35,
    })
  })

  it('keeps a successful streak through a level-up and restarts it after a mismatch', () => {
    let game: GameState = starting()
    for (let q = 1; q <= 8; q++) game = placeCurrent({ ...game, current: grass }, { q, r: 0 })
    expect(game).toMatchObject({ score: 170, combo: 8, level: 2, levelScore: 82.5 })
    const broken = placeCurrent(
      { ...game, current: ['water', 'water', 'water', 'water'] },
      { q: 9, r: 0 },
    )
    expect(broken).toMatchObject({ combo: 0, score: 170 })
    expect(broken.lastPlacement).toMatchObject({ multiplier: 1, points: 0 })
    const resumed = placeCurrent(
      { ...broken, current: ['water', 'water', 'water', 'water'] },
      { q: 10, r: 0 },
    )
    expect(resumed.lastPlacement).toMatchObject({ multiplier: 1.25, points: 12.5, combo: 1 })
  })

  it('leaves the combo unchanged on invalid placement, empty supply and rotation', () => {
    const game = { ...starting(), combo: 5 }
    expect(placeCurrent(game, { q: 0, r: 0 })).toBe(game)
    expect(placeCurrent(game, { q: 20, r: 0 })).toBe(game)
    expect(rotateCurrent(game, 1).combo).toBe(5)
    const out = { ...game, current: null, remaining: 0 }
    expect(placeCurrent(out, { q: 1, r: 0 })).toBe(out)
    expect(out.combo).toBe(5)
    expect(createGame(42).combo).toBe(0)
  })
})
