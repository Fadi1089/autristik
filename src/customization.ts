export const GAME_THEMES = ['light', 'dark'] as const
export type GameTheme = (typeof GAME_THEMES)[number]

/** About 68% quieter than the original 25% menu cue setting. */
export const DEFAULT_MENU_SOUND_VOLUME = 0.08

export const PLACEMENT_SOUNDS = [
  { id: 'wood', label: 'Wood' },
  { id: 'button', label: 'Button' },
  { id: 'laser', label: 'Laser' },
  { id: 'drop', label: 'Water drop' },
  { id: 'steel', label: 'Steel' },
  { id: 'glass', label: 'Glass' },
  { id: 'none', label: 'Silent' },
] as const
export type PlacementSound = (typeof PLACEMENT_SOUNDS)[number]['id']

export function normalizeTheme(value: unknown): GameTheme {
  return value === 'dark' ? 'dark' : 'light'
}

export function normalizePlacementSound(value: unknown): PlacementSound {
  return PLACEMENT_SOUNDS.some((sound) => sound.id === value) ? (value as PlacementSound) : 'wood'
}

export function normalizeSoundVolume(value: unknown, fallback = 0.5): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback
}
