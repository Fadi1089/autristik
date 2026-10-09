/**
 * Timed levels: reach a level's points goal before its countdown runs out to move on.
 * Each level asks for more points in a little less time.
 */

export const FIRST_GOAL = 50
export const GOAL_STEP = 25
export const FIRST_TIME_LIMIT = 75
export const TIME_STEP = 5
export const MIN_TIME_LIMIT = 40
/** Tiles added to the stack on reaching a new level, so the stack keeps pace. */
export const LEVEL_UP_TILES = 6

/** Points to earn within `level` (1-based) to clear it. */
export function levelGoal(level: number): number {
  return FIRST_GOAL + GOAL_STEP * (level - 1)
}

/** Seconds on the clock at the start of `level`. */
export function levelTimeLimit(level: number): number {
  return Math.max(MIN_TIME_LIMIT, FIRST_TIME_LIMIT - TIME_STEP * (level - 1))
}
