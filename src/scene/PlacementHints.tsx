import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Matrix4, PlaneGeometry } from 'three'
import type { InstancedMesh, MeshBasicMaterial } from 'three'
import { SCENE_COLORS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { coordToWorld, TILE_SIZE } from './layout'
import { placementArea } from './placementArea'

/** One flat cell of the area, lying on the ground a little above the grid lines. */
const cellGeometry = new PlaneGeometry(TILE_SIZE, TILE_SIZE).rotateX(-Math.PI / 2)
const AREA_HEIGHT = 0.003
const OPACITY = 0.3
/** Each rebuild grows the buffer to a power of two, so the mesh is rarely remade. */
function capacityFor(count: number): number {
  return Math.max(256, 2 ** Math.ceil(Math.log2(Math.max(1, count))))
}

const matrix = new Matrix4()

/**
 * A flat green area on the ground over every cell the piece in hand can cover at a spot where
 * it fits as it is turned now. It follows the piece's shape and rotation, so turning it
 * reshapes the area.
 */
export function PlacementHints() {
  const board = useGameStore((s) => s.board)
  const current = useGameStore((s) => s.current)
  const rotation = useGameStore((s) => s.rotation)
  const menuOpen = useGameStore((s) => s.menuOpen)

  const cells = useMemo(
    () => placementArea({ board, current, rotation }),
    [board, current, rotation],
  )
  const capacity = capacityFor(cells.length)
  const mesh = useRef<InstancedMesh>(null)
  const material = useRef<MeshBasicMaterial>(null)

  useLayoutEffect(() => {
    const area = mesh.current
    if (!area) return
    cells.forEach((cell, i) => {
      const [x, z] = coordToWorld(cell)
      area.setMatrixAt(i, matrix.makeTranslation(x, AREA_HEIGHT, z))
    })
    area.count = cells.length
    area.instanceMatrix.needsUpdate = true
    area.computeBoundingSphere()
  }, [cells, capacity])

  // A slow breath, so the area reads as a hint rather than part of the board.
  useFrame(({ clock }) => {
    if (material.current)
      material.current.opacity = OPACITY * (0.8 + 0.2 * Math.sin(clock.elapsedTime * 2.2))
  })

  return (
    <instancedMesh
      key={capacity}
      ref={mesh}
      args={[cellGeometry, undefined, capacity]}
      visible={!menuOpen}
      renderOrder={1}
    >
      <meshBasicMaterial
        ref={material}
        color={SCENE_COLORS.placementValid}
        transparent
        opacity={OPACITY}
        depthWrite={false}
      />
    </instancedMesh>
  )
}
