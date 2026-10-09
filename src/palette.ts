import type { Terrain } from './game/tiles'

/** Shared colours for the 3D scene and the HTML overlay. */
export const TERRAIN_COLORS: Readonly<Record<Terrain, string>> = {
  grass: '#a3c96f',
  forest: '#4f8a52',
  field: '#e6c35c',
  water: '#62a9cc',
  village: '#d97c5b',
}

export const TERRAIN_LABELS: Readonly<Record<Terrain, string>> = {
  grass: 'Meadow',
  forest: 'Forest',
  field: 'Field',
  water: 'Water',
  village: 'Village',
}

export const SCENE_COLORS = {
  background: '#f3eadb',
  ground: '#e7dbc3',
  soil: '#9b7653',
  candidate: '#fffaf0',
  match: '#6fbf63',
  mismatch: '#d9604a',
} as const
