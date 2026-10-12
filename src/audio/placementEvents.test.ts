import { describe, expect, it } from 'vitest'
import { Direction } from '../game/coords'
import {
  advanceFalling,
  createFallingGame,
  FALL_INTERVAL,
  hardDrop,
  moveInDirection,
  tickFallingGame,
} from '../game/falling'
import { rotateCurrent } from '../game/game'
import { isNewPlacement } from './placementEvents'

describe('placement sound events', () => {
  it('recognizes manual and automatic placements, including the final tile', () => {
    const before = { ...createFallingGame(42), menuOpen: false }
    expect(isNewPlacement({ ...hardDrop(before), menuOpen: false }, before)).toBe(true)
    expect(
      isNewPlacement({ ...tickFallingGame(before, FALL_INTERVAL * 11), menuOpen: false }, before),
    ).toBe(true)
    let advancing = before
    for (let i = 0; i < 10; i++) advancing = { ...advanceFalling(advancing), menuOpen: false }
    expect(isNewPlacement(advancing, before)).toBe(true)
    const last = { ...createFallingGame(42, 1), menuOpen: false }
    const placed = { ...hardDrop(last), menuOpen: false }
    expect(placed.current).toBeNull()
    expect(isNewPlacement(placed, last)).toBe(true)
  })

  it('ignores motion, rotation, pause, restart and unchanged last placement', () => {
    const before = { ...createFallingGame(42), menuOpen: false }
    for (const state of [
      moveInDirection(before, Direction.East),
      rotateCurrent(before, 1),
      tickFallingGame(before, 0.3),
    ])
      expect(isNewPlacement({ ...state, menuOpen: false }, before)).toBe(false)
    const placed = { ...hardDrop(before), menuOpen: false }
    expect(isNewPlacement({ ...placed, menuOpen: true }, placed)).toBe(false)
    expect(isNewPlacement(before, placed)).toBe(false)
    expect(isNewPlacement(placed, placed)).toBe(false)
    expect(isNewPlacement(placed, { ...before, menuOpen: true })).toBe(false)
  })
})
