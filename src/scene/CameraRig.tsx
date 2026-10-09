import { MapControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { ComponentRef } from 'react'
import { Vector3 } from 'three'
import { boardTiles } from '../game/board'
import { useGameStore } from '../store/gameStore'
import { useViewStore } from '../store/viewStore'
import { coordToWorld } from './layout'

/** How far past the outermost tile the camera target may wander. */
const PAN_MARGIN = 6
/** Radians of pivot per pixel of horizontal scroll. */
const PIVOT_PER_PIXEL = 0.0025
/** How quickly queued pivot and zoom are applied; higher is snappier. */
const PIVOT_EASING = 14
const ZOOM_EASING = 10
/** How quickly the camera glides after the keyboard cursor. */
const FOLLOW_EASING = 5
/** Slow drift around the board while the menu is open (radians per second). */
const MENU_ORBIT_SPEED = 0.12
const MIN_DISTANCE = 4
const MAX_DISTANCE = 28

const UP = new Vector3(0, 1, 0)
const shift = new Vector3()
const offset = new Vector3()

/**
 * Map-style camera: left-drag (or one finger) pans, wheel/pinch zooms, right-drag
 * rotates with a limited tilt range. Horizontal scrolling on a touchpad, or Shift +
 * mouse wheel, pivots the view around the board. Keyboard pivot and zoom arrive as
 * requests on the view store, and the camera glides after the keyboard cursor until
 * the player drags the view. The target is kept near the board so you cannot lose it.
 */
export function CameraRig() {
  const controls = useRef<ComponentRef<typeof MapControls>>(null)
  const pendingPivot = useRef(0)
  const pendingZoom = useRef(0)
  const following = useRef(false)
  /** Heading to return to when the menu closes, since the menu slowly orbits the board. */
  const headingBeforeMenu = useRef(0)
  const board = useGameStore((s) => s.board)
  const menuOpen = useGameStore((s) => s.menuOpen)
  const canvas = useThree((s) => s.gl.domElement)

  const bounds = useMemo(() => {
    const xs: number[] = []
    const zs: number[] = []
    for (const tile of boardTiles(board)) {
      const [x, z] = coordToWorld(tile.coord)
      xs.push(x)
      zs.push(z)
    }
    return {
      minX: Math.min(...xs) - PAN_MARGIN,
      maxX: Math.max(...xs) + PAN_MARGIN,
      minZ: Math.min(...zs) - PAN_MARGIN,
      maxZ: Math.max(...zs) + PAN_MARGIN,
    }
  }, [board])

  useEffect(() => {
    const azimuth = useViewStore.getState().azimuth
    if (menuOpen) {
      headingBeforeMenu.current = azimuth
    } else {
      // Ease back the short way round to where the player left the camera.
      const diff = headingBeforeMenu.current - azimuth
      pendingPivot.current = Math.atan2(Math.sin(diff), Math.cos(diff))
    }
  }, [menuOpen])

  // Follow the keyboard cursor whenever it moves; stop as soon as the player drags.
  useEffect(
    () =>
      useGameStore.subscribe((s, prev) => {
        if (s.cursor && s.cursor !== prev.cursor) following.current = true
        if (!s.cursor) following.current = false
      }),
    [],
  )
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const stop = () => (following.current = false)
    c.addEventListener('start', stop)
    return () => c.removeEventListener('start', stop)
  }, [])

  // Turn sideways scrolling into pivot before MapControls sees it as zoom. Listening on
  // the canvas's parent in the capture phase runs this ahead of the controls' handler.
  useEffect(() => {
    const host = canvas.parentElement
    if (!host) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return // trackpad pinch: leave it to zoom
      const sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY)
      if (!sideways && !e.shiftKey) return
      e.preventDefault()
      e.stopPropagation()
      // Some browsers already map Shift + wheel to deltaX; others keep it on deltaY.
      const pixels = (sideways ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 16 : 1)
      pendingPivot.current += pixels * PIVOT_PER_PIXEL
    }
    host.addEventListener('wheel', onWheel, { capture: true, passive: false })
    return () => host.removeEventListener('wheel', onWheel, { capture: true })
  }, [canvas])

  useFrame(({ camera }, delta) => {
    const c = controls.current
    if (!c) return
    const { target } = c

    const view = useViewStore.getState()
    if (view.pivotRequest !== 0 || view.zoomRequest !== 0) {
      pendingPivot.current += view.pivotRequest
      pendingZoom.current += view.zoomRequest
      useViewStore.setState({ pivotRequest: 0, zoomRequest: 0 })
    }

    if (menuOpen) pendingPivot.current += delta * MENU_ORBIT_SPEED
    const step = pendingPivot.current * (1 - Math.exp(-delta * PIVOT_EASING))
    if (Math.abs(step) > 1e-5) {
      pendingPivot.current -= step
      offset.copy(camera.position).sub(target).applyAxisAngle(UP, step)
      camera.position.copy(target).add(offset)
    }

    const zoomStep = pendingZoom.current * (1 - Math.exp(-delta * ZOOM_EASING))
    if (Math.abs(zoomStep) > 1e-5) {
      pendingZoom.current -= zoomStep
      offset.copy(camera.position).sub(target)
      const distance = Math.min(
        MAX_DISTANCE,
        Math.max(MIN_DISTANCE, offset.length() * Math.exp(-zoomStep)),
      )
      camera.position.copy(target).add(offset.setLength(distance))
    }

    const cursor = following.current ? useGameStore.getState().cursor : null
    if (cursor) {
      const [x, z] = coordToWorld(cursor)
      const k = 1 - Math.exp(-delta * FOLLOW_EASING)
      shift.set((x - target.x) * k, 0, (z - target.z) * k)
      target.add(shift)
      camera.position.add(shift)
    }

    shift.set(
      Math.min(bounds.maxX, Math.max(bounds.minX, target.x)) - target.x,
      0,
      Math.min(bounds.maxZ, Math.max(bounds.minZ, target.z)) - target.z,
    )
    if (shift.lengthSq() > 0) {
      target.add(shift)
      camera.position.add(shift)
    }
    camera.lookAt(target)

    // Publish the view so the HUD preview and keyboard movement can match it.
    offset.copy(camera.position).sub(target)
    const azimuth = Math.atan2(offset.x, offset.z)
    const polar = Math.atan2(Math.hypot(offset.x, offset.z), offset.y)
    const moved =
      Math.abs(azimuth - view.azimuth) > 0.002 ||
      Math.abs(polar - view.polar) > 0.002 ||
      Math.abs(target.x - view.focusX) > 0.01 ||
      Math.abs(target.z - view.focusZ) > 0.01
    if (moved) view.setView({ azimuth, polar, focusX: target.x, focusZ: target.z })
  })

  return (
    <MapControls
      ref={controls}
      makeDefault
      enabled={!menuOpen}
      enableDamping
      dampingFactor={0.08}
      screenSpacePanning={false}
      minDistance={MIN_DISTANCE}
      maxDistance={MAX_DISTANCE}
      minPolarAngle={0.25}
      maxPolarAngle={1.1}
    />
  )
}
