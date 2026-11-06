import { describe, expect, it } from 'vitest'
import { boardSquares, EMPTY_BOARD, getSquare, withPiece } from './board'
import type { Board } from './board'
import type { Coord } from './coords'
import {
  canPlaceCurrent,
  createGame,
  currentAnchors,
  endReason,
  isGameOver,
  isStuck,
  placeCurrent,
  resetBoard,
  skipCurrent,
  upcomingTiles,
} from './game'
import type { GameState } from './game'
import { canPlace, hasRoom } from './matching'
import { inBounds, PERFORMANCE_BOUNDS, PERFORMANCE_PIECES } from './modes'
import type { GridBounds } from './modes'
import { createRng } from './random'
import { parseSave, saveText } from './save'
import { DEFAULT_BIOME_PROBABILITIES, pickShape, SHAPES } from './tiles'
import type { BiomeProbabilities, Square } from './tiles'

/** Places the piece in hand wherever it first fits, or skips it if it fits nowhere. */
function advance(game: GameState): GameState {
  if (isStuck(game)) return skipCurrent(game)
  for (const rotation of [0, 1, 2, 3] as const) {
    const at = currentAnchors(game, rotation)[0]
    if (at) return placeCurrent({ ...game, rotation }, at)
  }
  throw new Error('expected somewhere to place the piece')
}

/** A cell well away from everything on the board. */
const FAR: Coord = { q: 40, r: 40 }

describe('creation mode', () => {
  it('starts with no score and lays a piece anywhere free, without contact', () => {
    const game = createGame(3, undefined, 'creation')
    expect(game.score).toBe(0)
    expect(game.piecesLeft).toBeUndefined()
    expect(canPlaceCurrent(game, FAR)).toBe(true)
    const next = placeCurrent(game, FAR)
    expect(getSquare(next.board, FAR)).toBeDefined()
    expect(next.score).toBe(0)
    expect(next.lastPlacement!.score.points).toBe(0)
  })

  it('lets any biome go against blue, but never onto a taken cell', () => {
    const lake = withPiece(EMPTY_BOARD, [{ coord: { q: 0, r: 0 }, terrain: 'blue' }])
    const red: Square[] = [{ coord: { q: 1, r: 0 }, terrain: 'red' }]
    expect(canPlace(lake, red)).toBe(false)
    expect(canPlace(lake, red, { free: true, bounds: null })).toBe(true)
    expect(
      canPlace(lake, [{ coord: { q: 0, r: 0 }, terrain: 'blue' }], { free: true, bounds: null }),
    ).toBe(false)
  })

  it('keeps no score and proposes no bonus objective, however long it goes', () => {
    let game = createGame(11, undefined, 'creation')
    for (let i = 0; i < 25; i++) game = advance(game)
    expect(game.score).toBe(0)
    expect(game.bonus?.objective).toBeNull()
    expect(game.bonus?.placements).toBe(0)
    expect(isGameOver(game)).toBe(false)
  })
})

describe('performance mode', () => {
  it('deals fifty pieces on a ten by twenty grid, starting inside it', () => {
    const game = createGame(5, undefined, 'performance')
    expect(game.piecesLeft).toBe(PERFORMANCE_PIECES)
    const { minQ, maxQ, minR, maxR } = PERFORMANCE_BOUNDS
    expect([maxQ - minQ + 1, maxR - minR + 1]).toEqual([10, 20])
    for (const square of boardSquares(game.board))
      expect(inBounds(PERFORMANCE_BOUNDS, square.coord)).toBe(true)
    expect(game.score).toBeGreaterThan(0)
  })

  it('refuses a piece that would hang off the grid', () => {
    const game = createGame(5, undefined, 'performance')
    for (const rotation of [0, 1, 2, 3] as const)
      for (const at of currentAnchors(game, rotation))
        for (const square of placeCurrent({ ...game, rotation }, at).lastPlacement!.squares)
          expect(inBounds(PERFORMANCE_BOUNDS, square.coord)).toBe(true)
    const outside = { q: PERFORMANCE_BOUNDS.maxQ + 1, r: 0 }
    expect(placeCurrent(game, outside)).toBe(game)
  })

  it('counts each piece down, placed or skipped, and shows no more than are left', () => {
    let game = createGame(8, undefined, 'performance')
    game = advance(game)
    expect(game.piecesLeft).toBe(PERFORMANCE_PIECES - 1)
    expect(upcomingTiles({ ...game, piecesLeft: 3 })).toHaveLength(2)
    expect(upcomingTiles({ ...game, piecesLeft: 1 })).toHaveLength(0)
  })

  it('ends once every piece is used, with nothing left in hand', () => {
    let game = createGame(21, undefined, 'performance')
    let moves = 0
    while (!isGameOver(game)) {
      game = advance(game)
      moves++
    }
    expect(game.current).toBeNull()
    expect(moves).toBeLessThanOrEqual(PERFORMANCE_PIECES)
    if (endReason(game) === 'pieces') expect(moves).toBe(PERFORMANCE_PIECES)
    else expect(hasRoom(game.board, PERFORMANCE_BOUNDS)).toBe(false)
    // The last placement settles the open objective without proposing another.
    expect(game.bonus?.objective).toBeNull()
    expect(placeCurrent(game, { q: 0, r: 0 })).toBe(game)
    expect(skipCurrent(game)).toBe(game)
  })

  it('ends on the last piece', () => {
    const game = { ...createGame(4, undefined, 'performance'), piecesLeft: 1 }
    const next = advance(game)
    expect(next.current).toBeNull()
    expect(next.piecesLeft).toBe(0)
    expect(endReason(next)).toBe('pieces')
  })

  it('resetting the grid deals the fifty pieces again, even after the end', () => {
    const over = { ...createGame(4, undefined, 'performance'), current: null, piecesLeft: 0 }
    const again = resetBoard(over)
    expect(again.piecesLeft).toBe(PERFORMANCE_PIECES)
    expect(again.current).not.toBeNull()
    expect(isGameOver(again)).toBe(false)
  })

  it('saves and loads a game in progress and a finished one', () => {
    let game = createGame(9, undefined, 'performance')
    for (let i = 0; i < 12; i++) game = advance(game)
    const loaded = parseSave(saveText(game))
    expect(loaded.ok && loaded.game).toMatchObject({
      mode: 'performance',
      piecesLeft: game.piecesLeft,
      score: game.score,
    })
    const done = { ...game, current: null, piecesLeft: 0 }
    expect(parseSave(saveText(done)).ok).toBe(true)
  })

  it('refuses saves that break the grid or the piece count', () => {
    const game = createGame(9, undefined, 'performance')
    const data = JSON.parse(saveText(game))
    const offGrid = { ...data, board: [...data.board, { q: 30, r: 0, terrain: 'red', piece: 99 }] }
    expect(parseSave(JSON.stringify(offGrid))).toMatchObject({ ok: false })
    expect(parseSave(JSON.stringify({ ...data, piecesLeft: 51 }))).toMatchObject({ ok: false })
    const score = JSON.parse(saveText(createGame(9)))
    expect(parseSave(JSON.stringify({ ...score, piecesLeft: 10 }))).toMatchObject({ ok: false })
    expect(parseSave(JSON.stringify({ ...score, mode: 'arcade' }))).toMatchObject({ ok: false })
  })
})

describe('room left on a bounded grid', () => {
  const SMALL: GridBounds = { minQ: 0, maxQ: 3, minR: 0, maxR: 1 }
  const fill = (coords: Coord[]): Board =>
    coords.reduce((board, coord) => withPiece(board, [{ coord, terrain: 'black' }]), EMPTY_BOARD)

  it('needs four free cells joined together beside the board', () => {
    // Top row taken: the bottom row is four free cells in a line.
    const top = fill([0, 1, 2, 3].map((q) => ({ q, r: 0 })))
    expect(hasRoom(top, SMALL)).toBe(true)
    // One more taken in the bottom row splits what is left below four.
    expect(hasRoom(fill([...[0, 1, 2, 3].map((q) => ({ q, r: 0 })), { q: 1, r: 1 }]), SMALL)).toBe(
      false,
    )
    expect(hasRoom(top, null)).toBe(true)
  })
})

describe('shape weights', () => {
  it('draws exactly as before when every shape is equally likely', () => {
    const a = createRng(77)
    const b = createRng(77)
    for (let i = 0; i < 200; i++)
      expect(pickShape(a, DEFAULT_BIOME_PROBABILITIES.shapeWeights)).toBe(
        SHAPES[Math.floor(b.next() * SHAPES.length)],
      )
  })

  it('never draws a shape weighted 0, and draws in proportion to the weights', () => {
    const odds: BiomeProbabilities = {
      ...DEFAULT_BIOME_PROBABILITIES,
      shapeWeights: { I: 3, O: 1, T: 0, S: 0, Z: 0, J: 0, L: 0 },
    }
    const rng = createRng(5)
    const counts = { I: 0, O: 0 } as Record<string, number>
    for (let i = 0; i < 4000; i++) {
      const shape = pickShape(rng, odds.shapeWeights)
      counts[shape] = (counts[shape] ?? 0) + 1
    }
    expect(Object.keys(counts).sort()).toEqual(['I', 'O'])
    expect(counts.I! / 4000).toBeCloseTo(0.75, 1)
    const upcoming = upcomingTiles({ seed: 1, biomeProbabilities: odds }, 30)
    expect(upcoming.every((piece) => piece.shape === 'I' || piece.shape === 'O')).toBe(true)
  })

  it('keeps the shape weights through a save', () => {
    const odds: BiomeProbabilities = {
      ...DEFAULT_BIOME_PROBABILITIES,
      shapeWeights: { I: 0, O: 10, T: 20, S: 0, Z: 0, J: 5, L: 5 },
    }
    const loaded = parseSave(saveText(createGame(2, odds)))
    expect(loaded.ok && loaded.game.biomeProbabilities?.shapeWeights).toEqual(odds.shapeWeights)
    const data = JSON.parse(saveText(createGame(2, odds)))
    data.biomeProbabilities.shapeWeights = { I: 0, O: 0, T: 0, S: 0, Z: 0, J: 0, L: 0 }
    expect(parseSave(JSON.stringify(data))).toMatchObject({ ok: false })
  })
})

describe('the end of a performance game', () => {
  it('saves and loads every finished game of a few seeds', () => {
    for (const seed of [1, 2, 3, 21, 99]) {
      let game = createGame(seed, undefined, 'performance')
      while (!isGameOver(game)) game = advance(game)
      const loaded = parseSave(saveText(game))
      expect(loaded.ok, `seed ${seed}: ${loaded.ok || loaded.error}`).toBe(true)
      expect(loaded.ok && endReason(loaded.game)).toBe(endReason(game))
    }
  })
})
