import type { PlacementEvaluation } from './matching'

/** Points for each touching edge whose two squares match. */
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
 * Cozy scoring: matching edges earn points, mismatches cost nothing.
 * Harmonious placements (every touching edge matches, 2+ edges) refill the stack,
 * and perfect placements (the piece fills a gap and matches all round) earn a point bonus too.
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
