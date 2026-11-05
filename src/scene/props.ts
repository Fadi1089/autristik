import { Color, Mesh, MeshStandardMaterial } from 'three'
import type { BufferGeometry, Object3D } from 'three'
import type { Coord } from '../game/coords'
import type { Rng } from '../game/random'
import { PIECE_GAP, TILE_SIZE } from './layout'

/**
 * Props are the models scattered over the board's squares: the houses and grass of the cities,
 * the trees of the forests. This is what they share: how they are painted, how a spot is found
 * for each, and how they are drawn and pop up.
 */

/** How far from its cell's middle a prop may reach, along each axis. */
const HALF_CELL = TILE_SIZE / 2 - PIECE_GAP
/** Most tries at finding a free spot for one prop before it is left out. */
const SPOT_TRIES = 24
/** Chance that a prop takes its area's palette rather than any palette at all. */
const AREA_PALETTE_ODDS = 0.65
/** Cells are grouped into areas this many cells across, each leaning towards one palette. */
const AREA_SIZE = 3

/**
 * A material that paints each instance from a set of palettes. The models store which part each
 * face is in the red channel of their vertex colours, as part / 3: wall, roof, stone and wood for
 * the houses, fresh, deep and yellowing blades for the grass, light leaves, dark leaves and trunk
 * for the trees. Each instance stores the palette it is painted from in the red channel of its
 * instance colour.
 */
export function paletteMaterial(palettes: readonly (readonly string[])[]): MeshStandardMaterial {
  const parts = palettes[0]!.length
  const colours = palettes.flatMap((palette) => palette.map((hex) => new Color(hex)))
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.palettes = { value: colours }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nuniform vec3 palettes[${colours.length}];`)
      .replace(
        '#include <color_vertex>',
        `vColor = vec4( 1.0 );
        #ifdef USE_INSTANCING_COLOR
          int palette = int( instanceColor.r + 0.5 );
        #else
          int palette = 0;
        #endif
        vColor.rgb = palettes[ palette * ${parts} + int( color.r * 3.0 + 0.5 ) ];`,
      )
  }
  material.customProgramCacheKey = () => `palettes:${palettes.flat().join()}`
  return material
}

/**
 * A material for models that keep their own colours, stored in their vertex colours: the
 * animals and the silo. It leaves out the instance colour, which carries the palette index for
 * palette-painted props and would tint these.
 */
export function ownColourMaterial(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <color_vertex>',
      `vColor = vec4( 1.0 );
      #if defined( USE_COLOR_ALPHA )
        vColor *= color;
      #elif defined( USE_COLOR )
        vColor.rgb *= color;
      #endif`,
    )
  }
  material.customProgramCacheKey = () => 'own-colours'
  return material
}

/** A model scattered on a square. */
export interface Prop {
  /** Names this prop, the same from one render to the next, so a new one pops up and one gone leaves. */
  readonly id: string
  /** The cell it stands on. */
  readonly cell: string
  /** Which model it is, as an index into the models it is drawn with. */
  readonly kind: number
  /** Which of its model's palettes it is painted from. */
  readonly palette: number
  readonly x: number
  /** Height of the ground it stands on. */
  readonly y: number
  readonly z: number
  /** Which way it faces, in radians. */
  readonly angle: number
  /** How far it leans forwards and sideways, in radians. */
  readonly tiltX: number
  readonly tiltZ: number
  /** Its size, as a share of its model's usual scale. */
  readonly size: number
}

/** One of the models props are drawn with, at the scale it is drawn at. */
export interface Model {
  readonly geometry: BufferGeometry
  readonly scale: number
  /** Radius of its footprint at that scale, for keeping props apart. */
  readonly radius: number
  readonly material: MeshStandardMaterial
  /** Houses and trees cast shadows; grass is too fine for them to read as more than noise. */
  readonly castShadow: boolean
  /**
   * How it leaves when a road clears it: it tips over (trees, wheat; the default), sinks into the
   * ground (the silo), or hops and shrinks away (the animals).
   */
  readonly leave?: 'topple' | 'sink' | 'hop'
}

/** A steady random number from a few whole numbers, so the props never change between renders. */
export function hash(...values: number[]): number {
  let h = 0x811c9dc5
  for (const v of values) {
    h = Math.imul(h ^ v, 0x5bd1e995)
    h ^= h >>> 15
  }
  return h >>> 0
}

/** An index into `weights`, picked with the odds they give. */
export function pick(rng: Rng, weights: readonly number[]): number {
  let roll = rng.next() * weights.reduce((sum, w) => sum + w, 0)
  for (let i = 0; i < weights.length; i++) if ((roll -= weights[i]!) < 0) return i
  return weights.length - 1
}

/**
 * A palette for a prop at `c`: usually the one its area of the board leans towards, so a city
 * or a forest hangs together, otherwise any of them. Areas are fixed to the grid, so a place
 * keeps its colours as it grows.
 */
export function paletteAt(rng: Rng, c: Coord, count: number, salt: number): number {
  if (rng.next() >= AREA_PALETTE_ODDS) return Math.floor(rng.next() * count)
  return hash(Math.floor(c.q / AREA_SIZE), Math.floor(c.r / AREA_SIZE), salt) % count
}

export interface Spot {
  readonly x: number
  readonly z: number
  readonly radius: number
}

/**
 * A random spot on the cell centred on (cx, cz) for a prop of `radius`, at least `spacing` clear
 * of every spot taken (a negative spacing lets it overlap them a little), and where `allowed`
 * lets it stand, or null if none turns up.
 */
export function freeSpot(
  rng: Rng,
  cx: number,
  cz: number,
  radius: number,
  taken: readonly Spot[],
  spacing: (other: Spot) => number,
  allowed: (x: number, z: number) => boolean = () => true,
): Spot | null {
  const reach = Math.max(0, HALF_CELL - radius)
  for (let i = 0; i < SPOT_TRIES; i++) {
    const x = cx + (rng.next() * 2 - 1) * reach
    const z = cz + (rng.next() * 2 - 1) * reach
    if (
      allowed(x, z) &&
      taken.every((s) => Math.hypot(s.x - x, s.z - z) >= s.radius + radius + spacing(s))
    )
      return { x, z, radius }
  }
  return null
}

/** Tells when a prop that has gone should start to leave, or undefined if that isn't known yet. */
export type Departure = (prop: Prop, now: number) => number | undefined

/** Every mesh in a loaded model, in name order: house-0, house-1, … */
export function meshesOf(scene: Object3D): Mesh[] {
  const meshes: Mesh[] = []
  scene.traverse((object) => {
    if (object instanceof Mesh) meshes.push(object)
  })
  return meshes.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
}
