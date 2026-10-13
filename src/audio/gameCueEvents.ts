import type { GameStore } from '../store/gameStore'
import { isGameOver } from '../game/game'
import { lowSupply } from '../game/alerts'
import type { GameCue } from './gameCueSounds'

type CueState = Pick<
  GameStore,
  | 'started'
  | 'menuOpen'
  | 'runId'
  | 'score'
  | 'bestAtStart'
  | 'current'
  | 'variant'
  | 'timeRemaining'
  | 'remaining'
  | 'placements'
>

/** One distinct cue per transition; a record on the final move takes the celebratory ending. */
export function gameCueEvent(next: CueState, previous: CueState): GameCue | null {
  if (!next.started || previous.menuOpen || next.menuOpen || next.runId !== previous.runId)
    return null
  const recordBeaten = next.bestAtStart !== null && next.score > next.bestAtStart
  if (!isGameOver(previous) && isGameOver(next))
    return recordBeaten ? 'cue-record' : 'cue-game-over'
  if (
    next.placements > previous.placements &&
    next.remaining < previous.remaining &&
    lowSupply(next.remaining)
  )
    return 'cue-supply'
  return null
}
