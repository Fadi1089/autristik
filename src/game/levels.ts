/**
 * Score-based levels with no time limit. Each level asks for more points.
 */

/** Higher goals account for tile multipliers up to ×3. */
export const FIRST_GOAL = 75
export const GOAL_STEP = 50
/** Tiles added to the stack on reaching a new level, so the stack keeps pace. */
export const LEVEL_UP_TILES = 6

/** Points to earn within `level` (1-based) to clear it. */
export function levelGoal(level: number): number {
  return FIRST_GOAL + GOAL_STEP * (level - 1)
}
