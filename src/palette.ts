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
  /** A bounded grid's own ground, a shade lighter than the land around it. */
  field: '#f1e8d6',
  /** The wooden fence round a bounded grid: a warm, sanded pine. */
  fence: '#d9a679',
  soil: '#9b7653',
  placementValid: '#6fbf63',
  placementInvalid: '#d9604a',
  /** The flash on a piece that just got surrounded by its own biomes. */
  gold: '#ffd24a',
} as const

/** Colours for the stones of the roads between cities: light and dark. */
export const ROAD_STONES: readonly [string, string] = ['#828c92', '#6e7683']

/**
 * Colours for the houses in the cities: wall, roof, stone, wood. Muted and weathered, so any of
 * them can stand next to the others; each city leans towards one and borrows from the rest.
 */
export const CITY_PALETTES: readonly (readonly [string, string, string, string])[] = [
  /** Terracotta: cream walls under red clay tiles. */
  ['#efe2c8', '#b25a3c', '#b3a48c', '#6e4a32'],
  /** Slate: limewash under blue-grey slate. */
  ['#e7e2d7', '#5c6570', '#a39d92', '#5a4636'],
  /** Thatch: warm sand under straw. */
  ['#eadab9', '#b8935a', '#ad9f86', '#6b5038'],
  /** Moss: pale stone under sage green. */
  ['#e9e3d1', '#7b8768', '#a8a08a', '#65513d'],
  /** Heather: chalk under dusky plum. */
  ['#ece4d8', '#7d5a62', '#a99c94', '#5c4238'],
  /** Harbour: whitewash under weathered blue. */
  ['#f0e9dc', '#687d8a', '#aaa49a', '#6d5848'],
]

/** Colours for the grass in the cities: fresh blades, deep blades, yellowing tips. */
export const GRASS_PALETTES: readonly (readonly [string, string, string])[] = [
  /** Meadow. */
  ['#6f9a3e', '#3f6e2c', '#c9a93a'],
  /** High summer. */
  ['#8a9a48', '#556b2f', '#c8a24a'],
  /** Sage. */
  ['#7f9a6a', '#4f6b4f', '#b9a76a'],
  /** Late summer. */
  ['#9aa05a', '#6b7a3a', '#d1b25a'],
]

/** Colours for the trees on green squares: light leaves, dark leaves, trunk. */
export const FOREST_PALETTES: readonly (readonly [string, string, string])[] = [
  /** Summer. */
  ['#7fa64a', '#4e7a3a', '#7a5636'],
  /** Pine wood. */
  ['#6f9a52', '#3f6b3f', '#6b4a32'],
  /** Spring. */
  ['#93ad55', '#5d8040', '#80603e'],
  /** Deep wood. */
  ['#68934a', '#39603a', '#5f4330'],
]

/** Colours for the trees on red squares, turned for autumn: light leaves, dark leaves, trunk. */
export const AUTUMN_PALETTES: readonly (readonly [string, string, string])[] = [
  /** Amber. */
  ['#e3a13c', '#c0692b', '#6b4a32'],
  /** Rust. */
  ['#d4743c', '#a3472d', '#5f4330'],
  /** Gold. */
  ['#e9c253', '#c99133', '#7a5636'],
  /** Crimson. */
  ['#cc4d3c', '#8f3131', '#5c4030'],
  /** Turning, with some green left. */
  ['#cfa64a', '#7f7a3a', '#6b4a32'],
]

/** Colours for the wheat on yellow squares: ears, stalks. A shade apart from the yellow ground. */
export const WHEAT_PALETTES: readonly (readonly [string, string])[] = [
  /** Ripe. */
  ['#e8c766', '#b08a3e'],
  /** Pale, nearly harvest. */
  ['#efd98c', '#c2a25a'],
  /** Amber. */
  ['#d9a548', '#9c7434'],
  /** Still green at the stalk. */
  ['#d6c870', '#8f9443'],
]
