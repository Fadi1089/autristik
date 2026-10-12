import { describe, expect, it } from 'vitest'
import { withTile } from './board'
import { createGame, nextTilePreview, placeCurrent, rotateCurrent } from './game'
import { createRng } from './random'
import { randomTile, tileKind, VOID_TILE, VOID_TILE_CHANCE, VOID_UNLOCK_PLACEMENTS } from './tiles'

const grass = ['grass', 'grass', 'grass', 'grass'] as const
const board = withTile({}, { coord: { q: 0, r: 0 }, quadrants: grass })
const voidSeed = Array.from({ length: 10000 }, (_, seed) => seed).find((seed) => {
  const roll = createRng(seed).next()
  return roll >= 0.05 && roll < 0.05 + VOID_TILE_CHANCE
})!

describe('void availability', () => {
  it('never starts a new game with a void tile', () => {
    for (let seed = 0; seed < 1000; seed++) {
      const game = createGame(seed)
      expect(tileKind(game.current!)).not.toBe('void')
      expect(game.placements).toBe(0)
      expect(tileKind(nextTilePreview(game)!.quadrants)).not.toBe('void')
    }
  })

  it('blocks void draws before 20 placements and unlocks the same seeded roll at 20', () => {
    expect(voidSeed).toBeDefined()
    for (let placements = 0; placements < VOID_UNLOCK_PLACEMENTS; placements++)
      expect(tileKind(randomTile(createRng(voidSeed), placements).quadrants)).toBe('normal')
    expect(randomTile(createRng(voidSeed), VOID_UNLOCK_PLACEMENTS).quadrants).toEqual(VOID_TILE)
  })

  it('previews the draw after the current placement at the unlock boundary without consuming it', () => {
    const game = {
      ...createGame(42),
      board,
      current: grass,
      currentMultiplier: 1 as const,
      seed: voidSeed,
      placements: 19,
    }
    const early = { ...game, placements: 18 }
    expect(tileKind(nextTilePreview(early)!.quadrants)).not.toBe('void')
    expect(nextTilePreview(game)!.quadrants).toEqual(VOID_TILE)
    expect(game.seed).toBe(voidSeed)
    const after = placeCurrent(game, { q: 1, r: 0 })
    expect(after).toMatchObject({ current: VOID_TILE, placements: 20 })
    expect(after.seed).not.toBe(voidSeed)
  })

  it('does not count invalid placements, rotations or the starting island', () => {
    const game = { ...createGame(42), board, current: grass }
    expect(placeCurrent(game, { q: 0, r: 0 }).placements).toBe(0)
    expect(placeCurrent(game, { q: 100, r: 100 }).placements).toBe(0)
    expect(rotateCurrent(game, 1).placements).toBe(0)
    expect(placeCurrent(game, { q: 1, r: 0 }).placements).toBe(1)
  })

  it('keeps void rare after unlocking', () => {
    const rng = createRng(12345)
    let voids = 0
    for (let i = 0; i < 20000; i++) if (tileKind(randomTile(rng, 20).quadrants) === 'void') voids++
    expect(voids).toBeGreaterThan(140)
    expect(voids).toBeLessThan(260)
  })

  it('does not consume an extra supply tile or change the queued preview when creating the fallback anchor', () => {
    const game = {
      ...createGame(42),
      board,
      current: VOID_TILE,
      placements: 20,
      score: 123,
      combo: 4,
    }
    const queued = nextTilePreview(game)!
    const after = placeCurrent(game, { q: 1, r: 0 })
    expect(after.board['1,0']?.multiplier).toBe(1)
    expect(tileKind(after.board['1,0']!.quadrants)).toBe('normal')
    expect(after).toMatchObject({
      remaining: 29,
      score: 123,
      placements: 21,
      combo: 0,
      current: queued.quadrants,
      currentMultiplier: queued.multiplier,
    })
    expect(after.lastPlacement?.quadrants).toEqual(VOID_TILE)
  })
})
