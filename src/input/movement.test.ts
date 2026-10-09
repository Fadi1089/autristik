import { describe, expect, it } from 'vitest'
import { Direction } from '../game/coords'
import { screenToWorldDirection } from './movement'

describe('screen-relative movement', () => {
  it('maps straight onto the grid with the default camera', () => {
    expect(screenToWorldDirection('up', 0)).toBe(Direction.North)
    expect(screenToWorldDirection('right', 0)).toBe(Direction.East)
    expect(screenToWorldDirection('down', 0)).toBe(Direction.South)
    expect(screenToWorldDirection('left', 0)).toBe(Direction.West)
  })

  it('follows the camera once it has pivoted', () => {
    // Camera east of the board looking west: up on screen is west, right is north.
    expect(screenToWorldDirection('up', Math.PI / 2)).toBe(Direction.West)
    expect(screenToWorldDirection('right', Math.PI / 2)).toBe(Direction.North)
    expect(screenToWorldDirection('up', Math.PI)).toBe(Direction.South)
    expect(screenToWorldDirection('up', -Math.PI / 2)).toBe(Direction.East)
  })

  it('snaps to the nearest quarter turn', () => {
    expect(screenToWorldDirection('up', 0.6)).toBe(Direction.North)
    expect(screenToWorldDirection('up', 0.9)).toBe(Direction.West)
  })
})
