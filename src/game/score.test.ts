import { describe, expect, it } from 'vitest'
import { EMPTY_BOARD, withPiece } from './board'
import type { Board } from './board'
import { coord } from './coords'
import { isSurrounded, scorePlacement } from './score'
import type { Square, Terrain } from './tiles'

const sq = (q: number, r: number, terrain: Terrain): Square => ({ coord: coord(q, r), terrain })

/** Lays `squares` as one piece and scores it against the board before. */
function lay(board: Board, squares: Square[]) {
  const after = withPiece(board, squares)
  return { after, score: scorePlacement(board, after, squares) }
}

/** An O piece of one biome on (0,0)–(1,1). */
const square = (terrain: Terrain) => [
  sq(0, 0, terrain),
  sq(1, 0, terrain),
  sq(0, 1, terrain),
  sq(1, 1, terrain),
]

/** Pieces covering every cell beside the O: an I above, an I below and an O on each side. */
const ring = (terrain: Terrain): Square[][] => [
  [sq(-1, -1, terrain), sq(0, -1, terrain), sq(1, -1, terrain), sq(2, -1, terrain)],
  [sq(-1, 2, terrain), sq(0, 2, terrain), sq(1, 2, terrain), sq(2, 2, terrain)],
  [sq(-1, 0, terrain), sq(-1, 1, terrain), sq(-2, 0, terrain), sq(-2, 1, terrain)],
  [sq(2, 0, terrain), sq(2, 1, terrain), sq(3, 0, terrain), sq(3, 1, terrain)],
]

describe('scorePlacement', () => {
  it('gives one point for a piece that matches nothing', () => {
    const { score } = lay(EMPTY_BOARD, square('red'))
    expect(score).toEqual({ connections: 0, surrounded: [], points: 1 })
  })

  it('adds one per edge against its own biome on another piece, not inside the piece', () => {
    const board = withPiece(EMPTY_BOARD, [sq(0, 1, 'red'), sq(1, 1, 'green')])
    // (0,0) red meets (0,1) red; (1,0) red meets (1,1) green; red-red inside doesn't count.
    const { score } = lay(board, [sq(0, 0, 'red'), sq(1, 0, 'red')])
    expect(score.connections).toBe(1)
    expect(score.points).toBe(2)
  })

  it('adds ten when the piece closes in another piece with its own biome', () => {
    let board = withPiece(EMPTY_BOARD, square('green'))
    const [top, bottom, left, right] = ring('green')
    for (const piece of [top!, bottom!, left!]) board = lay(board, piece).after
    const { after, score } = lay(board, right!)
    expect(isSurrounded(after, 0)).toBe(true)
    expect(score.surrounded).toEqual([0])
    // 1 for the piece; 2 edges against the O, 1 against the top and 1 against the bottom; 10.
    expect(score.points).toBe(1 + 4 + 10)
  })

  it('adds ten when the piece itself drops into a gap that matches all round', () => {
    let board = EMPTY_BOARD
    for (const piece of ring('blue')) board = lay(board, piece).after
    const { score } = lay(board, square('blue'))
    // The O's id is the next one after the four ring pieces.
    expect(score.surrounded).toEqual([4])
    expect(score.points).toBe(1 + 8 + 10)
  })

  it('needs every outer edge to match', () => {
    let board = withPiece(EMPTY_BOARD, square('green'))
    const [top, bottom, left, right] = ring('green')
    for (const piece of [top!, bottom!, left!]) board = lay(board, piece).after
    const { after, score } = lay(
      board,
      right!.map((s, i) => (i === 1 ? { ...s, terrain: 'red' } : s)),
    )
    expect(isSurrounded(after, 0)).toBe(false)
    expect(score.surrounded).toEqual([])
  })

  it('never scores the same surrounded piece twice', () => {
    let board = EMPTY_BOARD
    for (const piece of ring('blue')) board = lay(board, piece).after
    board = lay(board, square('blue')).after
    const { score } = lay(board, [sq(4, 0, 'blue')])
    expect(score.surrounded).toEqual([])
    expect(isSurrounded(board, 4)).toBe(true)
  })
})
