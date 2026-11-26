import { useMemo } from 'react'
import type { Board, PlacedSquare } from '../game/board'
import type { Route } from '../game/routes'
import { useGameStore } from '../store/gameStore'
import { useRevealStore } from '../store/revealStore'
import { useAfterDrop } from './useAfterDrop'

const NO_ROUTES: readonly Route[] = []

/** The pieces numbered below `count`. */
export function piecesBelow(board: Board, count: number): Board {
  const kept: Record<string, PlacedSquare> = {}
  for (const [key, square] of Object.entries(board)) if (square.piece < count) kept[key] = square
  return kept
}

/**
 * The board and roads that trees, fields, houses and roads grow from, and whether what is new
 * on them should grow in. After a placement, they follow once the piece has landed. While a
 * landscape grows in, they hold only the pieces that have landed, and no roads until all have,
 * so its scenery springs up behind the falling pieces and its roads are laid last. A loaded
 * game, or a reset that isn't a landscape, shows everything at once.
 */
export function useScenery(): {
  readonly board: Board
  readonly routes: readonly Route[]
  readonly grow: boolean
} {
  const board = useGameStore((s) => s.board)
  const routes = useGameStore((s) => s.routes)
  const placed = useGameStore((s) => s.lastPlacement !== null)
  /** Pieces landed so far while a landscape grows in, or null once it has. */
  const landed = useRevealStore((s) => (s.reveal && s.landed < s.reveal.total ? s.landed : null))
  // Nothing grows before the first piece lands, so a new landscape's arrival doesn't make the
  // old one's trees topple over empty ground.
  const revealed = useRevealStore((s) => s.reveal !== null && s.landed > 0)
  const latest = useMemo(
    () =>
      landed === null
        ? { board, routes }
        : { board: piecesBelow(board, landed), routes: NO_ROUTES },
    [board, routes, landed],
  )
  const shown = useAfterDrop(latest, placed)
  return { board: shown.board, routes: shown.routes, grow: placed || revealed }
}
