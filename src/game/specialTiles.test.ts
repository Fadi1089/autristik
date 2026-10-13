import { describe, expect, it } from 'vitest'
import { withTile, tileCount } from './board'
import type { Board } from './board'
import { Direction } from './coords'
import { createGame, nextTilePreview, placeCurrent, previewPlacement, rotateCurrent } from './game'
import {
  createFallingGame,
  hardDrop,
  landingPosition,
  moveFalling,
  tickFallingGame,
  changeFallDirection,
} from './falling'
import { canPlace, placementCandidates, terrainsMatch } from './matching'
import { createRng } from './random'
import {
  BEDROCK_TILE,
  VOID_TILE,
  RAINBOW_TILE,
  REGULAR_TERRAINS,
  TERRAINS,
  randomTile,
  tileKind,
} from './tiles'
import type { Quadrants } from './tiles'

const grass: Quadrants = ['grass', 'grass', 'grass', 'grass']
const singleBoard = () => withTile({}, { coord: { q: 0, r: 0 }, quadrants: grass })

describe('void destruction', () => {
  it('ends normally when the void consumes the last supply tile', () => {
    const game = { ...createFallingGame(42, 1), current: VOID_TILE }
    const final = hardDrop(game)
    expect(final).toMatchObject({ current: null, remaining: 0, falling: null, score: 0 })
    expect(tickFallingGame(final, 30)).toBe(final)
  })
  it('previews destruction around the tile but preserves bedrock and distant tiles', () => {
    let board: Board = {}
    for (let q = -1; q <= 1; q++)
      for (let r = -1; r <= 1; r++) {
        if (q || r)
          board = withTile(board, { coord: { q, r }, quadrants: q === 1 ? BEDROCK_TILE : grass })
      }
    board = withTile(board, { coord: { q: 2, r: 0 }, quadrants: RAINBOW_TILE })
    const game = {
      ...createGame(42),
      board,
      current: VOID_TILE,
      currentMultiplier: 1 as const,
      score: 100,
      combo: 5,
    }
    const preview = previewPlacement(game, { q: 0, r: 0 })!
    expect(preview.destroyed).toHaveLength(5)
    expect(preview).toMatchObject({ points: 0, bonusTiles: 0, combo: 0 })
    const after = placeCurrent(game, { q: 0, r: 0 })
    expect(tileCount(after.board)).toBe(4)
    for (const r of [-1, 0, 1]) expect(after.board[`1,${r}`]).toBe(board[`1,${r}`])
    expect(after.board['2,0']).toBe(board['2,0'])
    expect(after.board['0,0']).toBeUndefined()
    expect(after).toMatchObject({ score: 100, remaining: 29, combo: 0 })
    expect(after.lastPlacement).toMatchObject(preview)
    expect(tileCount(game.board)).toBe(9)
  })

  it('uses the same destruction for hard drops and automatic landings', () => {
    const game = { ...createFallingGame(42), current: VOID_TILE }
    const immediate = hardDrop(game)
    const automatic = tickFallingGame(game, 15)
    expect(automatic.board).toEqual(immediate.board)
    expect(automatic.lastPlacement).toEqual(immediate.lastPlacement)
    expect(tileCount(automatic.board)).toBeLessThan(tileCount(game.board))
    expect(automatic.falling).not.toBeNull()
    expect(landingPosition(automatic)).not.toBeNull()
  })

  it('leaves a standard anchor at the void placement if the blast removes the last tiles', () => {
    const game = {
      ...createFallingGame(42),
      board: singleBoard(),
      current: VOID_TILE,
      placements: 20,
      falling: { q: 0, r: -1 },
    }
    const empty = hardDrop(game)
    expect(tileCount(empty.board)).toBe(1)
    const anchor = empty.board['0,-1']!
    expect(anchor.multiplier).toBe(1)
    expect(
      anchor.quadrants.every((terrain) =>
        (REGULAR_TERRAINS as readonly string[]).includes(terrain),
      ),
    ).toBe(true)
    expect(empty).toMatchObject({ placements: 21, remaining: 29, score: 0, combo: 0 })
    expect(empty.falling).toEqual({ q: 0, r: -11 })
    expect(landingPosition(empty)).toEqual({ q: 0, r: -2 })
    expect(placementCandidates(empty.board)).toHaveLength(4)
    expect(canPlace(empty.board, { q: 1, r: -1 })).toBe(true)
    expect(landingPosition(moveFalling(empty, 1))).not.toBeNull()
    const turned = changeFallDirection(
      { ...empty, current: grass, currentMultiplier: 1 as const },
      Direction.East,
    )
    expect(turned.falling).toEqual({ q: -10, r: -1 })
    const rebuilt = tickFallingGame(turned, 15)
    expect(rebuilt.board['-1,-1']?.quadrants).toEqual(grass)
    expect(rebuilt.remaining).toBe(empty.remaining - 1)
    expect(landingPosition(rebuilt)).not.toBeNull()
  })
})

describe('bedrock blocking', () => {
  it.each(TERRAINS)(
    'rejects connections with %s in both directions, including another bedrock',
    (terrain) => {
      expect(terrainsMatch('bedrock', terrain)).toBe(false)
      expect(terrainsMatch(terrain, 'bedrock')).toBe(false)
    },
  )
  it('occupies the board and preserves combos without points or bonus tiles', () => {
    const game = { ...createGame(42), board: singleBoard(), current: BEDROCK_TILE, combo: 4 }
    const placed = placeCurrent(game, { q: 1, r: 0 })
    expect(placed.board['1,0']?.quadrants).toEqual(BEDROCK_TILE)
    expect(placed.lastPlacement).toMatchObject({
      points: 0,
      bonusTiles: 0,
      combo: 4,
      mismatched: [Direction.West],
    })
    const against = previewPlacement({ ...placed, current: RAINBOW_TILE }, { q: 2, r: 0 })!
    expect(against).toMatchObject({ points: 0, combo: 4, matched: [] })
  })
})

describe('score bonus tiles', () => {
  it('keeps mismatches red and resets the combo even on a diamond tile', () => {
    const game = {
      ...createGame(42),
      board: singleBoard(),
      current: ['forest', 'grass', 'grass', 'grass'] as Quadrants,
      currentMultiplier: 5 as const,
      combo: 7,
    }
    const preview = previewPlacement(game, { q: 1, r: 0 })!
    expect(preview).toMatchObject({
      basePoints: 5,
      points: 25,
      combo: 0,
      multiplier: 1,
      tileMultiplier: 5,
      mismatched: [Direction.West],
    })
    expect(preview.contacts.filter((contact) => contact.matches)).toHaveLength(1)
  })
  it.each([2, 3, 5] as const)(
    'applies ×%s to only the placed tile, along with its combo',
    (currentMultiplier) => {
      const game = {
        ...createGame(42),
        board: singleBoard(),
        current: grass,
        currentMultiplier,
        combo: 2,
        score: 100,
      }
      const rotated = rotateCurrent(game, 1)
      const target = { q: 1, r: 0 }
      const preview = previewPlacement(rotated, target)!
      expect(preview).toMatchObject({
        basePoints: 10,
        multiplier: 1.75,
        tileMultiplier: currentMultiplier,
        points: 17.5 * currentMultiplier,
      })
      const placed = placeCurrent(rotated, target)
      expect(placed.score).toBe(100 + 17.5 * currentMultiplier)
      expect(placed.lastPlacement).toMatchObject(preview)
      expect(placed.board['1,0']?.multiplier).toBe(currentMultiplier)
      // A normal ×1 placement receives a score bonus without changing its own multiplier.
      const next = previewPlacement(
        { ...placed, current: grass, currentMultiplier: 1 },
        { q: 2, r: 0 },
      )!
      expect(next).toMatchObject({
        tileMultiplier: currentMultiplier,
        points: 20 * currentMultiplier,
      })
    },
  )

  it('multiplies perfect bonus points but never extra tiles', () => {
    let board: Board = {}
    for (const coord of [
      { q: 0, r: -1 },
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: -1, r: 0 },
    ])
      board = withTile(board, { coord, quadrants: grass })
    const game = { ...createGame(42), board, current: grass, currentMultiplier: 5 as const }
    const preview = previewPlacement(game, { q: 0, r: 0 })!
    expect(preview).toMatchObject({ basePoints: 70, points: 437.5, bonusTiles: 2 })
    expect(placeCurrent(game, { q: 0, r: 0 }).remaining).toBe(37)
  })

  it('includes every special and bonus in deterministic draws and previews their actual modifier', () => {
    const rng = createRng(12345)
    const seen = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      const seed = rng.state
      const draw = randomTile(rng, 20)
      seen.add(`${tileKind(draw.quadrants)}:${draw.multiplier}`)
      const game = { ...createGame(42), seed, placements: 20 }
      expect(nextTilePreview(game)).toEqual(draw)
      const placed = placeCurrent(game, { q: 0, r: -2 })
      expect(placed.current).toEqual(draw.quadrants)
      expect(placed.currentMultiplier).toBe(draw.multiplier)
    }
    expect([...seen]).toEqual(
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
