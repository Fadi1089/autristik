import { describe, expect, it } from 'vitest'
import { pieceCount } from './board'
import { coordKey } from './coords'
import type { Coord } from './coords'
import {
  canPlaceCurrent,
  createGame,
  currentSquares,
  isGameOver,
  placeCurrent,
  previewPlacement,
  resetBoard,
  upcomingTiles,
  VISIBLE_NEXT,
} from './game'
import { placementCandidates } from './matching'

/** The first open cell where the piece in hand fits. */
function firstFit(game: ReturnType<typeof createGame>): Coord {
  for (const c of placementCandidates(game.board)) if (canPlaceCurrent(game, c)) return c
  throw new Error('expected somewhere to place the piece')
}

describe('game flow', () => {
  it('is deterministic for a given seed', () => {
    expect(createGame(42)).toEqual(createGame(42))
  })

  it('placing a piece adds it to the board and draws the next one', () => {
    const game = createGame(7)
    const target = firstFit(game)

    const preview = previewPlacement(game, target)
    const next = placeCurrent(game, target)

    expect(preview).not.toBeNull()
    for (const square of currentSquares(game, target)!)
      expect(next.board[coordKey(square.coord)]?.terrain).toBe(square.terrain)
    expect(pieceCount(next.board)).toBe(pieceCount(game.board) + 1)
    expect(next.current).not.toBeNull()
  })

  it('ignores invalid placements', () => {
    const game = createGame(1)
    expect(placeCurrent(game, { q: 0, r: 0 })).toBe(game) // overlaps the starting piece
    expect(placeCurrent(game, { q: 9, r: 9 })).toBe(game) // detached
  })

  it('starts from a single tetromino at the origin', () => {
    const { board } = createGame(5)
    expect(pieceCount(board)).toBe(1)
    expect(Object.keys(board)).toHaveLength(4)
    expect(board[coordKey({ q: 0, r: 0 })]).toBeDefined()
  })

  it('is not game over in standard play', () => {
    const game = createGame(3)
    expect(isGameOver(game)).toBe(false)
  })
})

describe('queue and grid reset', () => {
  it('shows the next three tiles, which are exactly the ones drawn next', () => {
    let game = createGame(11)
    for (let i = 0; i < 10; i++) {
      const upcoming = upcomingTiles(game)
      expect(upcoming).toHaveLength(VISIBLE_NEXT)
      game = placeCurrent(game, firstFit(game))
      expect(game.current).toEqual(upcoming[0])
      expect(upcomingTiles(game).slice(0, 2)).toEqual(upcoming.slice(1))
    }
  })

  it('resets the grid to a starting island without touching the upcoming pieces', () => {
    const game = placeCurrent(createGame(7), firstFit(createGame(7)))
    const reset = resetBoard(game)
    expect(pieceCount(reset.board)).toBe(1)
    expect(reset).toMatchObject({
      current: game.current,
      seed: game.seed,
    })
    expect(upcomingTiles(reset)).toEqual(upcomingTiles(game))
  })
})
