import { describe, expect, it } from 'vitest'
import { nextCameraSide } from './camera'

describe('aligned camera sides', () => {
  it.each([-2, -1, 0, 1, 2])('moves exactly one side from aligned heading %s', (side) => {
    const heading = (side * Math.PI) / 2
    expect(nextCameraSide(heading, -1)).toBe(((side - 1) * Math.PI) / 2)
    expect(nextCameraSide(heading, 1)).toBe(((side + 1) * Math.PI) / 2)
  })

  it('selects the next aligned side in the requested direction after free rotation', () => {
    expect(nextCameraSide(0.3, -1)).toBe(0)
    expect(nextCameraSide(0.3, 1)).toBe(Math.PI / 2)
    expect(nextCameraSide(-0.3, -1)).toBe(-Math.PI / 2)
    expect(nextCameraSide(-0.3, 1)).toBe(0)
    expect(nextCameraSide(Math.PI - 0.3, 1)).toBe(Math.PI)
  })

  it('tolerates small animation and view-publication errors without choosing the same side again', () => {
    expect(nextCameraSide(Math.PI / 2 - 0.001, 1)).toBe(Math.PI)
    expect(nextCameraSide(Math.PI / 2 + 0.001, -1)).toBe(0)
  })
})
