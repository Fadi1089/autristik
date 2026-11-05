import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Matrix4, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import type { BufferGeometry, InstancedMesh } from 'three'
import housesUrl from '../assets/models/fantasy-houses.glb?url'
import type { Board } from '../game/board'
import { coordKey } from '../game/coords'
import { findCities } from '../game/routes'
import { useGameStore } from '../store/gameStore'
import { BASE_HEIGHT, coordToWorld, TERRAIN_HEIGHT, TILE_SIZE } from './layout'
import { useAfterDrop } from './useAfterDrop'

/**
 * Width of a house's widest side. The models come with their widest side 1 long, standing on
 * the ground and centred on their footprint, so this is their scale, unless that makes them
 * taller than MAX_HOUSE_HEIGHT: the tall ones are shrunk to it, so no house towers over a city.
 * Each house is then drawn a little bigger or smaller than that, by up to SIZE_SPREAD.
 */
const HOUSE_SIZE = 0.27 * TILE_SIZE
const MAX_HOUSE_HEIGHT = 0.36 * TILE_SIZE
const SIZE_SPREAD = 0.15
/** A cell is split into four quarters, with room for a house in each. */
const QUARTER = 0.25 * TILE_SIZE
/** How far a house may stray from the middle of its quarter. */
const JITTER = 0.05 * TILE_SIZE
/** Time a new house takes to pop up. */
const GROW_SECONDS = 0.35

/** The houses take their colours from their vertices, baked from the game's palette. */
const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })

interface House {
  /** The cell it stands on, so a new city's houses can pop up. */
  readonly cell: string
  /** Which of the house models it is. */
  readonly kind: number
  readonly x: number
  readonly z: number
  /** Which way it faces, in radians, so the houses look scattered rather than lined up. */
  readonly angle: number
  /** Its size, as a share of its model's usual scale. */
  readonly size: number
}

/** A steady random number from a few whole numbers, so the houses never change between renders. */
function hash(...values: number[]): number {
  let h = 0x811c9dc5
  for (const v of values) {
    h = Math.imul(h ^ v, 0x5bd1e995)
    h ^= h >>> 15
  }
  return h >>> 0
}

/** A steady number from 0 to 1 for the cell (q, r), house `slot` and what it is for. */
const unit = (q: number, r: number, slot: number, use: number): number =>
  hash(q, r, slot, use) / 2 ** 32

/**
 * Two or three houses scattered over each square of each city, one to a quarter of the square,
 * each a little off the quarter's middle. Which quarters, which houses, which way they face and
 * how big they are vary from square to square.
 */
function housesOf(board: Board, kinds: number): House[] {
  const houses: House[] = []
  for (const city of findCities(board))
    for (const c of city.coords) {
      const [x, z] = coordToWorld(c)
      const count = unit(c.q, c.r, 0, 0) < 0.5 ? 2 : 3
      // The quarters in a shuffled order; the first `count` of them get a house.
      const quarters = [0, 1, 2, 3].sort((a, b) => unit(c.q, c.r, a, 1) - unit(c.q, c.r, b, 1))
      for (const quarter of quarters.slice(0, count)) {
        const offset = (use: number) => (unit(c.q, c.r, quarter, use) * 2 - 1) * JITTER
        houses.push({
          cell: coordKey(c),
          kind: Math.floor(unit(c.q, c.r, quarter, 2) * kinds),
          x: x + (quarter & 1 ? QUARTER : -QUARTER) + offset(3),
          z: z + (quarter & 2 ? QUARTER : -QUARTER) + offset(4),
          angle: unit(c.q, c.r, quarter, 5) * Math.PI * 2,
          size: 1 + (unit(c.q, c.r, quarter, 6) * 2 - 1) * SIZE_SPREAD,
        })
      }
    }
  return houses
}

/** Each rebuild grows the buffers to a power of two, so the meshes are rarely remade. */
function capacityFor(count: number): number {
  return Math.max(16, 2 ** Math.ceil(Math.log2(Math.max(1, count))))
}

const GROUND = BASE_HEIGHT + TERRAIN_HEIGHT.black
const matrix = new Matrix4()
const scaleVector = new Vector3()

/** A pop with a little overshoot: 0 → 1 over `t` from 0 to 1. */
function easeOutBack(t: number): number {
  const s = 1.7
  const u = t - 1
  return 1 + (s + 1) * u ** 3 + s * u ** 2
}

/**
 * Places each house in the mesh for its model. A house still growing is scaled down; `now` is
 * the clock time, or null before the first frame, when growing houses have yet to start.
 */
function drawHouses(
  houses: readonly House[],
  meshes: readonly (InstancedMesh | null)[],
  scales: readonly number[],
  growing: Map<string, number | null>,
  now: number | null,
): void {
  const counts = meshes.map(() => 0)
  for (const house of houses) {
    const mesh = meshes[house.kind]
    if (!mesh) continue
    let scale = scales[house.kind]! * house.size
    if (growing.has(house.cell)) {
      const start = growing.get(house.cell) ?? now
      const t = start === null || now === null ? 0 : Math.min(1, (now - start) / GROW_SECONDS)
      if (start !== null) growing.set(house.cell, start)
      if (t >= 1) growing.delete(house.cell)
      scale *= Math.max(0.001, easeOutBack(t))
    }
    matrix
      .makeRotationY(house.angle)
      .scale(scaleVector.setScalar(scale))
      .setPosition(house.x, GROUND, house.z)
    mesh.setMatrixAt(counts[house.kind]!++, matrix)
  }
  meshes.forEach((mesh, kind) => {
    if (!mesh) return
    mesh.count = counts[kind]!
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  })
}

/** The house models, in name order: house-0, house-1, …, each with the scale it is drawn at. */
function useHouseModels(): { geometry: BufferGeometry; scale: number }[] {
  const { scene } = useGLTF(housesUrl, false)
  return useMemo(() => {
    const meshes: Mesh[] = []
    scene.traverse((object) => {
      if (object instanceof Mesh) meshes.push(object)
    })
    return meshes
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map((mesh) => {
        const geometry = mesh.geometry as BufferGeometry
        geometry.computeBoundingBox()
        const height = geometry.boundingBox!.max.y
        return { geometry, scale: Math.min(HOUSE_SIZE, MAX_HOUSE_HEIGHT / height) }
      })
  }, [scene])
}

/**
 * Houses scattered over the squares of every city (five or more black squares joined up), so a
 * city reads as one at a glance. A new city's houses pop up once its last piece has landed.
 *
 * The houses are "Fantasy Houses" by burunduk (CC BY 3.0), recoloured from the game's palette.
 */
export function Cities() {
  const models = useHouseModels()
  const board = useGameStore((s) => s.board)
  const lastPlacement = useGameStore((s) => s.lastPlacement)
  const latest = useMemo(() => housesOf(board, models.length), [board, models.length])
  const houses = useAfterDrop(latest, lastPlacement !== null)

  const meshes = useRef<(InstancedMesh | null)[]>([])
  /** Cells that already had houses, and when the new ones started growing. */
  const known = useRef(new Set<string>())
  const growing = useRef(new Map<string, number | null>())
  const capacities = models.map((_, kind) =>
    capacityFor(houses.filter((house) => house.kind === kind).length),
  )
  const capacityKey = capacities.join()
  const scales = useMemo(() => models.map((model) => model.scale), [models])

  useLayoutEffect(() => {
    const cells = new Set(houses.map((h) => h.cell))
    // Only a placement grows houses; a loaded game or a reset shows its cities at once.
    if (lastPlacement)
      for (const cell of cells) if (!known.current.has(cell)) growing.current.set(cell, null)
    known.current = cells
    drawHouses(houses, meshes.current, scales, growing.current, null)
  }, [houses, scales, capacityKey, lastPlacement])

  useFrame(({ clock }) => {
    if (growing.current.size > 0)
      drawHouses(houses, meshes.current, scales, growing.current, clock.elapsedTime)
  })

  return (
    <group visible={houses.length > 0}>
      {models.map(({ geometry }, kind) => (
        <instancedMesh
          key={`${kind}-${capacities[kind]}`}
          ref={(mesh) => {
            meshes.current[kind] = mesh
          }}
          args={[geometry, material, capacities[kind]!]}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  )
}

useGLTF.preload(housesUrl, false)
