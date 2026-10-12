/**
 * Score-based levels with no time limit. Each level asks for more points.
 */

/** Higher goals account for tile multipliers up to ×3. */
export const FIRST_GOAL = 75
export const GOAL_STEP = 50
/** Tiles added to the stack on reaching a new level, so the stack keeps pace. */
export const LEVEL_UP_TILES = 6

/** Seconds per square at level 1, with a gentle approach to the fastest allowed cadence. */
export const BASE_FALL_INTERVAL = 1.5
export const MIN_FALL_INTERVAL = 0.45
export const FALL_INTERVAL_DECAY = 0.93

export const DIFFICULTIES = ['easy', 'medium', 'hard', 'insane'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  insane: 'Insane',
}
const START_SPEED_LEVEL: Record<Difficulty, number> = { easy: 1, medium: 10, hard: 20, insane: 30 }

/** Each level removes 7% of the remaining gap to the minimum interval. */
export function fallInterval(level: number, difficulty: Difficulty = 'easy'): number {
  // Insane starts at the maximum speed; its score level and rewards still start at level 1.
  if (difficulty === 'insane') return MIN_FALL_INTERVAL
  const completed = Math.max(0, level - 1) + START_SPEED_LEVEL[difficulty] - 1
  return (
    MIN_FALL_INTERVAL + (BASE_FALL_INTERVAL - MIN_FALL_INTERVAL) * FALL_INTERVAL_DECAY ** completed
  )
}

/** Points to earn within `level` (1-based) to clear it. */
export function levelGoal(level: number): number {
  return FIRST_GOAL + GOAL_STEP * (level - 1)
}
