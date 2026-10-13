export const GAME_MODES = ['classic', 'superblock'] as const
export type GameMode = (typeof GAME_MODES)[number]

export const GAME_MODE_LABELS = {
  classic: 'Classic',
  superblock: 'Superblock',
} as const satisfies Record<GameMode, string>

/** Preserve the existing game as the initial choice. */
export const DEFAULT_GAME_MODE: GameMode = 'superblock'
