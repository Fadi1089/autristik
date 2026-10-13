/** Shared audio and visual warning thresholds. */
export const LOW_TIME_SECONDS = 15
export const LOW_TILE_COUNT = 5
export function lowTime(seconds: number | null): boolean {
  return seconds !== null && seconds > 0 && seconds <= LOW_TIME_SECONDS
}
export function lowSupply(remaining: number): boolean {
  return Number.isFinite(remaining) && remaining > 0 && remaining <= LOW_TILE_COUNT
}
