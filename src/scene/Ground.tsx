import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useRef } from 'react'
import { Plane, Quaternion, Vector2, Vector3 } from 'three'
import { coordsEqual } from '../game/coords'
import type { Coord } from '../game/coords'
import { SCENE_COLORS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { worldToCoord } from './layout'

/** Pointer travel (px) above which a press counts as a camera drag, not a click. */
const CLICK_TOLERANCE = 6
/** Fingers wobble more than mice, so taps get a little more slack. */
const TAP_TOLERANCE = 12

const GROUND_PLANE = new Plane(new Vector3(0, 1, 0), 0)
const pointer = new Vector2()
const hit = new Vector3()

/**
 * Large ground plane. Besides catching shadows, it is the pointer target used to
 * work out which grid square is under the cursor (placed tiles have no handlers,
 * so rays pass through them to the ground).
 *
 * A mouse previews on hover and places on click. Touch and pen have no hover, so
 * the first tap on a square shows the preview and a second tap on it places the tile.
 * When the camera moves under a still mouse, the hovered square follows the mouse.
 */
export function Ground() {
  const setHover = useGameStore((s) => s.setHover)
  const place = useGameStore((s) => s.place)
  // Click events don't reliably say which kind of pointer made them, so remember it
  // from the press.
  const pointerType = useRef('mouse')
  /** Cell the mouse was last over, so a still or twitching mouse doesn't take over from the keys. */
  const mouseCell = useRef<Coord | null>(null)
  /** Where the mouse is on screen while it is over the ground, in client pixels. */
  const mouseAt = useRef<{ x: number; y: number } | null>(null)
  /** The camera as last seen, to tell when it has moved. */
  const lastCamera = useRef({ position: new Vector3(), quaternion: new Quaternion() })

  const squareAt = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    return worldToCoord(e.point.x, e.point.z)
  }

  /** Hovers `c` with the mouse, unless the mouse is already on it. */
  const hoverWithMouse = (c: Coord) => {
    // Only moving onto another cell hands control back from the keyboard cursor.
    if (mouseCell.current && coordsEqual(mouseCell.current, c)) return
    mouseCell.current = c
    setHover(c)
  }

  // Pointer events only come when the mouse moves, so a pan, zoom or pivot under a still
  // mouse would leave the hovered square (and the ghost) behind. Look again under the mouse.
  useFrame(({ camera, gl, raycaster }) => {
    const seen = lastCamera.current
    if (camera.position.equals(seen.position) && camera.quaternion.equals(seen.quaternion)) return
    seen.position.copy(camera.position)
    seen.quaternion.copy(camera.quaternion)
    const at = mouseAt.current
    const { cursor, menuOpen } = useGameStore.getState()
    // The keyboard cursor keeps the ghost while it is steering, even as the camera follows it.
    if (!at || cursor || menuOpen) return
    const rect = gl.domElement.getBoundingClientRect()
    pointer.set(
      ((at.x - rect.left) / rect.width) * 2 - 1,
      -((at.y - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)
    if (raycaster.ray.intersectPlane(GROUND_PLANE, hit)) hoverWithMouse(worldToCoord(hit.x, hit.z))
  })

  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position-y={-0.002}
      receiveShadow
      onPointerDown={(e) => (pointerType.current = e.nativeEvent.pointerType || 'mouse')}
      onPointerMove={(e) => {
        if (e.nativeEvent.pointerType !== 'mouse') return
        mouseAt.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
        hoverWithMouse(squareAt(e))
      }}
      onPointerLeave={(e) => {
        // A lifted finger also "leaves"; that mustn't wipe the preview it just made.
        if (e.nativeEvent.pointerType !== 'mouse') return
        mouseCell.current = null
        mouseAt.current = null
        // Leaving the board shouldn't wipe a ghost the keyboard is steering.
        if (!useGameStore.getState().cursor) setHover(null)
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
