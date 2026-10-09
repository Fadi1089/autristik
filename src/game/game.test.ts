import { describe, expect, it } from 'vitest'
import { coordKey } from './coords'
import {
  createGame,
  currentQuadrants,
  endReason,
  isGameOver,
  placeCurrent,
  previewPlacement,
  tickGame,
} from './game'
import { LEVEL_UP_TILES, levelGoal, levelTimeLimit, MIN_TIME_LIMIT } from './levels'
import { evaluatePlacement, placementCandidates } from './matching'

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

describe('timed levels', () => {
  it('starts on level 1 with the first goal and a full countdown', () => {
    const game = createGame(5)
    expect(game).toMatchObject({ level: 1, levelScore: 0, timeLeft: levelTimeLimit(1) })
  })

  it('asks for more points in less time as levels go up, down to a floor', () => {
    for (let level = 1; level < 20; level++) {
      expect(levelGoal(level + 1)).toBeGreaterThan(levelGoal(level))
      expect(levelTimeLimit(level + 1)).toBeLessThanOrEqual(levelTimeLimit(level))
    }
    expect(levelTimeLimit(100)).toBe(MIN_TIME_LIMIT)
  })

  it('counts down and ends the game when time runs out', () => {
    const game = createGame(5)
    const later = tickGame(game, 10)
    expect(later.timeLeft).toBe(game.timeLeft - 10)
    expect(isGameOver(later)).toBe(false)

    const out = tickGame(later, 999)
    expect(out.timeLeft).toBe(0)
    expect(endReason(out)).toBe('time')
    expect(tickGame(out, 5)).toBe(out)
  })

  it('refuses placements once time is up', () => {
    const out = tickGame(createGame(5), 999)
    const target = placementCandidates(out.board)[0]
    if (!target) throw new Error('expected a candidate square')
    expect(placeCurrent(out, target)).toBe(out)
  })

  it('moves to the next level when a placement reaches the goal', () => {
    const game = { ...tickGame(createGame(7), 30), levelScore: levelGoal(1) - 1 }
    const target = placementCandidates(game.board).find(
      (c) => (previewPlacement(game, c)?.points ?? 0) > 0,
    )
    if (!target) throw new Error('expected a scoring square')
    const preview = previewPlacement(game, target)

    const next = placeCurrent(game, target)
    expect(next.level).toBe(2)
    expect(next.levelScore).toBe(0)
    expect(next.timeLeft).toBe(levelTimeLimit(2))
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
    expect(next).toMatchObject({ level: 1, levelScore: points, timeLeft: game.timeLeft })
    expect(next.lastPlacement?.leveledUp).toBe(false)
  })
})
