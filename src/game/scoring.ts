import type { PlacementEvaluation } from './matching'

/** Points for each half-side that matches; a fully matching side is worth twice this. */
export const POINTS_PER_CONTACT = 5
export const PERFECT_BONUS_POINTS = 30
export const HARMONY_BONUS_TILES = 1
export const PERFECT_BONUS_TILES = 2
export const COMBO_STEP = 0.25
export const MAX_COMBO_MULTIPLIER = 3

export function comboMultiplier(combo: number): number {
  return Math.min(MAX_COMBO_MULTIPLIER, 1 + combo * COMBO_STEP)
}

export interface PlacementScore {
  readonly points: number
  /** Extra tiles added to the stack as a reward. */
  readonly bonusTiles: number
}

export interface ComboPlacementScore extends PlacementScore {
  readonly basePoints: number
  readonly multiplier: number
  /** Consecutive placements with at least one matching side and no mismatched sides. */
  readonly combo: number
}

/** Apply the resulting combo to this tile's points only, including its perfect-placement bonus. */
export function scoreWithCombo(
  evaluation: PlacementEvaluation,
  previousCombo: number,
): ComboPlacementScore {
  const base = scorePlacement(evaluation)
  const successful = evaluation.matched.length > 0 && evaluation.mismatched.length === 0
  const combo = successful ? previousCombo + 1 : 0
  const multiplier = comboMultiplier(combo)
  return { ...base, basePoints: base.points, points: base.points * multiplier, multiplier, combo }
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
