import { describe, expect, it } from 'vitest'
import { withTile } from './board'
import { createGame, placeCurrent, previewPlacement } from './game'
import { BEDROCK_TILE, RAINBOW_TILE, randomTile } from './tiles'
import type { Rng } from './random'

const grass = ['grass', 'grass', 'grass', 'grass'] as const
const base = () => ({
  ...createGame(42),
  currentMultiplier: 1 as const,
  board: withTile({}, { coord: { q: 0, r: 0 }, quadrants: grass }),
})

describe('neutral bedrock combos', () => {
  it('does not advance or break a streak when bedrock is placed', () => {
    const game = { ...base(), current: BEDROCK_TILE, combo: 7 }
    expect(previewPlacement(game, { q: 1, r: 0 })).toMatchObject({
      points: 0,
      bonusTiles: 0,
      combo: 7,
      multiplier: 2.75,
    })
    expect(placeCurrent(game, { q: 1, r: 0 }).combo).toBe(7)
  })
  it('keeps bedrock contacts neutral while normal terrain successes and mistakes still affect the streak', () => {
    const bedrock = withTile({}, { coord: { q: 0, r: 0 }, quadrants: BEDROCK_TILE })
    const game = { ...base(), board: bedrock, current: grass, combo: 4 }
    expect(previewPlacement(game, { q: 1, r: 0 })).toMatchObject({ points: 0, combo: 4 })
    const twoSides = withTile(bedrock, { coord: { q: 1, r: 1 }, quadrants: grass })
    expect(previewPlacement({ ...game, board: twoSides }, { q: 1, r: 0 })).toMatchObject({
      combo: 5,
      points: 22.5,
      harmonious: false,
      bonusTiles: 0,
    })
    expect(
      previewPlacement(
        { ...game, board: twoSides, current: ['water', 'water', 'water', 'water'] },
        { q: 1, r: 0 },
      ),
    ).toMatchObject({ combo: 0, points: 0 })
  })
})

describe('enhanced gold jokers', () => {
  it.each([1, 2, 3, 5] as const)(
    'scores gold ×%s together with the combo and retains its bonus on the board',
    (currentMultiplier) => {
      const game = { ...base(), current: RAINBOW_TILE, currentMultiplier, combo: 3 }
      const preview = previewPlacement(game, { q: 1, r: 0 })!
      expect(preview).toMatchObject({
        basePoints: 10,
        multiplier: 2,
        tileMultiplier: currentMultiplier,
        points: 20 * currentMultiplier,
        combo: 4,
      })
      const after = placeCurrent(game, { q: 1, r: 0 })
      expect(after.board['1,0']?.multiplier).toBe(currentMultiplier)
      expect(after.lastPlacement).toMatchObject(preview)
    },
  )
  it.each([
    [0.02, 2],
    [0.08, 3],
    [0.095, 5],
    [0.5, 1],
  ] as const)('can draw a gold joker with multiplier %s → ×%s', (bonusRoll, multiplier) => {
    let count = 0
    const rng: Rng = {
      state: 0,
      next: () => (count++ === 0 ? 0.01 : bonusRoll),
      weighted: () => {
        throw new Error('Gold must not draw ordinary quadrants')
      },
    }
    expect(randomTile(rng)).toEqual({ quadrants: RAINBOW_TILE, multiplier })
  })
})
