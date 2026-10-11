const scoreFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

/** Keep fractional combo points and quarter-step multipliers readable. */
export function formatPoints(points: number): string {
  return scoreFormat.format(points)
}
