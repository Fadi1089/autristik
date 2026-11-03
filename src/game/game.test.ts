import { describe, expect, it } from 'vitest'
import { pieceCount } from './board'
import { coordKey } from './coords'
import type { Coord } from './coords'
import {
  createGame,
  currentAnchors,
  currentSquares,
  fittingRotations,
  isGameOver,
  isStuck,
  placeCurrent,
  previewPlacement,
  resetBoard,
  skipCurrent,
  upcomingTiles,
  VISIBLE_NEXT,
  withBiomeProbabilities,
} from './game'
import type { GameState } from './game'
import { EMPTY_BOARD, withPiece } from './board'
import type { BiomeProbabilities } from './tiles'

const RED_ONLY: BiomeProbabilities = {
  biomeCounts: { 1: 0, 2: 0, 3: 0, 4: 100 },
  biomeWeights: { black: 0, red: 100, green: 0, yellow: 0, blue: 0 },
}

/** The first anchor where the piece in hand fits, at any rotation. */
function firstFit(game: GameState): { at: Coord; game: GameState } {
  for (const rotation of [0, 1, 2, 3] as const) {
    const at = currentAnchors(game, rotation)[0]
    if (at) return { at, game: { ...game, rotation } }
  }
  throw new Error('expected somewhere to place the piece')
}

/** Places the piece in hand wherever it first fits, or skips it if it fits nowhere. */
function advance(game: GameState): GameState {
  if (isStuck(game)) return skipCurrent(game)
  const fit = firstFit(game)
  return placeCurrent(fit.game, fit.at)
}

describe('game flow', () => {
  it('is deterministic for a given seed', () => {
    expect(createGame(42)).toEqual(createGame(42))
  })

  it('placing a piece adds it to the board and draws the next one', () => {
    const { game, at: target } = firstFit(createGame(7))

    const preview = previewPlacement(game, target)
    const next = placeCurrent(game, target)

    expect(preview).not.toBeNull()
    for (const square of currentSquares(game, target)!)
      expect(next.board[coordKey(square.coord)]?.terrain).toBe(square.terrain)
    expect(pieceCount(next.board)).toBe(pieceCount(game.board) + 1)
    expect(next.current).not.toBeNull()
  })

  it('refuses placements that overlap or float away from the board', () => {
    const game = createGame(1)
    expect(placeCurrent(game, { q: 0, r: 0 })).toBe(game) // overlaps the starting piece
    expect(placeCurrent(game, { q: 9, r: 9 })).toBe(game) // touches nothing
  })

  it('lists the rotations that fit on a cell', () => {
    const { game, at } = firstFit(createGame(4))
    expect(fittingRotations(game, at)).toContain(game.rotation)
    expect(fittingRotations(game, { q: 9, r: 9 })).toEqual([])
  })

  it('skips a piece only when it fits nowhere', () => {
    // Only blue can be laid against an all-blue board.
    const lake: GameState = {
      ...createGame(2, RED_ONLY),
      board: withPiece(EMPTY_BOARD, [{ coord: { q: 0, r: 0 }, terrain: 'blue' }]),
      current: { shape: 'O', terrains: ['red', 'red', 'red', 'red'] },
    }
    expect(isStuck(lake)).toBe(true)
    const next = skipCurrent(lake)
    expect(next.current).toEqual(upcomingTiles(lake)[0])
    expect(next.board).toBe(lake.board)

    const shore = {
      ...lake,
      board: withPiece(lake.board, [{ coord: { q: 0, r: -1 }, terrain: 'red' }]),
    }
    expect(isStuck(shore)).toBe(false)
    expect(skipCurrent(shore)).toBe(shore)
  })

  it('starts from a single tetromino at the origin', () => {
    const { board } = createGame(5)
    expect(pieceCount(board)).toBe(1)
    expect(Object.keys(board)).toHaveLength(4)
    expect(board[coordKey({ q: 0, r: 0 })]).toBeDefined()
  })

  it('never starts on an all-blue piece unless only blue is enabled', () => {
    for (let seed = 0; seed < 200; seed++)
      expect(Object.values(createGame(seed).board).some((s) => s.terrain !== 'blue')).toBe(true)
    const BLUE_ONLY: BiomeProbabilities = {
      biomeCounts: { 1: 100, 2: 0, 3: 0, 4: 0 },
      biomeWeights: { black: 0, red: 0, green: 0, yellow: 0, blue: 100 },
    }
    expect(Object.values(createGame(1, BLUE_ONLY).board).every((s) => s.terrain === 'blue')).toBe(
      true,
    )
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
      game = advance(game)
      expect(game.current).toEqual(upcoming[0])
      expect(upcomingTiles(game).slice(0, 2)).toEqual(upcoming.slice(1))
    }
  })

  it('resets the grid to a starting island without touching the upcoming pieces', () => {
    const game = advance(createGame(7))
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
      game = advance(game)
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
    expect(advance(game).current).toEqual(upcoming[0])
  })

  it("starts at the starting piece's base point, adds each placement's points, and a reset puts it back", () => {
    let game = createGame(11)
    expect(game.score).toBe(1)
    let total = 1
    for (let i = 0; i < 8; i++) {
      game = advance(game)
      if (game.lastPlacement) total += game.lastPlacement.score.points
    }
    expect(game.score).toBe(total)
    expect(game.score).toBeGreaterThanOrEqual(4)
    expect(resetBoard(game).score).toBe(1)
  })
})
