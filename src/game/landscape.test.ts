import { describe, expect, it } from 'vitest'
import { boardSquares, getSquare } from './board'
import { coordKey, DIRECTIONS, neighbour } from './coords'
import type { Coord } from './coords'
import { createGame, placeCurrent, resetBoard } from './game'
import { placementAnchors } from './matching'
import { modeRules } from './modes'
import {
  CELL_STATES,
  collapseLandscape,
  compatible,
  growLandscape,
  landscapeCells,
} from './landscape'
import { createRng } from './random'
import { findCities } from './routes'
import { parseSave, saveText } from './save'

const SEEDS = Array.from({ length: 20 }, (_, i) => i * 7919 + 1)

describe('the landscape table', () => {
  it('is symmetric, and fields go with everything', () => {
    for (const a of CELL_STATES)
      for (const b of CELL_STATES) expect(compatible(a, b), `${a}/${b}`).toBe(compatible(b, a))
    for (const s of CELL_STATES) expect(compatible('yellow', s)).toBe(true)
  })
})

describe('collapseLandscape', () => {
  it('collapses every cell of the disc, and no two neighbours break the table', () => {
    for (const seed of SEEDS) {
      const world = collapseLandscape(createRng(seed))
      const cells = landscapeCells()
      expect(world.size).toBe(cells.length)
      for (const c of cells)
        for (const d of DIRECTIONS) {
          const there = world.get(coordKey(neighbour(c, d)))
          if (there) expect(compatible(world.get(coordKey(c))!, there)).toBe(true)
        }
    }
  })

  it('never puts water at the rim', () => {
    for (const seed of SEEDS) {
      const world = collapseLandscape(createRng(seed))
      for (const [key, state] of world) {
        const [q, r] = key.split(',').map(Number) as [number, number]
        const atRim = DIRECTIONS.some((d) => !world.has(coordKey(neighbour({ q, r }, d))))
        if (atRim) expect(state).not.toBe('blue')
      }
    }
  })
})

describe('growLandscape', () => {
  it('grows the same world from the same seed', () => {
    expect(growLandscape(createRng(42))).toEqual(growLandscape(createRng(42)))
    expect(growLandscape(createRng(42))).not.toEqual(growLandscape(createRng(43)))
  })

  it('cuts the world into joined-up tetrominoes, mostly of one biome, and single tiles', () => {
    for (const seed of SEEDS) {
      const pieces = new Map<number, Coord[]>()
      const board = growLandscape(createRng(seed))
      for (const s of boardSquares(board))
        pieces.set(s.piece, [...(pieces.get(s.piece) ?? []), s.coord])
      let plain = 0
      let mixed = 0
      for (const [, coords] of pieces) {
        expect([1, 4]).toContain(coords.length)
        const keys = new Set(coords.map(coordKey))
        const reached = [coords[0]!]
        const seen = new Set([coordKey(coords[0]!)])
        for (let i = 0; i < reached.length; i++)
          for (const d of DIRECTIONS) {
            const n = neighbour(reached[i]!, d)
            if (keys.has(coordKey(n)) && !seen.has(coordKey(n))) {
              seen.add(coordKey(n))
              reached.push(n)
            }
          }
        expect(reached).toHaveLength(coords.length)
        if (coords.length < 4) continue
        if (new Set(coords.map((c) => getSquare(board, c)!.terrain)).size === 1) plain++
        else mixed++
      }
      expect(plain).toBeGreaterThan(mixed)
    }
  })

  it('leaves room to build: plenty of land, and no water beside an empty cell', () => {
    for (const seed of SEEDS) {
      const board = growLandscape(createRng(seed))
      const squares = boardSquares(board)
      expect(squares.length).toBeGreaterThan(60)
      expect(squares.length).toBeLessThan(landscapeCells().length)
      for (const s of squares.filter((s) => s.terrain === 'blue'))
        for (const d of DIRECTIONS) expect(getSquare(board, neighbour(s.coord, d))).toBeDefined()
    }
  })

  it('numbers its pieces in the order they collapsed, from the centre out', () => {
    for (const seed of SEEDS) {
      const world = [...collapseLandscape(createRng(seed)).keys()]
      expect(world[0]).toBe('0,0')
      const board = growLandscape(createRng(seed))
      const first = new Map<number, number>()
      for (const s of boardSquares(board)) {
        const step = world.indexOf(coordKey(s.coord))
        first.set(s.piece, Math.min(first.get(s.piece) ?? Infinity, step))
      }
      const ids = [...first.keys()].sort((a, b) => a - b)
      expect(ids).toEqual(ids.map((_, i) => i))
      for (let i = 1; i < ids.length; i++) expect(first.get(i)!).toBeGreaterThan(first.get(i - 1)!)
    }
  })

  it('leaves no shut-in clearing too small for a piece', () => {
    for (const seed of SEEDS) {
      const board = growLandscape(createRng(seed))
      const cells = new Set(landscapeCells().map(coordKey))
      const seen = new Set<string>()
      for (const start of landscapeCells()) {
        if (getSquare(board, start) || seen.has(coordKey(start))) continue
        seen.add(coordKey(start))
        const pocket = [start]
        let open = false
        for (let i = 0; i < pocket.length; i++)
          for (const d of DIRECTIONS) {
            const n = neighbour(pocket[i]!, d)
            if (!cells.has(coordKey(n))) open = true
            else if (!getSquare(board, n) && !seen.has(coordKey(n))) {
              seen.add(coordKey(n))
              pocket.push(n)
            }
          }
        expect(open || pocket.length >= 4).toBe(true)
      }
    }
  })

  it('usually grows a town or two', () => {
    const withCities = SEEDS.filter((seed) => findCities(growLandscape(createRng(seed))).length > 0)
    expect(withCities.length).toBeGreaterThan(SEEDS.length / 2)
  })
})

describe('a landscape game', () => {
  it('starts in a generated world, scored, with somewhere for the first piece to go', () => {
    const game = createGame(7, undefined, 'landscape')
    expect(modeRules(game.mode).landscape).toBe(true)
    expect(boardSquares(game.board).length).toBeGreaterThan(60)
    expect(game.score).toBeGreaterThanOrEqual(1)
    const anchors = [0, 1, 2, 3].flatMap((rotation) =>
      placementAnchors(
        game.board,
        game.current!,
        rotation as 0 | 1 | 2 | 3,
        modeRules('landscape'),
      ),
    )
    expect(anchors.length).toBeGreaterThan(0)
    const next = placeCurrent(game, anchors[0]!)
    expect(next).not.toBe(game)
    expect(next.score).toBeGreaterThan(game.score)
  })

  it('grows a fresh world when the grid is reset', () => {
    const game = createGame(7, undefined, 'landscape')
    const reset = resetBoard(game)
    expect(boardSquares(reset.board).length).toBeGreaterThan(60)
    expect(reset.board).not.toEqual(game.board)
    expect(reset.current).toBe(game.current)
  })

  it('saves and loads', () => {
    const game = createGame(7, undefined, 'landscape')
    const loaded = parseSave(saveText(game))
    expect(loaded.ok).toBe(true)
    if (loaded.ok) {
      expect(loaded.game.mode).toBe('landscape')
      expect(loaded.game.board).toEqual(game.board)
    }
  })
})
