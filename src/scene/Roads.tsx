import { useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, CylinderGeometry, Matrix4, MeshStandardMaterial } from 'three'
import type { InstancedMesh } from 'three'
import type { Board } from '../game/board'
import { getSquare } from '../game/board'
import type { Coord } from '../game/coords'
import type { Route } from '../game/routes'
import { SCENE_COLORS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { BASE_HEIGHT, coordToWorld, TERRAIN_HEIGHT, TILE_SIZE } from './layout'
import { useAfterDrop } from './useAfterDrop'

/** Width of the road, about a fifth of a cell. */
const ROAD_WIDTH = 0.09
const ROAD_THICKNESS = 0.006

/** Half a step, from a cell's centre to its edge; stretched along x or z for each piece of road. */
const stretchGeometry = new BoxGeometry(1, ROAD_THICKNESS, 1)
/** A round patch at each cell's centre, so turns and ends are rounded. */
const jointGeometry = new CylinderGeometry(ROAD_WIDTH / 2, ROAD_WIDTH / 2, ROAD_THICKNESS, 20)
const material = new MeshStandardMaterial({ color: SCENE_COLORS.road, roughness: 0.95 })

/** Each rebuild grows the buffers to a power of two, so the meshes are rarely remade. */
function capacityFor(count: number): number {
  return Math.max(64, 2 ** Math.ceil(Math.log2(Math.max(1, count))))
}

const matrix = new Matrix4()

/** Height the road lies at on the cell `c`: just on top of its biome. */
function roadHeight(board: Board, c: Coord): number {
  const terrain = getSquare(board, c)?.terrain ?? 'black'
  return BASE_HEIGHT + TERRAIN_HEIGHT[terrain] + ROAD_THICKNESS / 2 + 0.001
}

interface RoadPieces {
  /** Centre and size of each straight half step: [x, y, z, width along x, depth along z]. */
  readonly stretches: [number, number, number, number, number][]
  readonly joints: [number, number, number][]
}

/**
 * The road as flat pieces lying on each cell's own biome: a round joint on every cell it
 * crosses, and from each cell a straight half step towards the next one. Biomes stand at
 * different heights, so a road steps down or up at a cell's edge, as the ground does. It stops
 * at the edge of each city, whose squares are taken up by houses.
 */
function roadPieces(board: Board, routes: readonly Route[]): RoadPieces {
  const stretches: RoadPieces['stretches'] = []
  const joints: RoadPieces['joints'] = []
  const half = TILE_SIZE / 2
  for (const { path } of routes)
    path.forEach((c, i) => {
      if (i === 0 || i === path.length - 1) return
      const [x, z] = coordToWorld(c)
      const y = roadHeight(board, c)
      joints.push([x, y, z])
      for (const other of [path[i - 1], path[i + 1]]) {
        if (!other) continue
        const dq = other.q - c.q
        const dr = other.r - c.r
        stretches.push([
          x + (dq * half) / 2,
          y,
          z + (dr * half) / 2,
          dq ? half : ROAD_WIDTH,
          dr ? half : ROAD_WIDTH,
        ])
      }
    })
  return { stretches, joints }
}

/** The roads between cities, each a flat cream path along its shortest allowed way. */
export function Roads() {
  const routes = useGameStore((s) => s.routes)
  const board = useGameStore((s) => s.board)
  const lastPlacement = useGameStore((s) => s.lastPlacement)

  const latest = useMemo(() => roadPieces(board, routes), [board, routes])
  const { stretches, joints } = useAfterDrop(latest, lastPlacement !== null)
  const stretchCapacity = capacityFor(stretches.length)
  const jointCapacity = capacityFor(joints.length)
  const stretchMesh = useRef<InstancedMesh>(null)
  const jointMesh = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = stretchMesh.current
    if (!mesh) return
    stretches.forEach(([x, y, z, width, depth], i) =>
      mesh.setMatrixAt(i, matrix.makeScale(width, 1, depth).setPosition(x, y, z)),
    )
    mesh.count = stretches.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [stretches, stretchCapacity])

  useLayoutEffect(() => {
    const mesh = jointMesh.current
    if (!mesh) return
    joints.forEach(([x, y, z], i) => mesh.setMatrixAt(i, matrix.makeTranslation(x, y, z)))
    mesh.count = joints.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [joints, jointCapacity])

  return (
    <group visible={joints.length > 0}>
      <instancedMesh
        key={`s${stretchCapacity}`}
        ref={stretchMesh}
        args={[stretchGeometry, material, stretchCapacity]}
        receiveShadow
      />
      <instancedMesh
        key={`j${jointCapacity}`}
        ref={jointMesh}
        args={[jointGeometry, material, jointCapacity]}
        receiveShadow
      />
    </group>
  )
}
