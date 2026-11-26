import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import type { BufferGeometry, Mesh } from 'three'
import farmUrl from '../assets/models/farm.glb?url'
import type { Board } from '../game/board'
import { boardSquares } from '../game/board'
import { coordKey } from '../game/coords'
import { createRng } from '../game/random'
import { WHEAT_PALETTES } from '../palette'
import { BASE_HEIGHT, coordToWorld, TERRAIN_HEIGHT, TILE_SIZE } from './layout'
import { PropMeshes } from './PropMeshes'
import type { Model, Prop, Spot } from './props'
import { freeSpot, hash, ownColourMaterial, paletteAt, paletteMaterial, pick } from './props'
import { clearOfRoads, roadDeparture } from './roadClearing'
import { useScenery } from './useScenery'

/** Width of a clump of wheat, before each one is drawn bigger or smaller. */
const WHEAT_SIZE = 0.34 * TILE_SIZE
const SILO_HEIGHT = 0.5 * TILE_SIZE
/** Length of each animal, nose to tail. */
const ANIMALS = { cow: 0.3, bull: 0.32, horse: 0.3, donkey: 0.24, deer: 0.26 } as const
type Animal = keyof typeof ANIMALS
/** Who grazes together: cattle, horses with a donkey, or deer on their own. */
const HERDS: readonly (readonly Animal[])[] = [
  ['cow', 'cow', 'bull'],
  ['horse', 'horse', 'donkey'],
  ['deer'],
]
/** Wheat sways a little off upright, up to this many radians. */
const WHEAT_TILT = 0.08
/** Cells are grouped into areas this many cells across, each keeping one kind of herd. */
const HERD_AREA = 3

const GROUND = BASE_HEIGHT + TERRAIN_HEIGHT.yellow
const WHEAT = 0
const SILO = 1
/** The animals come after the wheat and the silo, each standing and then grazing. */
const animalKind = (animal: Animal, grazing: boolean) =>
  2 + (Object.keys(ANIMALS) as Animal[]).indexOf(animal) * 2 + (grazing ? 1 : 0)

const wheatMaterial = paletteMaterial(WHEAT_PALETTES)
const ownColours = ownColourMaterial()

/**
 * What a yellow square holds: mostly a field of wheat in rows; sometimes a pasture, a few
 * animals of the area's herd grazing with some wheat at its edge; now and then a farmstead,
 * a silo with wheat round it and perhaps one animal.
 */
const LAYOUTS = ['field', 'pasture', 'farmstead'] as const
const LAYOUT_ODDS = [55, 30, 15]

/**
 * The props on every yellow square. Every choice comes from a generator seeded by the cell, so
 * a square always looks the same, roads or none.
 */
function farmsOf(board: Board, models: readonly Model[]): Prop[] {
  const props: Prop[] = []
  for (const { coord: c, terrain } of boardSquares(board)) {
    if (terrain !== 'yellow') continue
    const rng = createRng(hash(c.q, c.r, 9))
    const [cx, cz] = coordToWorld(c)
    const cell = coordKey(c)
    const taken: Spot[] = []
    let n = 0
    const add = (kind: number, spot: Spot, rest: Partial<Prop> = {}) => {
      taken.push(spot)
      props.push({
        id: `${cell}:${n++}`,
        cell,
        kind,
        palette: 0,
        x: spot.x,
        y: GROUND,
        z: spot.z,
        angle: rng.next() * Math.PI * 2,
        tiltX: 0,
        tiltZ: 0,
        size: 1,
        ...rest,
      })
    }
    const wheat = (size: number, spot: Spot, angle: number) =>
      add(WHEAT, spot, {
        palette: paletteAt(rng, c, WHEAT_PALETTES.length, 6),
        angle,
        tiltX: (rng.next() * 2 - 1) * WHEAT_TILT,
        tiltZ: (rng.next() * 2 - 1) * WHEAT_TILT,
        size,
      })
    const loose = (kind: number, size: number, spacing: number) =>
      freeSpot(rng, cx, cz, models[kind]!.radius * size, taken, () => spacing)

    const layout = LAYOUTS[pick(rng, LAYOUT_ODDS)]!
    if (layout === 'field') {
      // Four rows of four clumps, along one way or the other, a few left out.
      const across = rng.next() < 0.5 ? 0 : Math.PI / 2
      const step = TILE_SIZE / 4.3
      for (const row of [-1.5, -0.5, 0.5, 1.5])
        for (const along of [-1.5, -0.5, 0.5, 1.5]) {
          if (rng.next() < 0.1) continue
          const [dx, dz] = across === 0 ? [along, row] : [row, along]
          const jitter = () => (rng.next() * 2 - 1) * 0.03 * TILE_SIZE
          const size = 0.85 + rng.next() * 0.25
          const spot = {
            x: cx + dx * step + jitter(),
            z: cz + dz * step + jitter(),
            radius: models[WHEAT]!.radius * size,
          }
          wheat(size, spot, across + (rng.next() - 0.5) * 0.5)
        }
      continue
    }

    const herd =
      HERDS[hash(Math.floor(c.q / HERD_AREA), Math.floor(c.r / HERD_AREA), 9) % HERDS.length]!
    const animal = () => herd[Math.floor(rng.next() * herd.length)]!
    // A herd faces roughly the same way, as it moves over a pasture together.
    const heading = rng.next() * Math.PI * 2
    const graze = (count: number) => {
      for (let i = 0; i < count; i++) {
        const kind = animalKind(animal(), rng.next() < 0.6)
        const size = 0.9 + rng.next() * 0.2
        const spot = loose(kind, size, 0.01)
        if (spot) add(kind, spot, { angle: heading + (rng.next() - 0.5) * 1.4, size })
      }
    }
    const clumps = (count: number) => {
      for (let i = 0; i < count; i++) {
        const size = 0.7 + rng.next() * 0.25
        const spot = loose(WHEAT, size, -0.3 * models[WHEAT]!.radius)
        if (spot) wheat(size, spot, rng.next() * Math.PI * 2)
      }
    }

    if (layout === 'pasture') {
      graze(2 + pick(rng, [50, 50]))
      clumps(1 + pick(rng, [50, 50]))
    } else {
      const size = 0.9 + rng.next() * 0.2
      const spot = loose(SILO, size, 0.01)
      if (spot) add(SILO, spot, { size })
      clumps(3 + pick(rng, [50, 50]))
      if (rng.next() < 0.4) graze(1)
    }
  }
  return props
}

function useFarmModels(): Model[] {
  const scene = useGLTF(farmUrl, false, true).scene
  return useMemo(() => {
    const geometry = (name: string) => {
      const mesh = scene.getObjectByName(name) as Mesh
      const g = mesh.geometry as BufferGeometry
      g.computeBoundingBox()
      return g
    }
    // Half the widest side of the footprint, or a little less, at the size it is drawn.
    const footprint = (g: BufferGeometry, scale: number, share: number) => {
      const { min, max } = g.boundingBox!
      return share * 0.5 * Math.max(max.x - min.x, max.z - min.z) * scale
    }
    const wheat = geometry('wheat')
    const silo = geometry('silo')
    const models: Model[] = [
      {
        geometry: wheat,
        scale: WHEAT_SIZE,
        radius: footprint(wheat, WHEAT_SIZE, 0.85),
        material: wheatMaterial,
        castShadow: false,
      },
      {
        geometry: silo,
        scale: SILO_HEIGHT,
        radius: footprint(silo, SILO_HEIGHT, 1),
        material: ownColours,
        castShadow: true,
        leave: 'sink',
      },
    ]
    for (const [animal, length] of Object.entries(ANIMALS))
      for (const pose of ['standing', 'grazing']) {
        const g = geometry(`${animal}-${pose}`)
        models.push({
          geometry: g,
          scale: length * TILE_SIZE,
          // Animals are long and narrow; room for a neighbour alongside.
          radius: footprint(g, length * TILE_SIZE, 0.75),
          material: ownColours,
          castShadow: true,
          leave: 'hop',
        })
      }
    return models
  }, [scene])
}

/**
 * Farms on the yellow squares: fields of wheat in rows, pastures where cattle, horses or deer
 * graze, and farmsteads with a silo. A new square's farm pops up once its piece has landed.
 * Where a new road comes through, what is in its way goes just ahead of its stones: the wheat
 * is cut down, the animals hop away and the silo sinks into the ground.
 *
 * The animals are by Quaternius (CC0); the silo and the wheat are "Silo" and "Field of wheat"
 * by Poly by Google, CC BY 3.0, the wheat painted from the game's own palettes.
 */
export function Farms() {
  const models = useFarmModels()
  const shown = useScenery()
  const farms = useMemo(() => farmsOf(shown.board, models), [shown.board, models])
  const standing = useMemo(
    () => clearOfRoads(farms, shown.routes, models),
    [farms, shown.routes, models],
  )
  return <PropMeshes props={standing} models={models} grow={shown.grow} departure={roadDeparture} />
}

useGLTF.preload(farmUrl, false, true)
