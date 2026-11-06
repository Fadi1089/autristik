import { describe, expect, it } from 'vitest'
import type { Board } from './board'
import {
  advanceBonus,
  BONUS_POINTS,
  createBonusState,
  drawBonusObjective,
  legacyPlacements,
  reachesBonusRegion,
} from './bonus'
import type { BonusObjective, BonusState } from './bonus'
import { BIOMES } from './tiles'
import type { Biome } from './tiles'

function row(count: number, q = 0, r = 0, biome: Biome = 'green'): Board {
  return Object.fromEntries(
    Array.from({ length: count }, (_, i) => [
      `${q + i},${r}`,
      { coord: { q: q + i, r }, terrain: biome, piece: q + i + 100 },
    ]),
  )
}

const objective: BonusObjective = { biome: 'green', target: 7, issuedAt: 10, completed: false }
const active = (placements = 10): BonusState => ({
  ...createBonusState(42),
  placements,
  objective,
})

describe('bonus regions', () => {
  it('accepts reaching or exceeding the target with adjacent squares of the right biome', () => {
    expect(reachesBonusRegion(row(6), row(7), objective)).toBe(true)
    expect(reachesBonusRegion(row(6), row(10), objective)).toBe(true)
    expect(reachesBonusRegion(row(6, 0, 0, 'red'), row(10, 0, 0, 'red'), objective)).toBe(false)
  })

  it('does not combine diagonal or disconnected regions', () => {
    const before = row(6)
    expect(reachesBonusRegion(before, { ...before, ...row(1, 6, 1) }, objective)).toBe(false)
    expect(reachesBonusRegion(before, { ...before, ...row(6, 20) }, objective)).toBe(false)
  })

  it('counts a bridge that joins smaller regions across the target', () => {
    const before = { ...row(3), ...row(3, 4) }
    expect(reachesBonusRegion(before, { ...before, ...row(1, 3) }, objective)).toBe(true)
  })

  it('never rewards a region that already met the target, even if it grows or is joined', () => {
    expect(reachesBonusRegion(row(7), row(8), objective)).toBe(false)
    expect(reachesBonusRegion(row(7), row(7), objective)).toBe(false)
    const before = { ...row(7), ...row(3, 8) }
    expect(reachesBonusRegion(before, { ...before, ...row(1, 7) }, objective)).toBe(false)
  })

  it('allows a different region to qualify when a large one already exists elsewhere', () => {
    const before = { ...row(9, 20), ...row(6) }
    expect(reachesBonusRegion(before, { ...before, ...row(7) }, objective)).toBe(true)
  })
})

describe('objective timing and reward', () => {
  it('first proposes an objective after the tenth player placement, then every ten', () => {
    let bonus = createBonusState(12)
    for (let i = 1; i <= 40; i++) {
      const next = advanceBonus(bonus, {}, {})
      bonus = next.bonus
      expect(next.points).toBe(0)
      expect(bonus.placements).toBe(i)
      expect(bonus.objective?.issuedAt ?? null).toBe(i < 10 ? null : Math.floor(i / 10) * 10)
    }
  })

  it('does not award an objective on the placement that proposes it', () => {
    const next = advanceBonus({ ...active(9), objective: null }, row(6), row(10))
    expect(next.points).toBe(0)
    expect(next.bonus.completed).toBe(0)
    expect(next.bonus.objective).toMatchObject({ issuedAt: 10, completed: false })
  })

  it('awards exactly twenty points once and waits for the next milestone after early success', () => {
    const first = advanceBonus(active(), row(6), row(7))
    expect(first.points).toBe(BONUS_POINTS)
    expect(first.bonus.completed).toBe(1)
    expect(first.bonus.objective).toMatchObject({ issuedAt: 10, completed: true })
    const next = advanceBonus(first.bonus, row(7), row(8))
    expect(next.points).toBe(0)
    expect(next.bonus.completed).toBe(1)
    expect(next.bonus.objective?.issuedAt).toBe(10)
  })

  it('accepts success on the last allowed placement before drawing the next objective', () => {
    const last = advanceBonus(active(19), row(6), row(7))
    expect(last.points).toBe(20)
    expect(last.bonus.completed).toBe(1)
    expect(last.bonus.objective).toMatchObject({ issuedAt: 20, completed: false })
    const tooLate = advanceBonus(active(20), row(6), row(7))
    expect(tooLate.points).toBe(0)
    expect(tooLate.bonus.completed).toBe(0)
  })

  it('replaces an unmet objective at the deadline without adding points or completions', () => {
    const last = advanceBonus(active(19), row(6), row(6))
    expect(last.points).toBe(0)
    expect(last.bonus.completed).toBe(0)
    expect(last.bonus.objective).toMatchObject({ issuedAt: 20, completed: false })
  })

  it('maps equally sized random intervals to each biome and each target from seven to thirteen', () => {
    for (let biome = 0; biome < BIOMES.length; biome++)
      for (let size = 0; size < 7; size++) {
        const rolls = [(biome + 0.5) / BIOMES.length, (size + 0.5) / 7]
        const draw = drawBonusObjective({ next: () => rolls.shift()! }, 10)
        expect(draw).toEqual({
          biome: BIOMES[biome],
          target: 7 + size,
          issuedAt: 10,
          completed: false,
        })
      }
    expect(drawBonusObjective({ next: () => 0 }, 10).target).toBe(7)
    expect(drawBonusObjective({ next: () => 0.99999999 }, 10).target).toBe(13)
  })

  it('counts old tetromino placements without counting the starting piece or single black tiles', () => {
    const board = {
      ...Object.fromEntries(
        Object.entries(row(4)).map(([key, square]) => [key, { ...square, piece: 0 }]),
      ),
      ...Object.fromEntries(
        Object.entries(row(4, 5)).map(([key, square]) => [key, { ...square, piece: 1 }]),
      ),
      ...row(1, 12),
    }
    expect(legacyPlacements(board)).toBe(1)
  })
})
