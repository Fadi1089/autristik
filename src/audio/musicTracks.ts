import { isGameOver } from '../game/game'
import type { GameStore } from '../store/gameStore'

export const MUSIC_FILES = {
  'music-menu': 'menu-jazz.mp3',
  'music-game': 'game-flute.mp3',
} as const
export type MusicTrack = keyof typeof MUSIC_FILES

/** Pausing and restarting a running game stay in the same musical context. */
export function musicTrackForGame(
  state: Pick<GameStore, 'started' | 'menuOpen' | 'current' | 'variant' | 'timeRemaining'>,
): MusicTrack {
  return !state.started || (state.menuOpen && isGameOver(state)) ? 'music-menu' : 'music-game'
}
