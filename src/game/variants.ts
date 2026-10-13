/** The challenge is independent of the ordinary/special tile selection. */
export const GAME_VARIANTS = ['standard', 'time-attack'] as const
export type GameVariant = (typeof GAME_VARIANTS)[number]
export const GAME_VARIANT_LABELS = { standard: 'Standard', 'time-attack': 'Time-attack' } as const
export const INITIAL_ATTACK_TIME = 45
export const LEVEL_ATTACK_TIME = 45
export const ATTACK_TILE_LIMIT = 30
