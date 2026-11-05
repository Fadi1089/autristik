import { describe, expect, it } from 'vitest'
import { coord, Direction } from '../game/coords'
import type { Coord } from '../game/coords'
import type { Route } from '../game/routes'
import { appearOrder, distanceToRoad, pieceFor, quarterTurn, roadCells } from './roadPieces'

const N = 1 << Direction.North
const E = 1 << Direction.East
const S = 1 << Direction.South
const W = 1 << Direction.West

const route = (...path: [number, number][]): Route => ({
  fromCityId: 0,
  toCityId: 1,
  path: path.map(([q, r]): Coord => coord(q, r)),
  traversedCoords: path.slice(1, -1).map(([q, r]): Coord => coord(q, r)),
})

describe('quarterTurn', () => {
  it('turns east to north, north to west, west to south and south to east', () => {
    expect(quarterTurn(E)).toBe(N)
    expect(quarterTurn(N)).toBe(W)
    expect(quarterTurn(W)).toBe(S)
    expect(quarterTurn(S)).toBe(E)
  })
})

describe('pieceFor', () => {
  it('lays a straight along either axis', () => {
    expect(pieceFor(N | S)).toEqual({ piece: 'straight', turns: 0 })
    expect(pieceFor(E | W)).toEqual({ piece: 'straight', turns: 1 })
  })

  it('turns the turn round to each corner', () => {
    expect(pieceFor(S | E)).toEqual({ piece: 'turn', turns: 0 })
    expect(pieceFor(N | E)).toEqual({ piece: 'turn', turns: 1 })
    expect(pieceFor(N | W)).toEqual({ piece: 'turn', turns: 2 })
    expect(pieceFor(S | W)).toEqual({ piece: 'turn', turns: 3 })
  })

  it('meets three edges with a T and four with a cross', () => {
    expect(pieceFor(N | E | S)).toEqual({ piece: 'tee', turns: 0 })
    expect(pieceFor(W | N | E)).toEqual({ piece: 'tee', turns: 1 })
    expect(pieceFor(N | E | S | W)).toEqual({ piece: 'cross', turns: 0 })
  })
})

describe('roadCells', () => {
  it('leaves out the city squares at either end', () => {
    const cells = roadCells([route([0, 0], [1, 0], [2, 0], [2, 1], [2, 2])])
    expect(cells.map((c) => [c.key, c.piece, c.turns])).toEqual([
      ['1,0', 'straight', 1],
      ['2,0', 'turn', 3],
      ['2,1', 'straight', 0],
    ])
    expect(cells[0]).toMatchObject({ from: Direction.West, to: Direction.East })
  })

  it('joins roads sharing a cell into a T or a cross', () => {
    const cells = roadCells([route([0, 1], [1, 1], [2, 1]), route([1, 3], [1, 2], [1, 1], [1, 0])])
    expect(cells.find((c) => c.key === '1,1')).toMatchObject({ piece: 'cross' })
    const tee = roadCells([route([0, 1], [1, 1], [2, 1]), route([1, 2], [1, 1], [2, 1])])
    expect(tee.find((c) => c.key === '1,1')).toMatchObject({ piece: 'tee', turns: 3 })
  })
})

describe('appearOrder', () => {
  it('counts the new cells along each road, from its first city', () => {
    const routes = [route([0, 0], [1, 0], [2, 0], [3, 0], [4, 0])]
    expect([...appearOrder(routes, () => true)]).toEqual([
      ['1,0', 0],
      ['2,0', 1],
      ['3,0', 2],
    ])
    expect([...appearOrder(routes, (key) => key !== '1,0')]).toEqual([
      ['2,0', 0],
      ['3,0', 1],
    ])
  })
})

describe('distanceToRoad', () => {
  it('measures across a straight road', () => {
    expect(distanceToRoad(E | W, 0.3, 0.2)).toBeCloseTo(0.2)
    expect(distanceToRoad(N | S, 0.3, -0.4)).toBeCloseTo(0.3)
  })

  it('measures from the bend of a turn, which keeps clear of the far corner', () => {
    // South and east: a quarter circle round the south-east corner (0.5, 0.5).
    expect(distanceToRoad(S | E, 0.5 - Math.SQRT1_2 / 2, 0.5 - Math.SQRT1_2 / 2)).toBeCloseTo(0)
    expect(distanceToRoad(S | E, -0.4, -0.4)).toBeGreaterThan(0.6)
  })

  it('measures to the nearest arm of a T, and only as far as its edge', () => {
    expect(distanceToRoad(N | E | S, -0.3, 0.1)).toBeCloseTo(0.3)
    expect(distanceToRoad(N | E | S, -0.3, -0.45)).toBeCloseTo(0.3)
    expect(distanceToRoad(N | E | S, 0.3, -0.3)).toBeCloseTo(0.3)
  })
})
