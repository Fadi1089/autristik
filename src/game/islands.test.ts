import { describe, expect, it } from 'vitest'
import { boardIsland, boardIslands, tileCount, withTile, withoutTiles } from './board'
import type { Board } from './board'
import { DIRECTIONS, Direction, directionOffset, oppositeDirection } from './coords'
import {
  changeFallDirection,
  createFallingGame,
  hardDrop,
  landingPosition,
  moveFalling,
  tickFallingGame,
} from './falling'
import { BEDROCK_TILE } from './tiles'

const grass = ['grass', 'grass', 'grass', 'grass'] as const

describe('separate islands', () => {
  it('groups cardinal neighbours but not diagonal contacts, with bedrock as a solid cell', () => {
    let board: Board = {}
    for (const [q, r] of [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 1],
    ])
      board = withTile(board, {
        coord: { q: q!, r: r! },
        quadrants: q === 1 ? BEDROCK_TILE : grass,
      })
    expect(boardIslands(board).map(tileCount)).toEqual([3, 1])
    expect(tileCount(boardIsland(board, { q: 1, r: 0 }))).toBe(3)
    expect(withoutTiles(board, [{ q: 1, r: 0 }])['1,0']).toBe(board['1,0'])
  })

  it.each(DIRECTIONS)(
    'cycles the far edge then the next island near edge in outward direction %s',
    (outward) => {
      const step = directionOffset(outward)
      const sideways = directionOffset(
        outward === Direction.North || outward === Direction.South
          ? Direction.East
          : Direction.South,
      )
      let board: Board = {}
      for (const depth of [0, 8, 16])
        for (const lane of [-1, 0, 1])
          board = withTile(board, {
            coord: { q: step.q * depth + sideways.q * lane, r: step.r * depth + sideways.r * lane },
            quadrants: grass,
          })
      const game = {
        ...createFallingGame(42),
        board,
        current: grass,
        currentMultiplier: 1 as const,
        fallDirection: outward,
        falling: { q: -step.q * 10, r: -step.r * 10 },
        fallElapsed: 0.3,
      }
      const requested = oppositeDirection(outward)
      const far = changeFallDirection(game, requested)
      expect(far.fallDirection).toBe(requested)
      expect(landingPosition(far)).toEqual({ q: step.q || 0, r: step.r || 0 })
      expect(far.falling).toEqual({ q: step.q * 10 || 0, r: step.r * 10 || 0 })
      const next = changeFallDirection(far, requested)
      expect(next.fallDirection).toBe(outward)
      expect(landingPosition(next)).toEqual({ q: step.q * 7 || 0, r: step.r * 7 || 0 })
      expect(next.falling).toEqual({ q: -step.q * 2 || 0, r: -step.r * 2 || 0 })
      expect(next.fallElapsed).toBe(0.3)
      // The moving ghost passes over island 1 while still targeting island 2.
      expect(tickFallingGame(next, 4.2).board).toBe(board)
      const landed = hardDrop(next)
      expect(landed.lastPlacement?.coord).toEqual(landingPosition(next))
      expect(landingPosition(landed)).toEqual({ q: step.q * 6 || 0, r: step.r * 6 || 0 })
      const third = changeFallDirection(changeFallDirection(next, requested), requested)
      expect(landingPosition(third)).toEqual({ q: step.q * 15 || 0, r: step.r * 15 || 0 })
      const end = changeFallDirection(third, requested)
      expect(changeFallDirection(end, requested)).toBe(end)
      // Opposite input goes back to the previous island's far edge.
      const back = changeFallDirection(next, outward)
      expect(landingPosition(back)).toEqual({ q: step.q || 0, r: step.r || 0 })
    },
  )

  it('keeps lateral movement and corner turns on the selected island', () => {
    let board: Board = {}
    for (const r of [0, 8])
      for (const q of [-1, 0, 1]) board = withTile(board, { coord: { q, r }, quadrants: grass })
    const game = { ...createFallingGame(42), board, falling: { q: 0, r: -10 } }
    const south = changeFallDirection(game, Direction.North)
    const moved = moveFalling(south, 1)
    expect(landingPosition(moved)).toEqual({ q: 1, r: 1 })
    const corner = moveFalling(moved, 2)
    expect(corner.fallDirection).toBe(Direction.West)
    expect(landingPosition(corner)).toEqual({ q: 2, r: 0 })
  })
})
