const QUARTER_TURN = Math.PI / 2
const ALIGN_TOLERANCE = 0.005

/** Next grid-aligned side in the chosen direction, including from a freely rotated view. */
export function nextCameraSide(azimuth: number, turns: -1 | 1): number {
  const side = azimuth / QUARTER_TURN
  const nearest = Math.round(side)
  if (Math.abs(azimuth - nearest * QUARTER_TURN) < ALIGN_TOLERANCE)
    return (nearest + turns) * QUARTER_TURN
  return (turns < 0 ? Math.floor(side) : Math.ceil(side)) * QUARTER_TURN || 0
}
