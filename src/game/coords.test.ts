import { describe, expect, it } from 'vitest'
import {
  coord,
  coordKey,
  Direction,
  DIRECTIONS,
  manhattanDistance,
  neighbour,
  neighbours,
  oppositeDirection,
  parseCoordKey,
} from './coords'

describe('square neighbours', () => {
  const origin = coord(0, 0)

  it('steps one square in each direction (north is -r, east is +q)', () => {
    expect(neighbour(origin, Direction.North)).toEqual({ q: 0, r: -1 })
    expect(neighbour(origin, Direction.East)).toEqual({ q: 1, r: 0 })
    expect(neighbour(origin, Direction.South)).toEqual({ q: 0, r: 1 })
    expect(neighbour(origin, Direction.West)).toEqual({ q: -1, r: 0 })
  })

  it('returns exactly four distinct edge neighbours, one step away, in clockwise order', () => {
    const c = coord(3, -2)
    const result = neighbours(c)
    expect(result).toEqual([coord(3, -3), coord(4, -2), coord(3, -1), coord(2, -2)])
    expect(new Set(result.map(coordKey)).size).toBe(4)
    for (const n of result) expect(manhattanDistance(c, n)).toBe(1)
  })

  it('does not include diagonals', () => {
    const keys = neighbours(origin).map(coordKey)
    expect(keys).not.toContain(coordKey(coord(1, 1)))
    expect(keys).not.toContain(coordKey(coord(-1, -1)))
  })

  it('pairs each direction with its opposite, and stepping there and back returns home', () => {
    expect(oppositeDirection(Direction.North)).toBe(Direction.South)
    expect(oppositeDirection(Direction.East)).toBe(Direction.West)
    for (const d of DIRECTIONS) {
      expect(oppositeDirection(oppositeDirection(d))).toBe(d)
      expect(neighbour(neighbour(origin, d), oppositeDirection(d))).toEqual(origin)
    }
  })

  it('round-trips coordinate keys, including negatives', () => {
    for (const c of [coord(0, 0), coord(-4, 7), coord(12, -1)]) {
      expect(parseCoordKey(coordKey(c))).toEqual(c)
    }
    expect(() => parseCoordKey('nope')).toThrow()
  })
})
