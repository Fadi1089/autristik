import { describe, expect, it } from 'vitest'
import { boardTiles, withTile } from './board'
import type { Board } from './board'
import { DIRECTIONS, neighbour } from './coords'
import {
  createGame,
  nextTileQuadrants,
  placeCurrent,
  previewPlacement,
  rotateCurrent,
} from './game'
import { evaluatePlacement, terrainsMatch } from './matching'
import { createRng } from './random'
import { RAINBOW_TILE, REGULAR_TERRAINS, randomTileQuadrants } from './tiles'
import type { Quadrants } from './tiles'

describe('golden joker matching', () => {
  it.each([...REGULAR_TERRAINS, 'rainbow'] as const)('matches %s in both directions', (terrain) => {
    expect(terrainsMatch('rainbow', terrain)).toBe(true)
    expect(terrainsMatch(terrain, 'rainbow')).toBe(true)
  })

  it('keeps the original matching rule between ordinary terrains', () => {
    for (const a of REGULAR_TERRAINS) {
      for (const b of REGULAR_TERRAINS) expect(terrainsMatch(a, b)).toBe(a === b)
    }
  })

  it('previews and commits all-green seams, combos and a perfect bonus against mixed neighbours', () => {
    const centre = { q: 0, r: 0 }
    let board: Board = {}
    DIRECTIONS.forEach((direction, i) => {
      const terrain = REGULAR_TERRAINS[i]!
      board = withTile(board, {
        coord: neighbour(centre, direction),
        quadrants: [terrain, terrain, terrain, terrain],
      })
    })
    const game = {
      ...createGame(42),
      board,
      current: RAINBOW_TILE,
      currentMultiplier: 1 as const,
      combo: 3,
    }
    for (let turns = 0; turns < 4; turns++) {
      const rotated = rotateCurrent(game, turns)
      const preview = previewPlacement(rotated, centre)!
      expect(preview).toMatchObject({
        matched: DIRECTIONS,
        mismatched: [],
        perfect: true,
        harmonious: true,
        basePoints: 70,
        multiplier: 2,
        points: 140,
        bonusTiles: 2,
        combo: 4,
      })
      expect(preview.contacts.every((contact) => contact.matches)).toBe(true)
      const placed = placeCurrent(rotated, centre)
      expect(placed.lastPlacement).toMatchObject(preview)
      expect(placed).toMatchObject({ score: 140, combo: 4, level: 2, remaining: 37 })
      expect(placed.board['0,0']?.quadrants).toEqual(RAINBOW_TILE)
    }
  })

  it.each(DIRECTIONS)(
    'continues matching future ordinary tiles on side %s after placement',
    (direction) => {
      const board = withTile({}, { coord: { q: 0, r: 0 }, quadrants: RAINBOW_TILE })
      const mixed: Quadrants = ['water', 'forest', 'field', 'village']
      const game = { ...createGame(42), board, current: mixed, currentMultiplier: 1 as const }
      const target = neighbour({ q: 0, r: 0 }, direction)
      const preview = previewPlacement(game, target)!
      expect(preview.contacts.every((contact) => contact.matches)).toBe(true)
      expect(placeCurrent(game, target).lastPlacement).toMatchObject({ combo: 1, points: 12.5 })
      expect(evaluatePlacement(board, target, mixed).mismatched).toEqual([])
    },
  )

  it('does not bypass occupied or detached placement rules', () => {
    const game = { ...createGame(42), current: RAINBOW_TILE }
    expect(placeCurrent(game, { q: 0, r: 0 })).toBe(game)
    expect(placeCurrent(game, { q: 100, r: 100 })).toBe(game)
  })
})

describe('joker supply', () => {
  it('draws rare whole jokers reproducibly without adding them to the starting island', () => {
    const rng = createRng(12345)
    const repeated = createRng(12345)
    let jokers = 0
    for (let draw = 0; draw < 10000; draw++) {
      const tile = randomTileQuadrants(rng)
      expect(tile).toEqual(randomTileQuadrants(repeated))
      if (tile.includes('rainbow')) {
        expect(tile).toEqual(RAINBOW_TILE)
        jokers++
      }
    }
    expect(jokers).toBeGreaterThan(400)
    expect(jokers).toBeLessThan(600)
    for (let seed = 0; seed < 100; seed++) {
      expect(
        boardTiles(createGame(seed).board).some((tile) => tile.quadrants.includes('rainbow')),
      ).toBe(false)
    }
  })

  it('shows a queued joker without consuming it, then draws precisely that tile', () => {
    // Mulberry32 seed 7 begins below the 5% threshold.
    const game = { ...createGame(42), seed: 7 }
    expect(nextTileQuadrants(game)).toEqual(RAINBOW_TILE)
    expect(nextTileQuadrants(game)).toEqual(RAINBOW_TILE)
    expect(game.seed).toBe(7)
    const placed = placeCurrent(game, { q: 0, r: -2 })
    expect(placed.current).toEqual(RAINBOW_TILE)
    expect(placed.seed).not.toBe(7)
  })
})
