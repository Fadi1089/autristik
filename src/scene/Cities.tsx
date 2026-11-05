import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import type { BufferGeometry } from 'three'
import housesUrl from '../assets/models/fantasy-houses.glb?url'
import grassUrl from '../assets/models/grass.glb?url'
import type { Board } from '../game/board'
import { coordKey } from '../game/coords'
import { createRng } from '../game/random'
import { findCities } from '../game/routes'
import { CITY_PALETTES, GRASS_PALETTES } from '../palette'
import { useGameStore } from '../store/gameStore'
import { BASE_HEIGHT, coordToWorld, TERRAIN_HEIGHT, TILE_SIZE } from './layout'
import type { Model, Prop, Spot } from './props'
import { PropMeshes } from './PropMeshes'
import { freeSpot, hash, meshesOf, paletteAt, paletteMaterial, pick } from './props'
import { useAfterDrop } from './useAfterDrop'

/**
 * Width of a house's widest side. The models come with their widest side 1 long, standing on
 * the ground and centred on their footprint, so this is their scale, unless that makes them
 * taller than MAX_HOUSE_HEIGHT: the tall ones are shrunk to it, so no house towers over a city.
 */
const HOUSE_SIZE = 0.27 * TILE_SIZE
const MAX_HOUSE_HEIGHT = 0.36 * TILE_SIZE
/** Width of a patch of grass, before each one is drawn bigger or smaller. */
const GRASS_SIZE = 0.36 * TILE_SIZE
/** Grass leans a little, up to this many radians, so patches don't stand stiffly upright. */
const GRASS_TILT = 0.12

const houseMaterial = paletteMaterial(CITY_PALETTES)
const grassMaterial = paletteMaterial(GRASS_PALETTES)

/**
 * Houses and grass scattered at random over each square of each city: two to four houses kept
 * apart from one another, then two to five patches of grass, which may tuck in against the
 * houses. Every choice comes from a generator seeded by the cell, so a square always looks the
 * same. `houseKinds` is how many house models there are; the grass is the model after them.
 */
function propsOf(board: Board, models: readonly Model[], houseKinds: number): Prop[] {
  const props: Prop[] = []
  const grass = houseKinds
  for (const city of findCities(board))
    for (const c of city.coords) {
      const rng = createRng(hash(c.q, c.r))
      const [cx, cz] = coordToWorld(c)
      const cell = coordKey(c)
      const taken: Spot[] = []
      // Numbered within the cell, so a prop keeps its id while other squares change.
      let n = 0
      const id = () => `${cell}:${n++}`

      const houses = 2 + pick(rng, [40, 45, 15])
      for (let i = 0; i < houses; i++) {
        const kind = Math.floor(rng.next() * houseKinds)
        const size = 0.8 + rng.next() * 0.35
        const spot = freeSpot(rng, cx, cz, models[kind]!.radius * size, taken, () => 0.01)
        if (!spot) continue
        taken.push(spot)
        props.push({
          id: id(),
          cell,
          kind,
          palette: paletteAt(rng, c, CITY_PALETTES.length, 1),
          x: spot.x,
          y: GROUND,
          z: spot.z,
          angle: rng.next() * Math.PI * 2,
          tiltX: 0,
          tiltZ: 0,
          size,
        })
      }

      const patches = 2 + pick(rng, [25, 35, 25, 15])
      for (let i = 0; i < patches; i++) {
        const size = 0.55 + rng.next() * 0.7
        const radius = models[grass]!.radius * size
        // Grass may run a little under a house's eaves, and patches may brush one another.
        const spot = freeSpot(rng, cx, cz, radius, taken, (other) => -0.4 * other.radius)
        if (!spot) continue
        taken.push(spot)
        props.push({
          id: id(),
          cell,
          kind: grass,
          palette: paletteAt(rng, c, GRASS_PALETTES.length, 2),
          x: spot.x,
          y: GROUND,
          z: spot.z,
          angle: rng.next() * Math.PI * 2,
          tiltX: (rng.next() * 2 - 1) * GRASS_TILT,
          tiltZ: (rng.next() * 2 - 1) * GRASS_TILT,
          size,
        })
      }
    }
  return props
}

const GROUND = BASE_HEIGHT + TERRAIN_HEIGHT.black

/** The house models, each at the scale it is drawn at, then the grass. */
function useModels(): { models: Model[]; houseKinds: number } {
  const houses = useGLTF(housesUrl, false).scene
  const grass = useGLTF(grassUrl, false).scene
  return useMemo(() => {
    const houseModels = meshesOf(houses).map((mesh): Model => {
      const geometry = mesh.geometry as BufferGeometry
      geometry.computeBoundingBox()
      const scale = Math.min(HOUSE_SIZE, MAX_HOUSE_HEIGHT / geometry.boundingBox!.max.y)
      // A little under half the widest side: the corners of neighbours may just overlap.
      return { geometry, scale, radius: 0.42 * scale, material: houseMaterial, castShadow: true }
    })
    const grassModel: Model = {
      geometry: meshesOf(grass)[0]!.geometry as BufferGeometry,
      scale: GRASS_SIZE,
      radius: 0.4 * GRASS_SIZE,
      material: grassMaterial,
      castShadow: false,
    }
    return { models: [...houseModels, grassModel], houseKinds: houseModels.length }
  }, [houses, grass])
}

/**
 * Houses and grass scattered over the squares of every city (five or more black squares joined
 * up), so a city reads as one at a glance. A new city square's houses and grass pop up once its
 * last piece has landed.
 *
 * The houses are "Fantasy Houses" by burunduk and the grass is "grass yellowing" by Steve B,
 * both CC BY 3.0, painted from the game's own palettes.
 */
export function Cities() {
  const { models, houseKinds } = useModels()
  const board = useGameStore((s) => s.board)
  const lastPlacement = useGameStore((s) => s.lastPlacement)
  const latest = useMemo(() => propsOf(board, models, houseKinds), [board, models, houseKinds])
  const props = useAfterDrop(latest, lastPlacement !== null)
  // Only a placement grows props; a loaded game or a reset shows its cities at once.
  return <PropMeshes props={props} models={models} grow={lastPlacement !== null} />
}

useGLTF.preload(housesUrl, false)
useGLTF.preload(grassUrl, false)
