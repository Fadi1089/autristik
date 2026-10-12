import type { Terrain } from './game/tiles'
import type { GameTheme } from './customization'

/** Shared colours for the 3D scene and the HTML overlay. */
export const TERRAIN_COLORS: Readonly<Record<Terrain, string>> = {
  grass: '#a3c96f',
  forest: '#4f8a52',
  field: '#e6c35c',
  water: '#62a9cc',
  village: '#d97c5b',
  rainbow: '#efc447',
  void: '#321150',
  bedrock: '#55555a',
}

export const TERRAIN_LABELS: Readonly<Record<Terrain, string>> = {
  grass: 'Meadow',
  forest: 'Forest',
  field: 'Field',
  water: 'Water',
  village: 'Village',
  rainbow: 'Golden joker',
  void: 'Void · clears 3×3',
  bedrock: 'Bedrock · no matches',
}

export const BONUS_COLORS = { 1: '#9b7653', 2: '#a96b38', 3: '#c6d5e2', 5: '#53cdee' } as const

export const SCENE_COLORS = {
  background: '#f3eadb',
  ground: '#e7dbc3',
  soil: '#9b7653',
  candidate: '#fffaf0',
  match: '#6fbf63',
  mismatch: '#d9604a',
} as const

/** Ground and sky change with the theme; terrain colours and match indicators stay familiar. */
export const SCENE_THEMES: Record<
  GameTheme,
  { background: string; ground: string; candidate: string }
> = {
  light: SCENE_COLORS,
  dark: { background: '#19252b', ground: '#25343b', candidate: '#bfd5d1' },
}
