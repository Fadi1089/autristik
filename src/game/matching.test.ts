import { describe, expect, it } from 'vitest'
import { EMPTY_BOARD, withTile } from './board'
import type { Board } from './board'
import { coord, coordKey, Direction, DIRECTIONS, oppositeDirection } from './coords'
import type { Coord } from './coords'
import {
  canPlace,
  evaluatePlacement,
  nearestCandidate,
  placementCandidates,
  terrainsMatch,
} from './matching'
import { scorePlacement } from './scoring'
import { facingQuadrants, Quadrant, rotateQuadrants, sideQuadrants } from './tiles'
import type { Quadrants, Terrain } from './tiles'

const uniform = (t: Terrain): Quadrants => [t, t, t, t]

function boardOf(...tiles: [Coord, Quadrants][]): Board {
  return tiles.reduce<Board>(
    (b, [c, quadrants]) => withTile(b, { coord: c, quadrants }),
    EMPTY_BOARD,
  )
}

describe('quadrants', () => {
  // NW grass, NE forest, SE field, SW water
  const tile: Quadrants = ['grass', 'forest', 'field', 'water']

  it('rotates clockwise: the north-west square moves to the north-east corner', () => {
    expect(rotateQuadrants(tile, 1)).toEqual(['water', 'grass', 'forest', 'field'])
    expect(rotateQuadrants(tile, 2)).toEqual(['field', 'water', 'grass', 'forest'])
  })

  it('wraps around for full and negative turns', () => {
    expect(rotateQuadrants(tile, 4)).toEqual(tile)
    expect(rotateQuadrants(tile, -1)).toEqual(rotateQuadrants(tile, 3))
  })

  it('lists the two squares along each side', () => {
    expect(sideQuadrants(Direction.North)).toEqual([Quadrant.NorthWest, Quadrant.NorthEast])
    expect(sideQuadrants(Direction.East)).toEqual([Quadrant.NorthEast, Quadrant.SouthEast])
    expect(sideQuadrants(Direction.South)).toEqual([Quadrant.SouthEast, Quadrant.SouthWest])
    expect(sideQuadrants(Direction.West)).toEqual([Quadrant.SouthWest, Quadrant.NorthWest])
  })

  it('pairs each square on a side with the neighbour square directly across the seam', () => {
    expect(facingQuadrants(Direction.North)).toEqual([
      [Quadrant.NorthWest, Quadrant.SouthWest],
      [Quadrant.NorthEast, Quadrant.SouthEast],
    ])
    expect(facingQuadrants(Direction.East)).toEqual([
      [Quadrant.NorthEast, Quadrant.NorthWest],
      [Quadrant.SouthEast, Quadrant.SouthWest],
    ])
    // Seen from the neighbour, the same pairs come back swapped.
    for (const d of DIRECTIONS) {
      const back = facingQuadrants(oppositeDirection(d)).map(([a, b]) => [b, a])
      expect(back.sort()).toEqual([...facingQuadrants(d)].sort())
    }
  })
})

describe('square matching', () => {
  it('matches identical terrains only', () => {
    expect(terrainsMatch('forest', 'forest')).toBe(true)
    expect(terrainsMatch('forest', 'field')).toBe(false)
  })

  it('compares each half of a side with the square it touches', () => {
    // Centre tile's east side is NE forest over SE field.
    const board = boardOf([coord(0, 0), ['grass', 'forest', 'field', 'water']])
    const east = coord(1, 0)

    // Our west side is NW (touches forest) over SW (touches field).
    const good = evaluatePlacement(board, east, ['forest', 'grass', 'grass', 'field'])
    expect(good).toMatchObject({ neighbours: 1, matched: [Direction.West], mismatched: [] })
    expect(good.contacts.every((c) => c.matches)).toBe(true)

    // Upside down, the same terrains no longer line up.
    const flipped = evaluatePlacement(board, east, ['field', 'grass', 'grass', 'forest'])
    expect(flipped).toMatchObject({ matched: [], mismatched: [Direction.West] })
    expect(flipped.contacts.filter((c) => c.matches)).toHaveLength(0)
  })

  it('counts a half match as a contact but not as a matched side', () => {
    const board = boardOf([coord(0, -1), uniform('forest')])
    const result = evaluatePlacement(board, coord(0, 0), ['forest', 'grass', 'grass', 'grass'])
    expect(result.mismatched).toEqual([Direction.North])
    expect(result.contacts).toEqual([
      { direction: Direction.North, quadrant: Quadrant.NorthWest, matches: true },
      { direction: Direction.North, quadrant: Quadrant.NorthEast, matches: false },
    ])
    expect(scorePlacement(result).points).toBe(5)
  })

  it('counts matches and mismatches across several neighbours', () => {
    const board = boardOf(
      [coord(0, -1), uniform('forest')], // north
      [coord(1, 0), uniform('water')], // east
      [coord(0, 1), uniform('field')], // south
    )
    // Top row forest, bottom row field, so north and south match but east does not.
    const result = evaluatePlacement(board, coord(0, 0), ['forest', 'forest', 'field', 'field'])
    expect(result.neighbours).toBe(3)
    expect(result.contacts).toHaveLength(6)
    expect(result.matched).toEqual([Direction.North, Direction.South])
    expect(result.mismatched).toEqual([Direction.East])
    expect(result.harmonious).toBe(false)
    expect(result.perfect).toBe(false)
  })

  it('flags harmonious and perfect placements', () => {
    const ring = boardOf(
      [coord(0, -1), uniform('grass')],
      [coord(1, 0), uniform('grass')],
      [coord(0, 1), uniform('grass')],
      [coord(-1, 0), uniform('grass')],
    )
    const perfect = evaluatePlacement(ring, coord(0, 0), uniform('grass'))
    expect(perfect).toMatchObject({ neighbours: 4, harmonious: true, perfect: true })
    expect(scorePlacement(perfect)).toEqual({ points: 8 * 5 + 30, bonusTiles: 2 })

    const pair = boardOf([coord(0, -1), uniform('grass')], [coord(1, 0), uniform('grass')])
    const harmonious = evaluatePlacement(pair, coord(0, 0), uniform('grass'))
    expect(harmonious).toMatchObject({ neighbours: 2, harmonious: true, perfect: false })
  })

  it('treats a lone neighbour as neither harmonious nor perfect', () => {
    const board = boardOf([coord(0, 0), uniform('grass')])
    const result = evaluatePlacement(board, coord(0, 1), uniform('grass'))
    expect(result).toMatchObject({ neighbours: 1, harmonious: false, perfect: false })
  })
})

describe('placement rules', () => {
  const board = boardOf([coord(0, 0), uniform('grass')])

  it('only allows empty squares that touch the board side to side', () => {
    expect(canPlace(board, coord(1, 0))).toBe(true)
    expect(canPlace(board, coord(0, 0))).toBe(false) // occupied
    expect(canPlace(board, coord(1, 1))).toBe(false) // diagonal only
    expect(canPlace(board, coord(5, 5))).toBe(false) // detached
  })

  it('lists every empty neighbouring square once', () => {
    const two = withTile(board, { coord: coord(1, 0), quadrants: uniform('grass') })
    const keys = placementCandidates(two).map(coordKey)
    expect(keys).toHaveLength(6)
    expect(new Set(keys).size).toBe(6)
    expect(keys).not.toContain(coordKey(coord(0, 0)))
    expect(keys).not.toContain(coordKey(coord(1, 0)))
  })
})

describe('nearestCandidate', () => {
  it('picks the open square closest to a point', () => {
    const board = boardOf([coord(0, 0), uniform('grass')], [coord(1, 0), uniform('grass')])
    expect(nearestCandidate(board, coord(5, 0))).toEqual(coord(2, 0))
    expect(nearestCandidate(board, coord(0, -4))).toEqual(coord(0, -1))
  })

  it('offers the origin to rebuild an island emptied by a void tile', () => {
    expect(nearestCandidate(EMPTY_BOARD, coord(0, 0))).toEqual(coord(0, 0))
  })
})
