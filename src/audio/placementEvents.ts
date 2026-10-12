import type { GameStore } from '../store/gameStore'

type PlacementState = Pick<GameStore, 'menuOpen' | 'board' | 'lastPlacement'>

/** Restarts, movement and menu changes must never count as a placement. */
export function isNewPlacement(next: PlacementState, previous: PlacementState): boolean {
  return (
    !previous.menuOpen &&
    next.board !== previous.board &&
    next.lastPlacement !== null &&
    next.lastPlacement !== previous.lastPlacement
  )
}
