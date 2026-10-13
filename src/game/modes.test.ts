import { describe, expect, it } from 'vitest'
import { boardTiles, withTile } from './board'
import { createGame, nextTilePreview, placeCurrent, previewPlacement } from './game'
import { createFallingGame, hardDrop } from './falling'
import { placementCandidates } from './matching'
import { createRng } from './random'
import { randomTile, REGULAR_TERRAINS, tileKind } from './tiles'

describe('game modes', () => {
  it('excludes every special and every per-tile multiplier from classic draws, even after the void unlock', () => {
    const rng = createRng(12345)
    for (let i = 0; i < 10000; i++) {
      const tile = randomTile(rng, i, 'classic')
      expect(tile.multiplier).toBe(1)
      expect(tileKind(tile.quadrants)).toBe('normal')
      expect(
        tile.quadrants.every((terrain) =>
          (REGULAR_TERRAINS as readonly string[]).includes(terrain),
        ),
      ).toBe(true)
    }
  })

  it.each(['classic', 'superblock'] as const)(
    'retains the %s mode through draws and previews the exact next tile',
    (mode) => {
      let game = createGame(42, 100, mode)
      for (let i = 0; i < 60; i++) {
        const next = nextTilePreview(game)!
        const savedSeed = game.seed
        expect(nextTilePreview(game)).toEqual(next)
        expect(game.seed).toBe(savedSeed)
        if (mode === 'classic') expect(next.multiplier).toBe(1)
        const target = placementCandidates(game.board)[0]!
        game = placeCurrent(game, target)
        expect(game.mode).toBe(mode)
        expect(game.current).toEqual(next.quadrants)
        expect(game.currentMultiplier).toBe(next.multiplier)
        if (mode === 'classic')
          expect(
            boardTiles(game.board).every(
              (tile) => tileKind(tile.quadrants) === 'normal' && (tile.multiplier ?? 1) === 1,
            ),
          ).toBe(true)
      }
    },
  )

  it('keeps combos in classic but cannot apply a per-tile bonus there', () => {
    const grass = ['grass', 'grass', 'grass', 'grass'] as const
    const game = {
      ...createGame(42, undefined, 'classic'),
      current: grass,
      currentMultiplier: 5 as const,
      combo: 2,
      board: withTile({}, { coord: { q: 0, r: 0 }, quadrants: grass }),
    }
    const preview = previewPlacement(game, { q: 1, r: 0 })!
    expect(preview).toMatchObject({
      basePoints: 10,
      multiplier: 1.75,
      tileMultiplier: 1,
      points: 17.5,
      combo: 3,
    })
    expect(placeCurrent(game, { q: 1, r: 0 }).lastPlacement).toMatchObject(preview)
  })

  it('preserves the same starting island, supply, levels and difficulty across modes', () => {
    const classic = createFallingGame(42, undefined, 'hard', 'classic')
    const superblock = createFallingGame(42, undefined, 'hard', 'superblock')
    expect(classic.board).toEqual(superblock.board)
    expect(classic).toMatchObject({
      remaining: 30,
      level: 1,
      score: 0,
      combo: 0,
      difficulty: 'hard',
    })
    expect(classic.falling).toEqual(superblock.falling)
    expect(hardDrop(classic).mode).toBe('classic')
    expect(hardDrop(superblock).mode).toBe('superblock')
    expect(createGame(42, undefined, 'classic')).toEqual(createGame(42, undefined, 'classic'))
  })

  it('keeps all existing special types and multipliers in Superblock', () => {
    const rng = createRng(12345)
    const kinds = new Set<string>()
    for (let i = 0; i < 5000; i++) {
      const tile = randomTile(rng, 20, 'superblock')
      kinds.add(`${tileKind(tile.quadrants)}:${tile.multiplier}`)
    }
    expect([...kinds]).toEqual(
      expect.arrayContaining([
        'bedrock:1',
        'gold:1',
        'normal:1',
        'normal:2',
        'normal:3',
        'normal:5',
        'void:1',
      ]),
    )
  })
})
