import { describe, expect, it } from 'vitest'
import { withTile } from './board'
import type { Board } from './board'
import { evaluatePlacement } from './matching'
import { comboMultiplier, scoreWithCombo } from './scoring'
import type { Coord } from './coords'
import type { Quadrants } from './tiles'

const grass: Quadrants = ['grass', 'grass', 'grass', 'grass']
const water: Quadrants = ['water', 'water', 'water', 'water']

function boardOf(...tiles: [Coord, Quadrants][]): Board {
  return tiles.reduce<Board>(
    (board, [coord, quadrants]) => withTile(board, { coord, quadrants }),
    {},
  )
}

describe('placement combos', () => {
  it('starts at one and advances in quarter steps up to three', () => {
    expect(comboMultiplier(0)).toBe(1)
    const evaluation = evaluatePlacement(boardOf([{ q: 0, r: -1 }, grass]), { q: 0, r: 0 }, grass)
    let combo = 0
    const expected = [1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3, 3]
    for (const multiplier of expected) {
      const score = scoreWithCombo(evaluation, combo)
      expect(score.multiplier).toBe(multiplier)
      expect(score.points).toBe(10 * multiplier)
      expect(score.combo).toBe(combo + 1)
      combo = score.combo
    }
  })

  it('resets on a partial side, even when another side is fully green', () => {
    const board = boardOf([{ q: 0, r: -1 }, grass], [{ q: 1, r: 0 }, water])
    const evaluation = evaluatePlacement(board, { q: 0, r: 0 }, [
      'grass',
      'grass',
      'water',
      'grass',
    ])
    expect(evaluation.matched).toHaveLength(1)
    expect(evaluation.mismatched).toHaveLength(1)
    expect(scoreWithCombo(evaluation, 8)).toMatchObject({
      combo: 0,
      multiplier: 1,
      basePoints: 15,
      points: 15,
    })
  })

  it('resets when there is no fully matching side and keeps ordinary matching points', () => {
    const board = boardOf([{ q: 0, r: -1 }, grass])
    const evaluation = evaluatePlacement(board, { q: 0, r: 0 }, [
      'grass',
      'water',
      'water',
      'water',
    ])
    expect(scoreWithCombo(evaluation, 4)).toMatchObject({
      combo: 0,
      multiplier: 1,
      points: 5,
      bonusTiles: 0,
    })
  })

  it('multiplies a perfect tile bonus but keeps the tile reward unchanged', () => {
    const board = boardOf(
      [{ q: 0, r: -1 }, grass],
      [{ q: 1, r: 0 }, grass],
      [{ q: 0, r: 1 }, grass],
      [{ q: -1, r: 0 }, grass],
    )
    const evaluation = evaluatePlacement(board, { q: 0, r: 0 }, grass)
    expect(scoreWithCombo(evaluation, 7)).toMatchObject({
      basePoints: 70,
      multiplier: 3,
      points: 210,
      bonusTiles: 2,
    })
  })

  it('keeps the harmonious tile reward unchanged too', () => {
    const board = boardOf([{ q: 0, r: -1 }, grass], [{ q: 1, r: 0 }, grass])
    expect(scoreWithCombo(evaluatePlacement(board, { q: 0, r: 0 }, grass), 7)).toMatchObject({
      points: 60,
      bonusTiles: 1,
    })
  })
})
