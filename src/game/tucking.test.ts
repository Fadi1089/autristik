import { describe, expect, it } from 'vitest'
import { isOccupied, withTile, withoutTiles } from './board'
import type { Board } from './board'
import { DIRECTIONS, Direction, neighbour } from './coords'
import type { Coord } from './coords'
import {
  advanceFalling,
  changeFallDirection,
  createFallingGame,
  FALL_INTERVAL,
  hardDrop,
  landingPosition,
  moveInDirection,
  tickFallingGame,
} from './falling'
import { rotateCurrent, swapCurrent } from './game'
import { BEDROCK_TILE, RAINBOW_TILE, VOID_TILE } from './tiles'

const grass = ['grass', 'grass', 'grass', 'grass'] as const

function rotated(coord: Coord, direction: Direction): Coord {
  switch (direction) {
    case Direction.South:
      return coord
    case Direction.North:
      return { q: -coord.q || 0, r: -coord.r || 0 }
    case Direction.East:
      return { q: coord.r, r: -coord.q || 0 }
    case Direction.West:
      return { q: -coord.r || 0, r: coord.q }
  }
}

// Connected island with a three-sided pocket below an overhanging entry lane.
function recess(
  direction: Direction,
  mode: 'classic' | 'superblock' = 'superblock',
  variant: 'standard' | 'time-attack' = 'standard',
) {
  let board: Board = {}
  for (const coord of [
    { q: 0, r: 0 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: -1, r: 2 },
    { q: 0, r: 2 },
    { q: -1, r: 3 },
    { q: 0, r: 3 },
    { q: 1, r: 3 },
  ])
    board = withTile(board, { coord: rotated(coord, direction), quadrants: grass })
  const game = {
    ...createFallingGame(42, 30, 'easy', mode, variant),
    board,
    current: grass,
    currentMultiplier: 1 as const,
    falling: rotated({ q: 1, r: 1 }, direction),
    fallDirection: direction,
    fallAnchor: rotated({ q: 1, r: 3 }, direction),
    fallElapsed: FALL_INTERVAL - 0.1,
  }
  const hole = rotated({ q: 0, r: 1 }, direction)
  const side = DIRECTIONS.find((d) => {
    const adjacent = neighbour(game.falling, d)
    return adjacent.q === hole.q && adjacent.r === hole.r
  })!
  return { game, hole, side }
}

describe('last-moment lateral tucking', () => {
  it.each(DIRECTIONS)(
    'slides at current depth and locks on the next cadence from %s',
    (direction) => {
      for (const mode of ['classic', 'superblock'] as const)
        for (const variant of ['standard', 'time-attack'] as const) {
          const { game, hole, side } = recess(direction, mode, variant)
          const moved = moveInDirection(game, side)
          expect(moved.falling).toEqual(hole)
          expect(moved.tucked).toBe(true)
          expect(moved.fallElapsed).toBe(game.fallElapsed)
          expect(moved.board).toBe(game.board)
          expect(moved.placements).toBe(0)
          expect(landingPosition(moved)).toEqual(hole)
          expect(isOccupied(game.board, neighbour(hole, direction))).toBe(true)
          const before = tickFallingGame(moved, 0.099)
          expect(before.board).toBe(game.board)
          const placed = tickFallingGame(before, 0.001)
          expect(placed.lastPlacement?.coord).toEqual(hole)
          expect(placed.placements).toBe(1)
          expect(placed.tucked).toBe(false)
          expect(hardDrop(moved).lastPlacement?.coord).toEqual(hole)
        }
    },
  )

  it.each(DIRECTIONS)(
    'keeps normal lane distance with fewer than three occupied faces from %s',
    (direction) => {
      for (const faces of [0, 1, 2]) {
        const { game, hole, side } = recess(direction)
        const removed = [
          { q: 0, r: 2 },
          { q: -1, r: 1 },
          { q: 0, r: 0 },
        ]
          .slice(0, 3 - faces)
          .map((coord) => rotated(coord, direction))
        const before = { ...game, board: withoutTiles(game.board, removed), fallAnchor: undefined }
        expect(DIRECTIONS.filter((d) => isOccupied(before.board, neighbour(hole, d)))).toHaveLength(
          faces,
        )
        const moved = moveInDirection(before, side)
        expect(moved.tucked).toBe(false)
        expect(moved.board).toBe(before.board)
        expect(moved.fallElapsed).toBe(before.fallElapsed)
        const distance = (state: typeof moved) => {
          const target = landingPosition(state)!
          return Math.abs(target.q - state.falling!.q) + Math.abs(target.r - state.falling!.r)
        }
        expect(distance(moved)).toBe(distance(before))
        expect(landingPosition(moved)).not.toEqual(hole)
      }
    },
  )

  it('supports special tiles, rotation, exchange and changing direction before locking', () => {
    const { game, hole, side } = recess(Direction.South)
    for (const current of [grass, RAINBOW_TILE, VOID_TILE, BEDROCK_TILE]) {
      const moved = moveInDirection({ ...game, current }, side)
      expect(advanceFalling(moved).lastPlacement?.coord).toEqual(hole)
    }
    const tucked = moveInDirection(game, side)
    expect(advanceFalling({ ...tucked, ...rotateCurrent(tucked, 1) }).lastPlacement?.coord).toEqual(
      hole,
    )
    expect(hardDrop({ ...tucked, ...swapCurrent(tucked) }).lastPlacement?.coord).toEqual(hole)
    const turned = changeFallDirection(tucked, Direction.East)
    expect(turned.tucked).toBe(false)
    expect(turned.fallAnchor).toBeDefined()
    expect(landingPosition(turned)).not.toBeNull()
  })

  it('keeps lane relief for occupied side cells and remaining distance while far away', () => {
    const { game, hole, side } = recess(Direction.South)
    const blocked = moveInDirection(
      { ...game, board: withTile(game.board, { coord: hole, quadrants: grass }) },
      side,
    )
    expect(blocked.tucked).toBe(false)
    expect(blocked.falling).not.toEqual(hole)
    const far = { ...game, falling: { q: 1, r: -7 } }
    const shifted = moveInDirection(far, side)
    expect(shifted.falling).toEqual({ q: 0, r: -10 })
    expect(shifted.tucked).toBe(false)
    expect(Math.abs(landingPosition(shifted)!.r - shifted.falling!.r)).toBe(
      Math.abs(landingPosition(far)!.r - far.falling.r),
    )
  })
})
