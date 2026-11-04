import { useMemo } from 'react'
import { CylinderGeometry, InstancedMesh, Matrix4, MeshStandardMaterial, Vector3 } from 'three'
import { coordKey } from '../game/coords'
import { useGameStore } from '../store/gameStore'
import { BASE_HEIGHT, coordToWorld, TERRAIN_HEIGHT } from './layout'

/** Number of road dots along each orthogonal cell transition. */
const DOTS_PER_STEP = 4
/** Dot radius in world units. */
const DOT_RADIUS = 0.032
const DOT_HEIGHT = 0.01

const dotGeometry = new CylinderGeometry(DOT_RADIUS, DOT_RADIUS, DOT_HEIGHT, 12)
const dotMaterial = new MeshStandardMaterial({
  color: '#fffbf0',
  emissive: '#ffd875',
  emissiveIntensity: 0.25,
  roughness: 0.4,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
})

/**
 * 3D visual rendering of active roads.
 * Connects black cities (size >= 5) with a line of dots running along the shortest valid route.
 */
export function Roads() {
  const routes = useGameStore((s) => s.routes ?? [])
  const board = useGameStore((s) => s.board)

  const transforms = useMemo(() => {
    if (!routes || routes.length === 0) return []

    const matrices: Matrix4[] = []
    const tempMatrix = new Matrix4()
    const tempPosition = new Vector3()

    for (const route of routes) {
      const path = route.path
      if (path.length < 2) continue

      for (let i = 0; i < path.length - 1; i++) {
        const cA = path[i]!
        const cB = path[i + 1]!

        const [xA, zA] = coordToWorld(cA)
        const [xB, zB] = coordToWorld(cB)

        const terrainA = board[coordKey(cA)]?.terrain ?? 'black'
        const terrainB = board[coordKey(cB)]?.terrain ?? 'black'

        const yA = BASE_HEIGHT + (TERRAIN_HEIGHT[terrainA] ?? 0.05) + DOT_HEIGHT / 2 + 0.005
        const yB = BASE_HEIGHT + (TERRAIN_HEIGHT[terrainB] ?? 0.05) + DOT_HEIGHT / 2 + 0.005

        for (let s = 0; s < DOTS_PER_STEP; s++) {
          const t = (s + 0.5) / DOTS_PER_STEP
          const x = (1 - t) * xA + t * xB
          const z = (1 - t) * zA + t * zB
          const y = (1 - t) * yA + t * yB

          tempPosition.set(x, y, z)
          tempMatrix.makeTranslation(tempPosition.x, tempPosition.y, tempPosition.z)
          matrices.push(tempMatrix.clone())
        }
      }
    }

    return matrices
  }, [routes, board])

  if (transforms.length === 0) return null

  return (
    <primitive
      object={(() => {
        const mesh = new InstancedMesh(dotGeometry, dotMaterial, transforms.length)
        transforms.forEach((mat, idx) => mesh.setMatrixAt(idx, mat))
        mesh.instanceMatrix.needsUpdate = true
        mesh.castShadow = true
        mesh.receiveShadow = true
        return mesh
      })()}
    />
  )
}

