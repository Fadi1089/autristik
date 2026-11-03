import { describe, expect, it } from 'vitest'
import { EMPTY_BOARD, isOccupied, withPiece } from '../game/board'
import { coordKey } from '../game/coords'
import { placementAnchors } from '../game/matching'
import { pieceSquares } from '../game/tiles'
import type { Tetromino } from '../game/tiles'
import { placementArea } from './placementArea'

const board = withPiece(
  EMPTY_BOARD,
  [0, 1, 2, 3].map((q) => ({ coord: { q, r: 0 }, terrain: 'green' as const })),
)
const L: Tetromino = { shape: 'L', terrains: ['green', 'green', 'green', 'green'] }

describe('placementArea', () => {
  it('covers exactly the cells of every spot where the piece fits, once each', () => {
    const area = placementArea({ board, current: L, rotation: 1 }).map(coordKey)
    const expected = new Set(
      placementAnchors(board, L, 1).flatMap((at) =>
        pieceSquares(L, 1, at).map((s) => coordKey(s.coord)),
      ),
    )
    expect(area).toHaveLength(new Set(area).size)
    expect(new Set(area)).toEqual(expected)
    expect(
      placementArea({ board, current: L, rotation: 1 }).some((c) => isOccupied(board, c)),
    ).toBe(false)
  })

  it('changes as the piece turns', () => {
    const I: Tetromino = { ...L, shape: 'I' }
    expect(placementArea({ board, current: I, rotation: 0 })).not.toEqual(
      placementArea({ board, current: I, rotation: 1 }),
    )
  })

  it('is empty when the piece fits nowhere', () => {
    const lake = withPiece(EMPTY_BOARD, [{ coord: { q: 0, r: 0 }, terrain: 'blue' }])
    const field: Tetromino = { shape: 'O', terrains: ['red', 'red', 'red', 'red'] }
    expect(placementArea({ board: lake, current: field, rotation: 0 })).toEqual([])
  })
})
