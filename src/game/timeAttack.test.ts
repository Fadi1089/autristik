import { describe, expect, it } from 'vitest'
import { withTile, tileCount } from './board'
import { createFallingGame, hardDrop, tickFallingGame, changeFallDirection } from './falling'
import { currentQuadrants, endReason, nextTilePreview, placeCurrent, swapCurrent } from './game'
import { DIFFICULTIES, levelGoal } from './levels'
import { placementCandidates } from './matching'
import { Direction } from './coords'
import { tileKind } from './tiles'

const grass = ['grass', 'grass', 'grass', 'grass'] as const
const water = ['water', 'water', 'water', 'water'] as const

function readyToLevel() {
  return {
    ...createFallingGame(42, undefined, 'insane', 'classic', 'time-attack'),
    board: withTile({}, { coord: { q: 0, r: 0 }, quadrants: grass }),
    current: grass,
    currentMultiplier: 1 as const,
    falling: { q: 0, r: -1 },
    levelScore: levelGoal(1) - 1,
  }
}

describe('Time-attack tile supply and scoring', () => {
  it.each(['classic', 'superblock'] as const)(
    'limits each level to 30 tiles with the existing %s rules, previews and exchanges',
    (mode) => {
      let game = { ...createFallingGame(42, 0, 'easy', mode, 'time-attack'), level: 1000 }
      expect(game).toMatchObject({
        remaining: 30,
        timeRemaining: 45,
        placements: 0,
      })
      const first = currentQuadrants(game)
      const preview = nextTilePreview(game)!
      game = { ...game, ...swapCurrent(game) }
      expect(game.current).toEqual(preview.quadrants)
      game = { ...game, ...swapCurrent(game) }
      expect(currentQuadrants(game)).toEqual(first)
      expect(game.timeRemaining).toBe(45)
      for (let i = 0; i < 30; i++) {
        const next = nextTilePreview(game)
        if (mode === 'classic') {
          expect(tileKind(game.current!)).toBe('normal')
          expect(game.currentMultiplier).toBe(1)
        }
        const placed = placeCurrent(game, placementCandidates(game.board)[0]!)
        expect(placed.remaining).toBe(29 - i)
        expect(placed.current).toEqual(next?.quadrants ?? null)
        expect(tileCount(placed.board)).toBeGreaterThan(0)
        game = { ...game, ...placed }
      }
      expect(game.placements).toBe(30)
      expect(game.timeRemaining).toBe(45)
      expect(endReason(game)).toBe('tiles')
      expect(nextTilePreview(game)).toBeNull()
      expect(swapCurrent(game)).toBe(game)
      expect(placeCurrent(game, placementCandidates(game.board)[0]!)).toBe(game)
    },
  )

  it('adds exactly 45 seconds per level, and raises the score goal for the next level', () => {
    const game = { ...readyToLevel(), timeRemaining: 4 }
    const placed = hardDrop(game)
    expect(placed).toMatchObject({
      level: 2,
      levelScore: 0,
      timeRemaining: 49,
      remaining: 30,
    })
    expect(levelGoal(placed.level)).toBeGreaterThan(levelGoal(game.level))
    const nextLevel = hardDrop({ ...placed, current: grass, levelScore: levelGoal(2) - 1 })
    expect(nextLevel).toMatchObject({ level: 3, timeRemaining: 94 })
  })

  it('leaves the timer unchanged by a placement that does not clear a level', () => {
    const game = { ...readyToLevel(), levelScore: 0, timeRemaining: 7.25 }
    expect(hardDrop(game).timeRemaining).toBe(7.25)
    expect(placeCurrent(game, { q: 0, r: 0 })).toBe(game)
  })

  it.each(['classic', 'superblock'] as const)(
    'refills exactly to 30 on a level-up with the last tile in %s',
    (mode) => {
      const game = { ...readyToLevel(), mode, remaining: 1, timeRemaining: 4 }
      const advanced = hardDrop(game)
      expect(advanced).toMatchObject({ level: 2, remaining: 30, timeRemaining: 49 })
      expect(advanced.current).not.toBeNull()
      expect(advanced.falling).not.toBeNull()
      expect(endReason(advanced)).toBeNull()
      expect(nextTilePreview(advanced)).not.toBeNull()
    },
  )

  it('consumes one tile even on a perfect placement, ignoring supply rewards', () => {
    let board = readyToLevel().board
    for (const coord of [
      { q: 0, r: -1 },
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: -1, r: 0 },
    ])
      board = withTile(board, { coord, quadrants: grass })
    // The central hole touches all four neighbours, with enough goal headroom to avoid a level-up.
    const { '0,0': center, ...hole } = board
    expect(center).toBeDefined()
    const game = { ...readyToLevel(), board: hole, level: 10, levelScore: 0, remaining: 3 }
    const placed = placeCurrent(game, { q: 0, r: 0 })
    expect(placed.lastPlacement).toMatchObject({ perfect: true, bonusTiles: 2 })
    expect(placed.remaining).toBe(2)
    expect(placed.timeRemaining).toBe(45)
  })

  it('ends immediately on the last unsuccessful tile and stops the clock', () => {
    const game = {
      ...readyToLevel(),
      current: water,
      levelScore: 0,
      remaining: 1,
      timeRemaining: 20,
    }
    const exhausted = hardDrop(game)
    expect(exhausted).toMatchObject({
      current: null,
      falling: null,
      remaining: 0,
      timeRemaining: 20,
    })
    expect(endReason(exhausted)).toBe('tiles')
    expect(tickFallingGame(exhausted, 5)).toBe(exhausted)
  })
})

describe('Time-attack clock and fixed cadence', () => {
  it.each(DIFFICULTIES)(
    'retains a 15-second approach at every level despite %s difficulty',
    (difficulty) => {
      for (const level of [1, 10, 30, 100]) {
        const game = {
          ...createFallingGame(42, undefined, difficulty, 'classic', 'time-attack'),
          level,
        }
        const moved = tickFallingGame(game, 1.5)
        expect(moved.falling!.r).toBe(game.falling!.r + 1)
        expect(moved.timeRemaining).toBe(43.5)
        const beforeLanding = tickFallingGame(game, 14.999)
        expect(beforeLanding.board).toBe(game.board)
        expect(tickFallingGame(beforeLanding, 0.001).placements).toBe(1)
      }
    },
  )

  it('handles a level-up before the deadline, counting the remainder of a long tick at the same speed', () => {
    const game = { ...readyToLevel(), timeRemaining: 2 }
    const once = tickFallingGame(game, 3.1)
    expect(once).toMatchObject({ level: 2, placements: 1 })
    expect(once.timeRemaining).toBeCloseTo(43.9)
    expect(once.playedSeconds).toBeCloseTo(3.1)
    expect(once.falling).toEqual({ q: 0, r: -10 })
    const split = tickFallingGame(tickFallingGame(game, 1.4), 1.7)
    expect(split.board).toEqual(once.board)
    expect(split.timeRemaining).toBeCloseTo(once.timeRemaining!)
    expect(split.fallElapsed).toBeCloseTo(once.fallElapsed)
  })

  it('expires exactly at the deadline and ignores every subsequent tick and placement', () => {
    const game = { ...readyToLevel(), current: water, levelScore: 0, timeRemaining: 0.25 }
    const expired = tickFallingGame(game, 100)
    expect(expired).toMatchObject({
      timeRemaining: 0,
      playedSeconds: 0.25,
      current: null,
      falling: null,
    })
    expect(expired.board).toBe(game.board)
    expect(endReason(expired)).toBe('time')
    expect(tickFallingGame(expired, 10)).toBe(expired)
    expect(hardDrop(expired)).toBe(expired)
    expect(placeCurrent(expired, { q: 1, r: 0 })).toBe(expired)
    expect(swapCurrent(expired)).toBe(expired)
  })

  it('does not award a level-up for a gravity placement exactly at time zero', () => {
    const game = { ...readyToLevel(), timeRemaining: 1.5 }
    const expired = tickFallingGame(game, 1.5)
    expect(expired).toMatchObject({ timeRemaining: 0, level: 1, placements: 0, score: 0 })
    expect(expired.board).toBe(game.board)
  })

  it('keeps the countdown and cadence remainder through side changes and unlimited swaps', () => {
    const game = tickFallingGame(
      createFallingGame(42, undefined, 'easy', 'classic', 'time-attack'),
      3.3,
    )
    let changed = changeFallDirection(game, Direction.West)
    for (let i = 0; i < 40; i++) changed = { ...changed, ...swapCurrent(changed) }
    expect(changed.timeRemaining).toBe(game.timeRemaining)
    expect(changed.fallElapsed).toBe(game.fallElapsed)
    expect(tickFallingGame(changed, 0.2).timeRemaining).toBeCloseTo(41.5)
  })
})
