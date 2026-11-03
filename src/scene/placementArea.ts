import { coordKey } from '../game/coords'
import type { Coord } from '../game/coords'
import { currentAnchors } from '../game/game'
import type { HandState } from '../game/game'
import { shapeOffsets } from '../game/tiles'

/**
 * Every cell the piece in hand would cover at some spot where it fits as it is turned now,
 * each listed once, in a stable order. Drawn as one flat area, it shows all the ground the
 * piece can reach.
 */
export function placementArea(state: HandState): Coord[] {
  if (!state.current) return []
  const offsets = shapeOffsets(state.current.shape, state.rotation)
  const cells = new Map<string, Coord>()
  for (const anchor of currentAnchors(state))
    for (const offset of offsets) {
      const cell = { q: anchor.q + offset.q, r: anchor.r + offset.r }
      cells.set(coordKey(cell), cell)
    }
  return [...cells.values()].sort((a, b) => a.r - b.r || a.q - b.q)
}
