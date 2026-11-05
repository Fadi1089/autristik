import { describe, expect, it } from 'vitest'
import { boardSquares, getSquare, pieceCount } from './board'
import { coord, DIRECTIONS, neighbour } from './coords'
import {
  anchorsByRotation,
  canPlaceCurrent,
  currentSquares,
  isStuck,
  placeCurrent,
  resetBoard,
  skipCurrent,
  upcomingTiles,
} from './game'
import type { GameState } from './game'
import { findCities, routeScore } from './routes'
import { parseSave, saveText } from './save'

/** Every save in /saves, as raw text: they are read the same way the game reads a file. */
const files = import.meta.glob<string>('../../saves/*.json', {
  eager: true,
  query: '?raw',
  import: 'default',
})

function save(name: string): { game: GameState; text: string; note: string } {
  const raw = files[`../../saves/${name}.json`]
  if (raw === undefined) throw new Error(`missing save ${name}`)
  const text = raw.replace(/\r\n/g, '\n')
  const result = parseSave(text)
  if (!result.ok) throw new Error(`${name}: ${result.error}`)
  return { game: result.game, text, note: result.note ?? '' }
}

/** Every placement the piece in hand has, at every angle, as its squares. */
function placements(game: GameState) {
  return anchorsByRotation(game).flatMap((anchors, rotation) =>
    anchors.map((at) => currentSquares({ ...game, rotation: rotation as 0 | 1 | 2 | 3 }, at)!),
  )
}

/** Places the piece in hand with its anchor on (q, r) at `rotation`. */
function place(game: GameState, q: number, r: number, rotation: 0 | 1 | 2 | 3 = 0) {
  const next = placeCurrent({ ...game, rotation }, coord(q, r))
  expect(next, `the piece fits at (${q}, ${r})`).not.toBe(game)
  return next
}

describe('the saves in /saves', () => {
  const names = Object.keys(files).map((path) => path.replace(/^.*\/(.*)\.json$/, '$1'))

  it('are all there, and each load and say what they show', () => {
    expect(names).toHaveLength(12)
    for (const name of names) expect(save(name).note.length, name).toBeGreaterThan(40)
  })

  it('save back to exactly the same text', () => {
    for (const name of names) {
      const { game, text, note } = save(name)
      expect(saveText(game, note), name).toBe(text)
    }
  })

  it('01: a new game starts with the starting piece worth its base point', () => {
    const { game } = save('01-new-game')
    expect(pieceCount(game.board)).toBe(1)
    expect(game.score).toBe(1)
    expect(resetBoard(game).score).toBe(1)
  })

  it('01: every later piece must touch the board', () => {
    const { game } = save('01-new-game')
    const all = placements(game)
    expect(all.length).toBeGreaterThan(0)
    for (const squares of all)
      expect(
        squares.some((s) => DIRECTIONS.some((d) => getSquare(game.board, neighbour(s.coord, d)))),
      ).toBe(true)
  })

  it('02: a piece without blue never goes against blue, but fits elsewhere', () => {
    const { game } = save('02-water-blocks-other-biomes')
    const all = placements(game)
    expect(all.length).toBeGreaterThan(0)
    for (const squares of all)
      for (const s of squares)
        for (const d of DIRECTIONS)
          expect(getSquare(game.board, neighbour(s.coord, d))?.terrain).not.toBe('blue')
  })

  it('03: an all-blue piece goes against any biome', () => {
    const { game } = save('03-water-goes-anywhere')
    const touched = new Set(
      placements(game).flatMap((squares) =>
        squares.flatMap((s) =>
          DIRECTIONS.map((d) => getSquare(game.board, neighbour(s.coord, d))?.terrain),
        ),
      ),
    )
    expect(touched).toContain('red')
    expect(touched).toContain('green')
  })

  it('04: a piece that fits nowhere can be skipped for the next one', () => {
    const { game } = save('04-stuck-piece')
    expect(isStuck(game)).toBe(true)
    const next = skipCurrent(game)
    expect(next.current).toEqual(upcomingTiles(game)[0])
    expect(next.board).toBe(game.board)
  })

  it('05: where a piece fits depends on its angle', () => {
    const { game } = save('05-angles')
    // The slot is the row between the bars: the bar fits there lying flat, not upright.
    expect(canPlaceCurrent({ ...game, rotation: 0 }, coord(0, 1))).toBe(true)
    expect(canPlaceCurrent({ ...game, rotation: 1 }, coord(0, 1))).toBe(false)
    expect(canPlaceCurrent({ ...game, rotation: 3 }, coord(0, 1))).toBe(false)
    const [flat, upright] = anchorsByRotation(game)
    expect(flat).not.toEqual(upright)
  })

  it('06: each side against the same biome on another piece scores one', () => {
    const { game } = save('06-matching-sides')
    const two = place(game, 1, -1)
    expect(two.lastPlacement!.score).toMatchObject({ connections: 2, points: 3 })
    expect(two.score).toBe(game.score + 3)
    const one = place(game, 0, -1)
    expect(one.lastPlacement!.score).toMatchObject({ connections: 1, points: 2 })
  })

  it('07: closing in a piece with its own biome scores the ten-point bonus', () => {
    const { game } = save('07-surround-bonus')
    const next = place(game, 2, 0)
    expect(next.lastPlacement!.score).toEqual({ connections: 4, surrounded: [0], points: 15 })
    expect(next.score).toBe(game.score + 15)
  })

  it('08: a piece dropped into a matching hole surrounds itself', () => {
    const { game } = save('08-self-surround')
    const next = place(game, 0, 0)
    const placed = getSquare(next.board, coord(0, 0))!.piece
    expect(next.lastPlacement!.score).toEqual({
      connections: 8,
      surrounded: [placed],
      points: 19,
    })
  })

  it('09: the biome odds come with the save and shape every piece drawn', () => {
    const { game } = save('09-two-biome-odds')
    expect(game.biomeProbabilities?.biomeCounts).toEqual({ 1: 0, 2: 100, 3: 0, 4: 0 })
    const pieces = upcomingTiles(game, 300)
    for (const piece of pieces) {
      expect(new Set(piece.terrains)).toEqual(new Set(['red', 'green']))
    }
    // Spare squares follow the weights: red, three times as likely, fills most of them.
    const squares = pieces.flatMap((piece) => piece.terrains)
    const red = squares.filter((t) => t === 'red').length
    expect(red / squares.length).toBeGreaterThan(0.6)
  })

  it('10: a long game carries on with the same pieces after loading', () => {
    const { game, text } = save('10-long-game')
    expect(pieceCount(game.board)).toBeGreaterThan(30)
    expect(boardSquares(game.board)).toHaveLength(4 * pieceCount(game.board))
    const again = parseSave(text)
    expect(again.ok && upcomingTiles(again.game)).toEqual(upcomingTiles(game))
  })

  it('11: two cities with nothing between them have no road, until a piece fills the gap', () => {
    const { game } = save('11-roads')
    expect(findCities(game.board).map((city) => city.coords.length)).toEqual([5, 5])
    expect(game.routes).toEqual([])
    const next = place(game, 5, 0)
    expect(next.routes).toHaveLength(1)
    expect(next.routes[0]!.traversedCoords).toEqual([
      coord(4, 0),
      coord(5, 0),
      coord(6, 0),
      coord(7, 0),
    ])
    expect(next.lastPlacement!.score.points).toBe(1)
    expect(next.lastPlacement!.roadPoints).toBe(4)
    expect(next.score).toBe(game.score + 5)
    // It reloads to the same road and score.
    const again = parseSave(saveText(next))
    expect(again.ok && again.game.routes).toEqual(next.routes)
    expect(again.ok && again.game.score).toBe(next.score)
  })

  it('12: a road takes the shortest way with at most one yellow, and its points follow it', () => {
    const { game } = save('12-shortest-road')
    expect(game.routes).toHaveLength(1)
    expect(routeScore(game.routes)).toBe(6)
    for (const c of game.routes[0]!.traversedCoords)
      expect(getSquare(game.board, c)?.terrain).not.toBe('green')

    const next = place(game, 5, 0)
    expect(routeScore(next.routes)).toBe(4)
    expect(next.routes[0]!.traversedCoords.map((c) => getSquare(next.board, c)!.terrain)).toEqual([
      'yellow',
      'red',
      'red',
      'red',
    ])
    expect(next.lastPlacement!.score).toMatchObject({ connections: 3, points: 4 })
    expect(next.lastPlacement!.roadPoints).toBe(-2)
    expect(next.score).toBe(game.score + 4 - 2)

    // Two yellow squares in the gap: the road can't use it and stays six long.
    const twoYellow = place(
      { ...game, current: { shape: 'I', terrains: ['yellow', 'yellow', 'red', 'red'] } },
      5,
      0,
    )
    expect(routeScore(twoYellow.routes)).toBe(6)
    expect(twoYellow.lastPlacement!.roadPoints).toBe(0)
  })
})
