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
  withBiomeProbabilities,
} from './game'
import { placementCandidates } from './matching'
import type { BiomeProbabilities } from './tiles'

const RED_ONLY: BiomeProbabilities = {
  biomeCounts: { 1: 0, 2: 0, 3: 0, 4: 100 },
  biomeWeights: { black: 0, red: 100, green: 0, yellow: 0, blue: 0 },
}

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

  it('allows placements anywhere without overlap', () => {
    const game = createGame(1)
    expect(placeCurrent(game, { q: 0, r: 0 })).toBe(game) // overlaps the starting piece
    const detached = placeCurrent(game, { q: 9, r: 9 })
    expect(detached).not.toBe(game)
    expect(pieceCount(detached.board)).toBe(pieceCount(game.board) + 1)
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

  it('uses custom biome weights for the starting island, queue, placements and reset', () => {
    let game = createGame(11, RED_ONLY)
    expect(Object.values(game.board).every((square) => square.terrain === 'red')).toBe(true)
    expect(game.current?.terrains).toEqual(['red', 'red', 'red', 'red'])
    for (let i = 0; i < 10; i++) {
      const upcoming = upcomingTiles(game)
      expect(upcoming.every((piece) => piece.terrains.every((terrain) => terrain === 'red'))).toBe(
        true,
      )
      game = placeCurrent(game, firstFit(game))
      expect(game.current).toEqual(upcoming[0])
    }
    const reset = resetBoard(game)
    expect(Object.values(reset.board).every((square) => square.terrain === 'red')).toBe(true)
    expect(upcomingTiles(reset)).toEqual(upcomingTiles(game))
  })

  it('updates the queue prediction when biome settings change during a game', () => {
    const before = createGame(23)
    const game = withBiomeProbabilities(before, RED_ONLY)
    const upcoming = upcomingTiles(game)
    expect(upcoming.every((piece) => piece.terrains.every((terrain) => terrain === 'red'))).toBe(
      true,
    )
    expect(placeCurrent(game, firstFit(game)).current).toEqual(upcoming[0])
  })
})
