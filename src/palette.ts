import type { Biome } from './game/tiles'

/** Shared colours for the 3D scene and the HTML overlay for the 5 biomes. */
export const TERRAIN_COLORS: Readonly<Record<Biome, string>> = {
  black: '#26262a',
  red: '#e04a3f',
  green: '#4f9e52',
  yellow: '#f5bc38',
  blue: '#3a8ee6',
}

export const BIOME_COLORS = TERRAIN_COLORS

export const TERRAIN_LABELS: Readonly<Record<Biome, string>> = {
  black: 'Noir',
  red: 'Rouge',
  green: 'Vert',
  yellow: 'Jaune',
  blue: 'Bleu',
}

export const BIOME_LABELS = TERRAIN_LABELS

export const SCENE_COLORS = {
  background: '#f3eadb',
  ground: '#e7dbc3',
  soil: '#9b7653',
  placementValid: '#6fbf63',
  placementInvalid: '#d9604a',
} as const
