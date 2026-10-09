import type { ThreeEvent } from '@react-three/fiber'
import { canPlace } from '../game/matching'
import { SCENE_COLORS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { worldToCoord } from './layout'

/** Pointer travel (px) above which a press counts as a camera drag, not a click. */
const CLICK_TOLERANCE = 6

/**
 * Large ground plane. Besides catching shadows, it is the pointer target used to
 * work out which grid square is under the cursor (placed tiles have no handlers,
 * so rays pass through them to the ground).
 */
export function Ground() {
  const setHover = useGameStore((s) => s.setHover)
  const place = useGameStore((s) => s.place)

  const squareAt = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const c = worldToCoord(e.point.x, e.point.z)
    return canPlace(useGameStore.getState().board, c) ? c : null
  }

  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position-y={-0.002}
      receiveShadow
      onPointerMove={(e) => setHover(squareAt(e))}
      onPointerLeave={() => setHover(null)}
      onClick={(e) => {
        if (e.delta > CLICK_TOLERANCE) return
        const c = squareAt(e)
        if (c) place(c)
      }}
    >
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color={SCENE_COLORS.ground} roughness={1} />
    </mesh>
  )
}
