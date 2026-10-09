import type { PlacementEvaluation } from './matching'

/** Points for each half-side that matches; a fully matching side is worth twice this. */
export const POINTS_PER_CONTACT = 5
export const PERFECT_BONUS_POINTS = 30
export const HARMONY_BONUS_TILES = 1
export const PERFECT_BONUS_TILES = 2

export interface PlacementScore {
  readonly points: number
  /** Extra tiles added to the stack as a reward. */
  readonly bonusTiles: number
}

/**
 * Cozy scoring: matching squares earn points, mismatches cost nothing.
 * Harmonious placements (every touching side matches, 2+ sides) refill the stack,
 * and perfect placements (all four sides) earn a point bonus too.
 */
export function scorePlacement(evaluation: PlacementEvaluation): PlacementScore {
  const matchingContacts = evaluation.contacts.filter((c) => c.matches).length
  const points =
    matchingContacts * POINTS_PER_CONTACT + (evaluation.perfect ? PERFECT_BONUS_POINTS : 0)

  const bonusTiles = evaluation.perfect
    ? PERFECT_BONUS_TILES
    : evaluation.harmonious
      ? HARMONY_BONUS_TILES
      : 0

  return { points, bonusTiles }
}
