import { describe, expect, it } from 'vitest'
import { withTile } from './board'
import { DIRECTIONS, neighbour } from './coords'
import { createGame, placeCurrent, placementMultiplier, previewPlacement } from './game'
import { BEDROCK_TILE, RAINBOW_TILE, VOID_TILE } from './tiles'

const grass = ['grass', 'grass', 'grass', 'grass'] as const
const water = ['water', 'water', 'water', 'water'] as const
const centre = { q: 0, r: 0 }

describe('Superblock neighbouring score bonuses', () => {
  it.each([2, 3, 5] as const)(
    'passes ×%s through any touching side to an ordinary ×1 tile',
    (bonus) => {
      for (const direction of DIRECTIONS) {
        const board = withTile(
          {},
          { coord: neighbour(centre, direction), quadrants: grass, multiplier: bonus },
        )
        const game = { ...createGame(42), board, current: grass, currentMultiplier: 1 as const }
        const preview = previewPlacement(game, centre)!
        expect(preview).toMatchObject({ tileMultiplier: bonus, points: 12.5 * bonus })
        const placed = placeCurrent(game, centre)
        expect(placed.lastPlacement).toMatchObject(preview)
        expect(placed.board['0,0']?.multiplier).toBe(1)
        expect(placed.lastPlacement?.intrinsicMultiplier).toBe(1)
        expect(game.currentMultiplier).toBe(1)
        expect(game.board).toBe(board)
      }
    },
  )

  it('keeps the strongest own or touching bonus without stacking multipliers', () => {
    const board = withTile(
      withTile({}, { coord: { q: -1, r: 0 }, quadrants: grass, multiplier: 2 }),
      { coord: { q: 1, r: 0 }, quadrants: grass, multiplier: 3 },
    )
    const game = { ...createGame(42), board, current: grass, currentMultiplier: 1 as const }
    expect(previewPlacement(game, centre)).toMatchObject({
      tileMultiplier: 3,
      points: 75,
      bonusTiles: 1,
    })
    expect(placementMultiplier({ ...game, currentMultiplier: 5 }, centre)).toBe(5)
    const unchanged = placeCurrent(game, centre)
    expect(unchanged.board['-1,0']).toBe(board['-1,0'])
    expect(unchanged.board['1,0']).toBe(board['1,0'])
  })

  it('never propagates a received score bonus to subsequent placements in either format', () => {
    for (const variant of ['standard', 'time-attack'] as const) {
      const board = withTile({}, { coord: centre, quadrants: grass, multiplier: 3 })
      const game = {
        ...createGame(42, 30, 'superblock', variant),
        board,
        current: grass,
        currentMultiplier: 1 as const,
      }
      const first = placeCurrent(game, { q: 1, r: 0 })
      const second = placeCurrent(
        { ...first, current: grass, currentMultiplier: 1 },
        { q: 2, r: 0 },
      )
      expect(first.lastPlacement).toMatchObject({ points: 37.5, tileMultiplier: 3 })
      expect(first.board['1,0']?.multiplier).toBe(1)
      expect(second.lastPlacement).toMatchObject({ points: 15, tileMultiplier: 1 })
      expect(second.board['2,0']?.multiplier).toBe(1)
      expect(second.board['0,0']?.multiplier).toBe(3)
    }
  })

  it('lets gold jokers grant and receive score bonuses without changing their own multiplier', () => {
    for (const bonus of [1, 2, 3, 5] as const) {
      const gold = withTile({}, { coord: centre, quadrants: RAINBOW_TILE, multiplier: bonus })
      const game = { ...createGame(42), board: gold, current: grass, currentMultiplier: 1 as const }
      expect(previewPlacement(game, { q: 1, r: 0 })?.tileMultiplier).toBe(bonus)
      const normal = withTile({}, { coord: centre, quadrants: grass, multiplier: bonus })
      const joker = { ...game, board: normal, current: RAINBOW_TILE }
      const placed = placeCurrent(joker, { q: 1, r: 0 })
      expect(placed.lastPlacement?.tileMultiplier).toBe(bonus)
      expect(placed.board['1,0']).toMatchObject({ quadrants: RAINBOW_TILE, multiplier: 1 })
      const intrinsic = placeCurrent({ ...joker, currentMultiplier: bonus }, { q: 1, r: 0 })
      expect(intrinsic.board['1,0']?.multiplier).toBe(bonus)
    }
  })

  it('preserves a smaller intrinsic bonus even when a stronger neighbour boosts its score', () => {
    const board = withTile({}, { coord: centre, quadrants: grass, multiplier: 5 })
    const game = { ...createGame(42), board, current: grass, currentMultiplier: 2 as const }
    const first = placeCurrent(game, { q: 1, r: 0 })
    expect(first.lastPlacement).toMatchObject({ tileMultiplier: 5, intrinsicMultiplier: 2 })
    expect(first.board['1,0']?.multiplier).toBe(2)
    const second = placeCurrent({ ...first, current: grass, currentMultiplier: 1 }, { q: 2, r: 0 })
    expect(second.lastPlacement?.tileMultiplier).toBe(2)
  })

  it('ignores diagonals, distant tiles, bedrock and void as bonus sources', () => {
    let board = withTile({}, { coord: { q: -1, r: 0 }, quadrants: grass })
    for (const tile of [
      { coord: { q: 1, r: 1 }, quadrants: grass, multiplier: 5 as const },
      { coord: { q: 2, r: 0 }, quadrants: grass, multiplier: 5 as const },
      { coord: { q: 1, r: 0 }, quadrants: BEDROCK_TILE, multiplier: 5 as const },
      { coord: { q: 0, r: 1 }, quadrants: VOID_TILE, multiplier: 5 as const },
    ])
      board = withTile(board, tile)
    const game = { ...createGame(42), board, current: grass, currentMultiplier: 1 as const }
    expect(placementMultiplier(game, centre)).toBe(1)
    expect(previewPlacement({ ...game, current: BEDROCK_TILE }, centre)).toMatchObject({
      points: 0,
      tileMultiplier: 1,
    })
    expect(previewPlacement({ ...game, current: VOID_TILE }, centre)).toMatchObject({
      points: 0,
      tileMultiplier: 1,
    })
  })

  it('does not create terrain matches or change Classic scoring', () => {
    const board = withTile({}, { coord: centre, quadrants: grass, multiplier: 5 })
    const game = {
      ...createGame(42),
      board,
      current: water,
      currentMultiplier: 1 as const,
      combo: 4,
    }
    expect(previewPlacement(game, { q: 1, r: 0 })).toMatchObject({
      tileMultiplier: 5,
      points: 0,
      combo: 0,
    })
    expect(
      previewPlacement({ ...game, mode: 'classic', current: grass }, { q: 1, r: 0 }),
    ).toMatchObject({ tileMultiplier: 1, points: 22.5 })
  })
})
