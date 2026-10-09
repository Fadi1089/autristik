import { normalizeRotation } from '../game/tiles'
import type { Direction } from '../game/coords'

export type ScreenDirection = 'up' | 'right' | 'down' | 'left'

const SCREEN_INDEX: Readonly<Record<ScreenDirection, number>> = {
  up: 0,
  right: 1,
  down: 2,
  left: 3,
}

/**
 * Maps a direction on screen to the grid direction that looks closest to it, given
 * the camera azimuth (0 = camera south of the board looking north, growing as it
 * circles east). Keeps "up" meaning up on screen however the view is turned.
 */
export function screenToWorldDirection(dir: ScreenDirection, azimuth: number): Direction {
  const quarterTurns = Math.round(azimuth / (Math.PI / 2))
  return normalizeRotation(SCREEN_INDEX[dir] - quarterTurns) as Direction
}
