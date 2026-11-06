import { useLayoutEffect, useMemo, useRef } from 'react'
import { CylinderGeometry, ExtrudeGeometry, Object3D, Shape } from 'three'
import type { InstancedMesh } from 'three'
import { modeRules } from '../game/modes'
import type { GridBounds } from '../game/modes'
import { SCENE_COLORS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { gridEdges, TILE_SIZE } from './layout'

/** A picket's width along the fence, its thickness across it, and its height to the tip. */
const POST_WIDTH = 0.15
const POST_THICKNESS = 0.06
const POST_HEIGHT = 0.26
/** How far the pointed top rises above the picket's shoulders. */
const POST_POINT = 0.06
/** The chamfer on every edge of a picket. */
const POST_BEVEL = 0.012
/** The two rails' radius and their heights above the ground. */
const RAIL_RADIUS = 0.022
const RAIL_HEIGHTS = [0.1, 0.18] as const
/** How far out from the outer cell edges the fence stands, so it clears the pieces. */
const FENCE_OFFSET = 0.05

/**
 * A picket with a pointed top, standing on the ground with its width along local x and its
 * thickness along local z, chamfered all round.
 */
function buildPost(): ExtrudeGeometry {
  // The bevel grows the outline, so the shape is drawn that much smaller.
  const half = POST_WIDTH / 2 - POST_BEVEL
  const shoulder = POST_HEIGHT - POST_POINT - POST_BEVEL
  const shape = new Shape()
    .moveTo(-half, POST_BEVEL)
    .lineTo(half, POST_BEVEL)
    .lineTo(half, shoulder)
    .lineTo(0, POST_HEIGHT - POST_BEVEL)
    .lineTo(-half, shoulder)
    .closePath()
  const depth = POST_THICKNESS - 2 * POST_BEVEL
  return new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: POST_BEVEL,
    bevelThickness: POST_BEVEL,
    bevelSegments: 1,
  }).translate(0, 0, -depth / 2)
}

const postGeometry = buildPost()

/** A rail one unit long along local x; each instance is stretched to its span. */
const railGeometry = new CylinderGeometry(RAIL_RADIUS, RAIL_RADIUS, 1, 10).rotateZ(Math.PI / 2)

interface Placement {
  readonly x: number
  readonly z: number
  /** Turn about the vertical, so local x runs along the fence. */
  readonly yaw: number
  /** Rails only: the length of the span. */
  readonly length?: number
}

/**
 * Pickets and rail spans round a grid: one picket per cell edge along each side, with the
 * corner ones turned to face out diagonally, and rails between each pair.
 */
function fenceLayout(bounds: GridBounds): { posts: Placement[]; rails: Placement[] } {
  const [x0, z0, x1, z1] = gridEdges(bounds)
  const o = FENCE_OFFSET
  const corners = [
    [x0 - o, z0 - o],
    [x1 + o, z0 - o],
    [x1 + o, z1 + o],
    [x0 - o, z1 + o],
  ] as const
  const posts: Placement[] = []
  const rails: Placement[] = []
  corners.forEach(([ax, az], side) => {
    const [bx, bz] = corners[(side + 1) % 4]!
    const length = Math.hypot(bx - ax, bz - az)
    const spans = Math.max(1, Math.round(length / TILE_SIZE))
    const step = length / spans
    // Turning by yaw takes local x to (cos yaw, 0, -sin yaw): along this side.
    const yaw = Math.atan2(-(bz - az), bx - ax)
    for (let i = 0; i < spans; i++) {
      const t = i / spans
      const x = ax + (bx - ax) * t
      const z = az + (bz - az) * t
      posts.push({ x, z, yaw: i === 0 ? yaw + Math.PI / 4 : yaw })
      const mid = (i + 0.5) / spans
      rails.push({ x: ax + (bx - ax) * mid, z: az + (bz - az) * mid, yaw, length: step })
    }
  })
  return { posts, rails }
}

const dummy = new Object3D()

/**
 * A bounded grid's ground: a lighter field over its cells, fenced in with wooden pickets and
 * two rails, so it is plain where pieces may go. An endless board has none.
 */
export function PlayArea() {
  const bounds = useGameStore((s) => modeRules(s.mode).bounds)
  if (!bounds) return null
  return <FencedField bounds={bounds} />
}

function FencedField({ bounds }: { bounds: GridBounds }) {
  const { posts, rails } = useMemo(() => fenceLayout(bounds), [bounds])
  const postMesh = useRef<InstancedMesh>(null)
  const railMesh = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    posts.forEach(({ x, z, yaw }, i) => {
      dummy.position.set(x, 0, z)
      dummy.rotation.set(0, yaw, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      postMesh.current?.setMatrixAt(i, dummy.matrix)
    })
    rails.forEach(({ x, z, yaw, length = 1 }, i) =>
      RAIL_HEIGHTS.forEach((y, row) => {
        dummy.position.set(x, y, z)
        dummy.rotation.set(0, yaw, 0)
        dummy.scale.set(length, 1, 1)
        dummy.updateMatrix()
        railMesh.current?.setMatrixAt(i * RAIL_HEIGHTS.length + row, dummy.matrix)
      }),
    )
    for (const mesh of [postMesh.current, railMesh.current]) {
      if (!mesh) continue
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    }
  }, [posts, rails])

  const [x0, z0, x1, z1] = gridEdges(bounds)
  return (
    <group>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[(x0 + x1) / 2, -0.001, (z0 + z1) / 2]}
        receiveShadow
      >
        <planeGeometry args={[x1 - x0, z1 - z0]} />
        <meshStandardMaterial color={SCENE_COLORS.field} roughness={1} />
      </mesh>
      <instancedMesh
        ref={postMesh}
        args={[postGeometry, undefined, posts.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={SCENE_COLORS.fence} roughness={0.75} flatShading />
      </instancedMesh>
      <instancedMesh
        ref={railMesh}
        args={[railGeometry, undefined, rails.length * RAIL_HEIGHTS.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={SCENE_COLORS.fence} roughness={0.75} />
      </instancedMesh>
    </group>
  )
}
