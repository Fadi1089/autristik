import { describe, expect, it } from 'vitest'
import {
  createGame,
  currentQuadrants,
  nextTilePreview,
  placeCurrent,
  rotateCurrent,
  swapCurrent,
} from './game'
import { placementCandidates } from './matching'
import { createRng } from './random'
import { randomTile, tileKind } from './tiles'

describe('unlimited tile exchange', () => {
  it.each(['classic', 'superblock'] as const)(
    'inverts the same pair without rerolls, rotation loss or resource cost in %s',
    (mode) => {
      const game = rotateCurrent(createGame(42, 30, mode), 1)
      const next = nextTilePreview(game)!
      let swapped = swapCurrent(game)
      const seedAfterDraw = swapped.seed
      expect(swapped).toMatchObject({
        current: next.quadrants,
        currentMultiplier: next.multiplier,
        rotation: 0,
        queued: { quadrants: game.current, multiplier: game.currentMultiplier, rotation: 1 },
      })
      expect(swapped.board).toBe(game.board)
      for (let i = 0; i < 100; i++) {
        swapped = swapCurrent(swapped)
        expect(swapped.seed).toBe(seedAfterDraw)
        expect(swapped).toMatchObject({
          mode,
          remaining: 30,
          placements: 0,
          score: 0,
          combo: 0,
          level: 1,
        })
        const original = i % 2 === 0
        expect(swapped.current).toEqual(original ? game.current : next.quadrants)
        expect(swapped.rotation).toBe(original ? 1 : 0)
      }
    },
  )

  it('preserves each tile rotation and promotes the held tile before drawing a third', () => {
    const first = rotateCurrent(createGame(99), 1)
    const second = rotateCurrent(swapCurrent(first), 3)
    const returned = swapCurrent(second)
    expect(returned.rotation).toBe(1)
    expect(nextTilePreview(returned)?.rotation).toBe(3)
    const again = swapCurrent(returned)
    expect(again.rotation).toBe(3)
    const expectedThird = randomTile(createRng(again.seed), again.placements + 1, again.mode)
    const target = placementCandidates(again.board)[0]!
    const placed = placeCurrent(again, target)
    expect(placed.board[`${target.q},${target.r}`]?.quadrants).toEqual(currentQuadrants(again))
    expect(placed).toMatchObject({
      current: first.current,
      currentMultiplier: first.currentMultiplier,
      rotation: 1,
      queued: null,
    })
    expect(placed.seed).toBe(again.seed)
    expect(nextTilePreview(placed)).toEqual(expectedThird)
  })

  it('cannot exchange without a real next tile or after game over', () => {
    const last = createGame(42, 1)
    expect(swapCurrent(last)).toBe(last)
    const empty = createGame(42, 0)
    expect(swapCurrent(empty)).toBe(empty)
  })

  it('does not make a void available before the placement threshold', () => {
    const seed = Array.from({ length: 10000 }, (_, seed) => seed).find((seed) => {
      const roll = createRng(seed).next()
      return roll >= 0.05 && roll < 0.06
    })!
    const early = { ...createGame(42), seed, placements: 9 }
    expect(tileKind(swapCurrent(early).current!)).not.toBe('void')
    const ready = { ...early, placements: 10 }
    expect(tileKind(swapCurrent(ready).current!)).toBe('void')
  })
})
