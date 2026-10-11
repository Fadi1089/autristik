import { describe, expect, it } from 'vitest'
import { boardTiles, isOccupied, tileCount, withTile } from './board'
import type { Board } from './board'
import { coordsEqual, Direction, directionOffset, oppositeDirection } from './coords'
import {
  createFallingGame,
  changeFallDirection,
  advanceFalling,
  hardDrop,
  landingPosition,
  moveInDirection,
  laneAxis,
  FALL_DISTANCE,
  FALL_INTERVAL,
  moveFalling,
  spawnFalling,
  tickFallingGame,
} from './falling'
import { currentQuadrants, previewPlacement, rotateCurrent } from './game'
import { levelTimeLimit } from './levels'
import type { FallingGameState } from './falling'

describe('falling tiles', () => {
  it('spawns ten squares beyond the leading edge, including after the stack grows', () => {
    const game = createFallingGame(42)
    expect(game.falling).toEqual({ q: 0, r: -11 })
    const board = withTile(game.board, {
      coord: { q: 1, r: -8 },
      quadrants: ['grass', 'grass', 'grass', 'grass'],
    })
    expect(spawnFalling(board, Direction.South, 1).r).toBe(-8 - FALL_DISTANCE)
  })

  it('waits for the cadence and moves exactly one row without consuming a tile', () => {
    const game = createFallingGame(42)
    const before = tickFallingGame(game, FALL_INTERVAL - 0.01)
    expect(before.falling).toEqual(game.falling)
    const after = tickFallingGame(before, 0.01)
    expect(after.falling).toEqual({ q: 0, r: -10 })
    expect(after.board).toBe(game.board)
    expect(after.remaining).toBe(game.remaining)
  })

  it('moves laterally over the surface and turns at empty lanes', () => {
    const game = createFallingGame(42)
    expect(moveFalling(game, -1).falling).toEqual({ q: -1, r: -10 })
    expect(moveFalling(game, 2).fallDirection).toBe(Direction.West)
    const near = { ...game, falling: { q: -1, r: -1 } }
    expect(moveFalling(near, 0).falling).toEqual({ q: 0, r: -2 })
    expect(moveFalling(near, 1).falling).toEqual({ q: 1, r: -1 })
  })

  it('locks before collision, applies rotation and scoring, then starts a fresh fall', () => {
    const initial = createFallingGame(42)
    const game = { ...initial, ...rotateCurrent(initial, 1) }
    const target = { q: 0, r: -2 }
    const preview = previewPlacement(game, target)!
    const before = tickFallingGame(game, FALL_INTERVAL * 9)
    expect(before.falling).toEqual(target)
    expect(tileCount(before.board)).toBe(5)
    const after = tickFallingGame(before, FALL_INTERVAL)
    expect(after.board['0,-2']?.quadrants).toEqual(currentQuadrants(game))
    expect(after.score).toBe(preview.points)
    expect(after.remaining).toBe(game.remaining - 1 + preview.bonusTiles)
    expect(after.falling).toEqual({ q: 0, r: -12 })
    expect(after.rotation).toBe(0)
    expect(after.fallElapsed).toBe(0)
  })

  it('keeps falling past side contacts and waits until the forward cell blocks it', () => {
    const game = moveFalling(createFallingGame(42), -1)
    const near = tickFallingGame(game, FALL_INTERVAL * 9)
    expect(near.falling).toEqual({ q: -1, r: -1 })
    expect(tileCount(near.board)).toBe(5)
    const landed = tickFallingGame(near, FALL_INTERVAL)
    expect(landed.lastPlacement?.coord).toEqual({ q: -1, r: -1 })
  })

  it('processes long ticks like small ones, including the remainder after landing', () => {
    const game = createFallingGame(7)
    const seconds = FALL_INTERVAL * 12 + 0.1
    const once = tickFallingGame(game, seconds)
    let repeated = game
    for (let i = 0; i < 12; i++) repeated = tickFallingGame(repeated, FALL_INTERVAL)
    repeated = tickFallingGame(repeated, 0.1)
    expect(once.falling).toEqual(repeated.falling)
    expect(once.board).toEqual(repeated.board)
    expect(once.timeLeft).toBeCloseTo(repeated.timeLeft)
    expect(once.fallElapsed).toBeCloseTo(0.1)
  })

  it('stops at timeout, gives it priority over landing, and does not advance afterwards', () => {
    const game = { ...createFallingGame(42), falling: { q: 0, r: -2 }, timeLeft: FALL_INTERVAL }
    const after = tickFallingGame(game, FALL_INTERVAL * 2)
    expect(after.timeLeft).toBe(0)
    expect(after.falling).toBeNull()
    expect(after.board).toBe(game.board)
    expect(after.elapsed).toBe(FALL_INTERVAL)
    expect(tickFallingGame(after, 10)).toBe(after)
  })

  it('resets the level timer on a scoring landing and then counts the rest of the tick', () => {
    let game = createFallingGame(42)
    const target = { q: 0, r: -2 }
    const neighbour = boardTiles(game.board).find((t) => coordsEqual(t.coord, { q: 0, r: -1 }))!
    game = {
      ...game,
      current: [...neighbour.quadrants],
      falling: target,
      levelScore: 49,
    }
    // Choose a rotation that matches at least one square.
    for (let rotation = 0; rotation < 4; rotation++) {
      const rotated = rotateCurrent(game, rotation)
      if (previewPlacement(rotated, target)!.points > 0) {
        game = { ...game, ...rotated }
        break
      }
    }
    const after = tickFallingGame(game, FALL_INTERVAL + 0.2)
    expect(after.level).toBe(2)
    expect(after.timeLeft).toBeCloseTo(levelTimeLimit(2) - 0.2)
  })

  it('does not spawn or advance after the final tile is used', () => {
    const game = createFallingGame(42, 1)
    const after = tickFallingGame(game, FALL_INTERVAL * 10)
    expect(after.remaining).toBe(0)
    expect(after.falling).toBeNull()
    expect(tickFallingGame(after, 10)).toBe(after)
  })
})

describe('automatic corner turns and continuing the last lane', () => {
  const turns = [
    { fall: Direction.South, outward: Direction.East, next: Direction.West },
    { fall: Direction.South, outward: Direction.West, next: Direction.East },
    { fall: Direction.West, outward: Direction.South, next: Direction.North },
    { fall: Direction.West, outward: Direction.North, next: Direction.South },
    { fall: Direction.North, outward: Direction.East, next: Direction.West },
    { fall: Direction.North, outward: Direction.West, next: Direction.East },
    { fall: Direction.East, outward: Direction.North, next: Direction.South },
    { fall: Direction.East, outward: Direction.South, next: Direction.North },
  ]

  it.each(turns)(
    'turns $fall towards $next when moving outwards in $outward',
    ({ fall, outward, next }) => {
      const game = changeFallDirection(createFallingGame(42), fall)
      const nearEdge = moveInDirection(game, outward)
      expect(nearEdge.fallDirection).toBe(fall)
      const before = { ...nearEdge, fallElapsed: 0.4 }
      const previousTarget = landingPosition(before)!
      const previousDistance =
        Math.abs(previousTarget.q - before.falling!.q) +
        Math.abs(previousTarget.r - before.falling!.r)
      const turned = moveInDirection(before, outward)
      const target = landingPosition(turned)!
      expect(turned.fallDirection).toBe(next)
      expect(target).not.toBeNull()
      expect(Math.abs(target.q - turned.falling!.q) + Math.abs(target.r - turned.falling!.r)).toBe(
        previousDistance,
      )
      expect(turned.board).toBe(before.board)
      expect(turned.current).toBe(before.current)
      expect(turned).toMatchObject({
        fallElapsed: 0.4,
        score: before.score,
        remaining: before.remaining,
        timeLeft: before.timeLeft,
      })
      const after = hardDrop(turned)
      expect(after.lastPlacement?.coord).toEqual(target)
      expect(after.falling![laneAxis(next)]).toBe(target[laneAxis(next)])
    },
  )

  it.each([Direction.North, Direction.East, Direction.South, Direction.West])(
    'respawns on the last lane with ten-square distance for direction %s',
    (direction) => {
      const game = moveFalling(changeFallDirection(createFallingGame(42), direction), -1)
      const target = landingPosition(game)!
      const after = hardDrop(game)
      const axis = laneAxis(direction)
      expect(after.falling![axis]).toBe(-1)
      expect(after.falling![axis]).toBe(after.lastPlacement!.coord[axis])
      expect(Math.abs(after.falling!.q - target.q) + Math.abs(after.falling!.r - target.r)).toBe(
        FALL_DISTANCE,
      )
      const again = hardDrop(after)
      expect(again.falling![axis]).toBe(-1)
    },
  )

  it('retains the last lane for timed locking too, even when other lanes extend farther', () => {
    const game = createFallingGame(42)
    const board = withTile(game.board, {
      coord: { q: 0, r: -8 },
      quadrants: ['grass', 'grass', 'grass', 'grass'],
    })
    const side = { ...game, board, falling: { q: 1, r: -1 } }
    const after = tickFallingGame(side, FALL_INTERVAL)
    expect(after.lastPlacement?.coord).toEqual({ q: 1, r: -1 })
    expect(after.falling).toEqual({ q: 1, r: -11 })
  })

  it('traverses all four sides using lateral inputs without a side-selection action', () => {
    let game = createFallingGame(42)
    const sequence = [Direction.East, Direction.South, Direction.West, Direction.North]
    const expected = [Direction.West, Direction.North, Direction.East, Direction.South]
    sequence.forEach((outward, i) => {
      for (let step = 0; step < 10 && game.fallDirection !== expected[i]; step++) {
        game = moveInDirection(game, outward)
      }
      expect(game.fallDirection).toBe(expected[i])
      expect(landingPosition(game)).not.toBeNull()
    })
  })

  it('follows higher columns even when the old absolute position would collide', () => {
    const game = { ...createFallingGame(42), falling: { q: -1, r: -1 } }
    const moved = moveInDirection(game, Direction.East)
    expect(moved.falling).toEqual({ q: 0, r: -2 })
    expect(isOccupied(game.board, moved.falling!)).toBe(false)
  })
})

describe('four-sided gravity and manual drops', () => {
  const approaches = [
    { direction: Direction.South, spawn: { q: 0, r: -11 }, landing: { q: 0, r: -2 } },
    { direction: Direction.West, spawn: { q: 11, r: 0 }, landing: { q: 2, r: 0 } },
    { direction: Direction.North, spawn: { q: 0, r: 11 }, landing: { q: 0, r: 2 } },
    { direction: Direction.East, spawn: { q: -11, r: 0 }, landing: { q: -2, r: 0 } },
  ]

  it.each(approaches)(
    'spawns and projects the first obstacle for direction $direction',
    ({ direction, spawn, landing }) => {
      const game = changeFallDirection(createFallingGame(42), direction)
      expect(game.falling).toEqual(spawn)
      expect(landingPosition(game)).toEqual(landing)
      const automatic = tickFallingGame(game, FALL_INTERVAL * 10)
      expect(automatic.lastPlacement?.coord).toEqual(landing)
      expect(automatic.fallDirection).toBe(direction)
    },
  )

  it.each(approaches)(
    'hard drops on the projection and keeps the side for direction $direction',
    ({ direction, landing }) => {
      const game = changeFallDirection(createFallingGame(42), direction)
      const rotated = { ...game, ...rotateCurrent(game, 1) }
      const preview = previewPlacement(rotated, landing)!
      const after = hardDrop(rotated)
      expect(after.lastPlacement?.coord).toEqual(landing)
      expect(after.score).toBe(preview.points)
      expect(after.board[`${landing.q},${landing.r}`]?.quadrants).toEqual(currentQuadrants(rotated))
      expect(after.fallDirection).toBe(direction)
      expect(after.falling).toEqual(spawnFalling(after.board, direction))
      expect(after.timeLeft).toBe(game.timeLeft)
      expect(after.elapsed).toBe(0)
    },
  )

  it.each(approaches)(
    'advances one step, rejects retreat, and follows the lateral surface for $direction',
    ({ direction, spawn }) => {
      const game = changeFallDirection(createFallingGame(42), direction)
      const advanced = moveInDirection(game, direction)
      expect(
        Math.abs(advanced.falling!.q - spawn.q) + Math.abs(advanced.falling!.r - spawn.r),
      ).toBe(1)
      expect(advanced.board).toBe(game.board)
      expect(advanced.timeLeft).toBe(game.timeLeft)
      expect(moveInDirection(game, oppositeDirection(direction))).toBe(game)
      const horizontalFall = direction === Direction.East || direction === Direction.West
      const lateral = moveInDirection(game, horizontalFall ? Direction.North : Direction.East)
      expect(lateral.falling).toEqual(
        horizontalFall
          ? { q: Math.sign(spawn.q) * FALL_DISTANCE, r: -1 }
          : { q: 1, r: Math.sign(spawn.r) * FALL_DISTANCE },
      )
    },
  )

  it('places only the first reachable square, never passes through an obstruction', () => {
    const game = createFallingGame(42)
    const board = withTile(game.board, {
      coord: { q: 0, r: -5 },
      quadrants: ['grass', 'grass', 'grass', 'grass'],
    })
    const after = hardDrop({ ...game, board })
    expect(after.lastPlacement?.coord).toEqual({ q: 0, r: -6 })
    expect(tileCount(after.board)).toBe(tileCount(board) + 1)
  })

  it('refuses a lateral lane with all of its blockers behind the falling tile', () => {
    const game = { ...createFallingGame(42), falling: { q: 0, r: 2 } }
    expect(moveFalling(game, 1)).toBe(game)
  })

  it('resets the cadence after a manual step and locks on the next blocked step', () => {
    const game = tickFallingGame(createFallingGame(42), 0.3)
    const advanced = advanceFalling(game)
    expect(advanced.fallElapsed).toBe(0)
    expect(tickFallingGame(advanced, 0.5).falling).toEqual(advanced.falling)
    const near = { ...advanced, falling: { q: 0, r: -2 } }
    expect(advanceFalling(near).lastPlacement?.coord).toEqual(near.falling)
  })

  it('preserves the clock, score, board and rotated tile when changing arrival sides', () => {
    const initial = createFallingGame(42)
    const game = { ...initial, ...rotateCurrent(initial, 1), fallElapsed: 0.4 }
    const changed = changeFallDirection(game, Direction.East)
    expect(changed.board).toBe(game.board)
    expect(changed.current).toBe(game.current)
    expect(changed).toMatchObject({
      rotation: 1,
      remaining: game.remaining,
      score: game.score,
      timeLeft: game.timeLeft,
      fallElapsed: 0.4,
    })
    expect(changeFallDirection(changed, Direction.East)).toBe(changed)
  })
})

describe('constant remaining distance over uneven stacks', () => {
  const directions = [Direction.North, Direction.East, Direction.South, Direction.West]

  function surface(direction: Direction, heights: number[]): Board {
    const axis = laneAxis(direction)
    const delta = directionOffset(direction)
    let board: Board = {}
    heights.forEach((height, lane) => {
      for (let level = 0; level <= height; level++) {
        const coord =
          axis === 'q' ? { q: lane, r: -delta.r * level } : { q: -delta.q * level, r: lane }
        board = withTile(board, { coord, quadrants: ['grass', 'grass', 'grass', 'grass'] })
      }
    })
    return board
  }

  it.each(directions)(
    'keeps five squares over heights 1, 3 and 2, then around a corner (%s)',
    (direction) => {
      const board = surface(direction, [1, 3, 2])
      const axis = laneAxis(direction)
      const forward = axis === 'q' ? 'r' : 'q'
      const sign = directionOffset(direction)[forward]
      let game: FallingGameState = {
        ...createFallingGame(42),
        board,
        fallDirection: direction,
        falling: spawnFalling(board, direction, 0),
      }
      game = tickFallingGame(game, FALL_INTERVAL * 5 + 0.4)
      expect(game.falling![forward]).toBe(-sign * 6)
      game = moveFalling(game, 1)
      expect(game.falling![forward]).toBe(-sign * 8)
      game = moveFalling(game, 2)
      expect(game.falling![forward]).toBe(-sign * 7)
      game = moveFalling(game, 3)
      expect(game.fallDirection).not.toBe(direction)
      const target = landingPosition(game)!
      expect(Math.abs(target.q - game.falling!.q) + Math.abs(target.r - game.falling!.r)).toBe(4)
      expect(game.fallElapsed).toBeCloseTo(0.4)
      const beforeLock = tickFallingGame(game, FALL_INTERVAL * 5 - 0.41)
      expect(beforeLock.board).toBe(board)
      const locked = tickFallingGame(beforeLock, 0.01)
      expect(locked.lastPlacement?.coord).toEqual(target)
    },
  )

  it.each(directions)(
    'spawns on the last lane and clears neighbouring twenty-high stacks (%s)',
    (direction) => {
      const board = surface(direction, [1, 20, 2])
      const axis = laneAxis(direction)
      const forward = axis === 'q' ? 'r' : 'q'
      const sign = directionOffset(direction)[forward]
      const game = {
        ...createFallingGame(42),
        board,
        fallDirection: direction,
        falling: spawnFalling(board, direction, 0),
      }
      const next = hardDrop(game)
      expect(next.falling![axis]).toBe(0)
      expect(next.falling![forward]).toBe(-sign * 12)
      const overTallStack = moveFalling(next, 1)
      expect(overTallStack.falling![forward]).toBe(-sign * 30)
      expect(isOccupied(overTallStack.board, overTallStack.falling!)).toBe(false)
      expect(landingPosition(overTallStack)![forward]).toBe(-sign * 21)
      expect(moveFalling(overTallStack, 2).falling![forward]).toBe(-sign * 12)
    },
  )

  it('cannot gain fall time by repeatedly switching between tall and short columns', () => {
    const board = surface(Direction.South, [1, 20, 2])
    let game = tickFallingGame(
      {
        ...createFallingGame(42),
        board,
        falling: spawnFalling(board, Direction.South, 0),
      },
      FALL_INTERVAL * 8 + 0.3,
    )
    for (let i = 0; i < 50; i++) {
      game = moveFalling(moveFalling(game, 2), 0)
    }
    expect(game.falling).toEqual({ q: 0, r: -3 })
    expect(game.fallElapsed).toBeCloseTo(0.3)
    expect(tickFallingGame(game, FALL_INTERVAL * 2 - 0.3).lastPlacement?.coord).toEqual({
      q: 0,
      r: -2,
    })
  })
})
