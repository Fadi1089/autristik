import { describe, expect, it } from 'vitest'
import type { PlacementScore } from '../game/score'
import { countWord, scoreLines, signedPoints } from './scoreNotes'

const score = (connections: number, surrounded: number[]): PlacementScore => ({
  connections,
  surrounded,
  points: 1 + connections + 10 * surrounded.length,
})

describe('scoreLines', () => {
  it('only has the base point for a piece that matches nothing', () => {
    expect(scoreLines(score(0, []))).toEqual([{ points: 1, reason: 'placed', gold: false }])
  })

  it('adds a line for the matching sides, counted in words', () => {
    expect(scoreLines(score(1, []))[1]).toEqual({
      points: 1,
      reason: 'one side matches',
      gold: false,
    })
    expect(scoreLines(score(2, []))[1]).toEqual({
      points: 2,
      reason: 'two sides match',
      gold: false,
    })
  })

  it('ends with a gold line for the pieces surrounded', () => {
    expect(scoreLines(score(2, [0]))).toEqual([
      { points: 1, reason: 'placed', gold: false },
      { points: 2, reason: 'two sides match', gold: false },
      { points: 10, reason: 'tetromino surrounded', gold: true },
    ])
    expect(scoreLines(score(6, [0, 4])).at(-1)).toEqual({
      points: 20,
      reason: 'two tetrominoes surrounded',
      gold: true,
    })
  })

  it('adds up to the placement score', () => {
    for (const s of [score(0, []), score(4, [1]), score(6, [3, 1, 2])]) {
      const total = scoreLines(s).reduce((sum, line) => sum + line.points, 0)
      expect(total).toBe(s.points)
    }
  })

  it('ends with the road squares a placement added, or took away by shortening a road', () => {
    expect(scoreLines(score(0, []), 4).at(-1)).toEqual({
      points: 4,
      reason: 'road squares',
      gold: false,
    })
    expect(scoreLines(score(0, []), 1).at(-1)?.reason).toBe('road square')
    expect(scoreLines(score(1, []), -3).at(-1)).toEqual({
      points: -3,
      reason: 'road shortened',
      gold: false,
    })
    expect(scoreLines(score(1, []), 0)).toHaveLength(2)
  })

  it('signs the points, with a real minus for losses', () => {
    expect(signedPoints(4)).toBe('+4')
    expect(signedPoints(-3)).toBe('\u22123')
  })

  it('falls back to digits past ten', () => {
    expect(countWord(12)).toBe('12')
  })
})
