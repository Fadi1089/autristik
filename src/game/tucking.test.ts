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
  moveFalling,
  moveInDirection,
  tickFallingGame,
} from './falling'
import type { FallingGameState } from './falling'
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
    'turns within the same cavity without gaining distance from %s',
    (orientation) => {
      let board: Board = {}
      for (let q = 0; q <= 8; q++)
        for (let r = 0; r <= 6; r++) {
          if (q === 0 || q === 8 || r === 0 || r === 6)
            board = withTile(board, { coord: rotated({ q, r }, orientation), quadrants: grass })
        }
      const west = ((orientation + 1) % 4) as Direction
      const north = ((orientation + 2) % 4) as Direction
      const remaining = (state: FallingGameState) => {
        const landing = landingPosition(state)!
        return Math.abs(landing.q - state.falling!.q) + Math.abs(landing.r - state.falling!.r) + 1
      }
      for (const mode of ['classic', 'superblock'] as const)
        for (const variant of ['standard', 'time-attack'] as const) {
          const initial = {
            ...createFallingGame(42, 30, 'easy', mode, variant),
            board,
            falling: rotated({ q: 3, r: 2 }, orientation),
            fallDirection: west,
            fallAnchor: rotated({ q: 0, r: 2 }, orientation),
            fallElapsed: 0.7,
          }
          expect(remaining(initial)).toBe(3)
          const downward = changeFallDirection(initial, orientation)
          expect(downward.falling).toEqual(rotated({ q: 3, r: 3 }, orientation))
          expect(downward.fallDirection).toBe(orientation)
          expect(remaining(downward)).toBe(3)
          expect(landingPosition(downward)).toEqual(rotated({ q: 3, r: 5 }, orientation))
          expect(downward.fallElapsed).toBe(0.7)
          expect(downward.board).toBe(board)
          const upward = changeFallDirection(initial, north)
          expect(upward.falling).toEqual(initial.falling)
          expect(upward.fallDirection).toBe(north)
          expect(remaining(upward)).toBe(2)
          expect(landingPosition(upward)).toEqual(rotated({ q: 3, r: 1 }, orientation))
          let turned: FallingGameState = upward
          for (let i = 0; i < 12; i++)
            for (const direction of DIRECTIONS) {
              const before = remaining(turned)
              turned = changeFallDirection(turned, direction)
              expect(remaining(turned)).toBeLessThanOrEqual(before)
              expect(turned.fallElapsed).toBe(0.7)
              expect(isOccupied(board, turned.falling!)).toBe(false)
              expect(turned.tucked).toBe(true)
            }
          const landing = landingPosition(turned)!
          expect(
            tickFallingGame(turned, remaining(turned) * FALL_INTERVAL - 0.7).lastPlacement?.coord,
          ).toEqual(landing)
        }
    },
  )

  it('blocks open exits and repeated island switches while inside a cavity', () => {
    let board: Board = {}
    for (let q = 0; q <= 8; q++) board = withTile(board, { coord: { q, r: 6 }, quadrants: grass })
    for (let r = 0; r < 6; r++) board = withTile(board, { coord: { q: 8, r }, quadrants: grass })
    for (let q = 3; q < 8; q++) board = withTile(board, { coord: { q, r: 0 }, quadrants: grass })
    board = withTile(board, { coord: { q: 2, r: -4 }, quadrants: grass })
    const initial = {
      ...createFallingGame(42),
      board,
      falling: { q: 2, r: 2 },
      tucked: true,
      fallAnchor: { q: 2, r: 6 },
      fallElapsed: 0.9,
    }
    expect(changeFallDirection(initial, Direction.North)).toBe(initial)
    expect(changeFallDirection(initial, Direction.South)).toBe(initial)
    expect(changeFallDirection(initial, Direction.West)).toBe(initial)
    const inside = { ...initial, falling: { q: 3, r: 2 } }
    expect(moveFalling(inside, 2)).toBe(inside)
    expect(moveFalling(inside, 7).falling).toEqual({ q: 7, r: 2 })
  })

  it.each(DIRECTIONS)(
    'moves across the whole large courtyard at current depth from %s',
    (direction) => {
      // Screenshot-shaped courtyard: a low left wall, tall right wall and an overhanging top bar.
      let board: Board = {}
      const put = (q: number, r: number) => {
        board = withTile(board, { coord: rotated({ q, r }, direction), quadrants: grass })
      }
      for (let q = 0; q <= 12; q++) put(q, 10)
      for (let r = 0; r <= 10; r++) put(12, r)
      for (let r = 5; r <= 10; r++) put(0, r)
      for (let q = 3; q <= 12; q++) put(q, 0)
      const axis = direction === Direction.South || direction === Direction.North ? 'q' : 'r'
      for (const mode of ['classic', 'superblock'] as const)
        for (const variant of ['standard', 'time-attack'] as const) {
          const base = {
            ...createFallingGame(42, 30, 'easy', mode, variant),
            board,
            falling: rotated({ q: 2, r: 6 }, direction),
            fallDirection: direction,
            fallAnchor: rotated({ q: 2, r: 10 }, direction),
            fallElapsed: 0.8,
          }
          let moved: FallingGameState = base
          for (let q = 3; q <= 11; q++) {
            const destination = rotated({ q, r: 6 }, direction)
            moved = moveFalling(moved, destination[axis])
            expect(moved.falling).toEqual(destination)
            expect(moved.fallDirection).toBe(direction)
            expect(moved.fallElapsed).toBe(0.8)
            expect(moved.board).toBe(board)
            expect(landingPosition(moved)).toEqual(rotated({ q, r: 9 }, direction))
          }
          const wall = rotated({ q: 12, r: 6 }, direction)
          expect(moveFalling(moved, wall[axis])).toBe(moved)
          const oppositeEdge = rotated({ q: 1, r: 6 }, direction)
          const crossed = moveFalling(moved, oppositeEdge[axis])
          expect(crossed.falling).toEqual(oppositeEdge)
          expect(crossed.fallElapsed).toBe(0.8)
          expect(hardDrop(crossed).lastPlacement?.coord).toEqual(rotated({ q: 1, r: 9 }, direction))
          expect(tickFallingGame(crossed, FALL_INTERVAL - 0.8).falling).toEqual(
            rotated({ q: 1, r: 7 }, direction),
          )
        }
      // An eastward approach can change rows throughout the upper and lower empty interior.
      const east = ((direction + 3) % 4) as Direction
      const rowAxis = east === Direction.East || east === Direction.West ? 'r' : 'q'
      const horizontal = {
        ...createFallingGame(42),
        board,
        fallDirection: east,
        falling: rotated({ q: 4, r: 2 }, direction),
        fallElapsed: 0.6,
      }
      const lower = rotated({ q: 4, r: 9 }, direction)
      const traversed = moveFalling(horizontal, lower[rowAxis])
      expect(traversed.falling).toEqual(lower)
      expect(traversed.fallDirection).toBe(east)
      expect(traversed.fallElapsed).toBe(0.6)
      expect(hardDrop(traversed).lastPlacement?.coord).toEqual(rotated({ q: 11, r: 9 }, direction))
    },
  )

  it('blocks internal obstacles and does not treat distant separate islands as cavity walls', () => {
    let board: Board = {}
    for (let q = 0; q <= 10; q++)
      for (let r = 0; r <= 10; r++) {
        if (q === 0 || q === 10 || r === 0 || r === 10 || (q === 5 && r === 5))
          board = withTile(board, { coord: { q, r }, quadrants: grass })
      }
    const inside = { ...createFallingGame(42), board, falling: { q: 3, r: 5 }, fallElapsed: 0.4 }
    expect(moveFalling(inside, 6)).toBe(inside)
    expect(moveFalling(inside, 4).falling).toEqual({ q: 4, r: 5 })
    const separate = [
      { q: -6, r: 0 },
      { q: 6, r: 0 },
      { q: 0, r: -6 },
      { q: 0, r: 6 },
    ].reduce<Board>((result, coord) => withTile(result, { coord, quadrants: grass }), {})
    expect(moveFalling({ ...inside, board: separate, falling: { q: 0, r: 0 } }, 1).tucked).toBe(
      false,
    )
  })

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
    'keeps normal lane distance on exposed edges with zero, one or two neighbours from %s',
    (direction) => {
      for (const faces of [0, 1, 2]) {
        const { game, hole, side } = recess(direction)
        const removed = [
          { q: 0, r: 2 },
          { q: -1, r: 1 },
          { q: 0, r: 0 },
        ]
          .slice(0, 3 - faces)
          .concat([{ q: 0, r: 3 }])
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

  it.each(DIRECTIONS)(
    'enters a two-cell recess and continues towards its floor from %s',
    (direction) => {
      for (const mode of ['classic', 'superblock'] as const)
        for (const variant of ['standard', 'time-attack'] as const) {
          const initial = recess(direction, mode, variant)
          // The top cell now has two neighbours; the third wall is two steps below it.
          const board = withoutTiles(initial.game.board, [rotated({ q: 0, r: 2 }, direction)])
          const floor = rotated({ q: 0, r: 2 }, direction)
          const entered = moveInDirection({ ...initial.game, board }, initial.side)
          expect(entered.falling).toEqual(initial.hole)
          expect(entered.tucked).toBe(true)
          expect(entered.fallDirection).toBe(direction)
          expect(entered.fallElapsed).toBe(initial.game.fallElapsed)
          expect(landingPosition(entered)).toEqual(floor)
          const advanced = tickFallingGame(entered, 0.1)
          expect(advanced.falling).toEqual(floor)
          expect(advanced.placements).toBe(0)
          expect(tickFallingGame(advanced, FALL_INTERVAL).lastPlacement?.coord).toEqual(floor)
          expect(hardDrop(entered).lastPlacement?.coord).toEqual(floor)
        }
    },
  )

  it.each(DIRECTIONS)(
    'allows a side entrance and a downward entrance into the same wider cavity from %s',
    (direction) => {
      let board: Board = {}
      for (const coord of [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: -1, r: 0 },
        { q: -1, r: 1 },
        { q: -1, r: 2 },
        { q: -1, r: 3 },
        { q: 0, r: 3 },
        { q: 1, r: 3 },
        { q: 2, r: 3 },
      ])
        board = withTile(board, { coord: rotated(coord, direction), quadrants: grass })
      const base = { ...createFallingGame(42), board, fallDirection: direction, fallElapsed: 0.7 }
      const entry = rotated({ q: 1, r: 1 }, direction)
      const side = DIRECTIONS.find((d) => {
        const to = neighbour(rotated({ q: 2, r: 1 }, direction), d)
        return to.q === entry.q && to.r === entry.r
      })!
      const fromSide = moveInDirection(
        { ...base, falling: rotated({ q: 2, r: 1 }, direction) },
        side,
      )
      expect(fromSide.falling).toEqual(entry)
      expect(fromSide.fallDirection).toBe(direction)
      expect(fromSide.fallElapsed).toBe(0.7)
      const bottomHole = rotated({ q: 0, r: 2 }, direction)
      const fromAbove = advanceFalling(moveInDirection(fromSide, side))
      expect(fromAbove.falling).toEqual(bottomHole)
      expect(advanceFalling(fromAbove).lastPlacement?.coord).toEqual(bottomHole)
      const fromLowerSide = moveInDirection(
        { ...base, falling: rotated({ q: 1, r: 2 }, direction) },
        side,
      )
      expect(fromLowerSide.falling).toEqual(bottomHole)
      expect(hardDrop(fromLowerSide).lastPlacement?.coord).toEqual(bottomHole)
    },
  )

  it('reaches an L-shaped recess from above or the left while retaining each approach direction', () => {
    let board: Board = {}
    for (const coord of [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 1, r: 1 },
      { q: 1, r: 2 },
      { q: 1, r: 3 },
      { q: 0, r: 3 },
      { q: -1, r: 2 },
      { q: -1, r: 3 },
    ])
      board = withTile(board, { coord, quadrants: grass })
    const base = { ...createFallingGame(42), board, fallElapsed: 0.8 }
    const fromAbove = { ...base, fallDirection: Direction.South, falling: { q: -1, r: 0 } }
    const mouth = advanceFalling(fromAbove)
    const turnedIntoRecess = moveInDirection(mouth, Direction.East)
    expect(turnedIntoRecess.falling).toEqual({ q: 0, r: 1 })
    expect(turnedIntoRecess.fallDirection).toBe(Direction.South)
    const lower = advanceFalling(turnedIntoRecess)
    expect(lower.falling).toEqual({ q: 0, r: 2 })
    expect(advanceFalling(lower).lastPlacement?.coord).toEqual({ q: 0, r: 2 })
    const fromLeft = { ...base, fallDirection: Direction.East, falling: { q: -2, r: 1 } }
    const upper = advanceFalling(advanceFalling(fromLeft))
    expect(upper.falling).toEqual({ q: 0, r: 1 })
    const loweredIntoRecess = moveInDirection(upper, Direction.South)
    expect(loweredIntoRecess.falling).toEqual({ q: 0, r: 2 })
    expect(loweredIntoRecess.fallDirection).toBe(Direction.East)
    expect(advanceFalling(loweredIntoRecess).lastPlacement?.coord).toEqual({ q: 0, r: 2 })
  })

  it('does not insert through occupied columns, from far away or towards an open exit', () => {
    const { game, hole } = recess(Direction.South)
    const farLane = moveFalling({ ...game, falling: { q: 2, r: 1 } }, 0)
    expect(farLane.tucked).toBe(false)
    expect(farLane.falling).not.toEqual(hole)
    const blockedSource = withTile(game.board, { coord: game.falling, quadrants: grass })
    expect(moveFalling({ ...game, board: blockedSource }, 0).tucked).toBe(false)
    // Only upward motion has a floor here; a downward approach must retain normal spacing.
    const open = withoutTiles(game.board, [
      { q: 0, r: 2 },
      { q: 0, r: 3 },
    ])
    expect(moveFalling({ ...game, board: open }, 0).tucked).toBe(false)
  })

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
    expect(turned).toBe(tucked) // The only open face is the entrance: it cannot be used to escape.
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
