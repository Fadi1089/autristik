import type { ThreeEvent } from '@react-three/fiber'
import { useRef } from 'react'
import { coordsEqual } from '../game/coords'
import { canPlace } from '../game/matching'
import { SCENE_COLORS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { worldToCoord } from './layout'

/** Pointer travel (px) above which a press counts as a camera drag, not a click. */
const CLICK_TOLERANCE = 6
/** Fingers wobble more than mice, so taps get a little more slack. */
const TAP_TOLERANCE = 12

/**
 * Large ground plane. Besides catching shadows, it is the pointer target used to
 * work out which grid square is under the cursor (placed tiles have no handlers,
 * so rays pass through them to the ground).
 *
 * A mouse previews on hover and places on click. Touch and pen have no hover, so
 * the first tap on a square shows the preview and a second tap on it places the tile.
 */
export function Ground() {
  const setHover = useGameStore((s) => s.setHover)
  const place = useGameStore((s) => s.place)
  // Click events don't reliably say which kind of pointer made them, so remember it
  // from the press.
  const pointerType = useRef('mouse')

  const squareAt = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const c = worldToCoord(e.point.x, e.point.z)
    return canPlace(useGameStore.getState().board, c) ? c : null
  }

  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position-y={-0.002}
      receiveShadow
      onPointerDown={(e) => (pointerType.current = e.nativeEvent.pointerType || 'mouse')}
      onPointerMove={(e) => {
        if (e.nativeEvent.pointerType === 'mouse') setHover(squareAt(e))
      }}
      onPointerLeave={(e) => {
        // A lifted finger also "leaves"; that mustn't wipe the preview it just made.
        if (e.nativeEvent.pointerType === 'mouse') setHover(null)
      }}
      onClick={(e) => {
        const mouse = pointerType.current === 'mouse'
        if (e.delta > (mouse ? CLICK_TOLERANCE : TAP_TOLERANCE)) return
        const c = squareAt(e)
        if (mouse) {
          if (c) place(c)
          return
        }
        const { hover } = useGameStore.getState()
        if (c && hover && coordsEqual(hover, c)) place(c)
        else setHover(c)
      }}
    >
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color={SCENE_COLORS.ground} roughness={1} />
    </mesh>
  )
}
