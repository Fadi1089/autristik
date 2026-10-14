import { MapControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { ComponentRef } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import { boardTiles } from '../game/board'
import { FALL_DISTANCE } from '../game/falling'
import { useGameStore } from '../store/gameStore'
import type { CameraFollow } from '../store/gameStore'
import { useViewStore } from '../store/viewStore'
import { coordToWorld } from './layout'
import { isTileInFrame, planFallFraming, planStartFraming } from './cameraFraming'
import type { FallFraming } from './cameraFraming'
import { measureCameraViewport } from './hudViewport'
import type { CameraViewport } from './hudViewport'

/** How far past the outermost tile the camera target may wander. */
const PAN_MARGIN = 6
/** Radians of pivot per pixel of horizontal scroll. */
const PIVOT_PER_PIXEL = 0.0025
/** How quickly queued pivot and zoom are applied; higher is snappier. */
const PIVOT_EASING = 14
const ZOOM_EASING = 10
/** How quickly the camera glides after a manual lateral movement. */
const FOLLOW_EASING = 5
/** Slow drift around the board while the menu is open (radians per second). */
const MENU_ORBIT_SPEED = 0.12
const MIN_DISTANCE = 4
// Narrow windows may need extra distance to fit the corridor beside the fixed tile tray.
const MAX_DISTANCE = 256

const UP = new Vector3(0, 1, 0)
const shift = new Vector3()
const offset = new Vector3()

/**
 * Map-style camera: left-drag (or one finger) pans, wheel/pinch zooms, right-drag
 * rotates with a limited tilt range. Horizontal scrolling on a touchpad, or Shift +
 * mouse wheel, pivots the view around the board. Keyboard pivot and zoom arrive as
 * requests on the view store. Manual lateral inputs request following. An off-screen
 * falling tile or an explicit shortcut reframes the tile and its destination together.
 */
export function CameraRig() {
  const controls = useRef<ComponentRef<typeof MapControls>>(null)
  const pendingPivot = useRef(0)
  const alignedPivot = useRef<number | null>(null)
  const pendingZoom = useRef(0)
  const following = useRef<CameraFollow | null>(null)
  const recentering = useRef<FallFraming | null>(null)
  const framingTarget = useRef<Vector3 | null>(null)
  const viewport = useRef<CameraViewport | undefined>(undefined)
  const viewportElapsed = useRef(0)
  const interacting = useRef(false)
  const starting = useRef(false)
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
    if (!xs.length) {
      xs.push(0)
      zs.push(0)
    }
    return {
      minX: Math.min(...xs) - FALL_DISTANCE - PAN_MARGIN,
      maxX: Math.max(...xs) + FALL_DISTANCE + PAN_MARGIN,
      minZ: Math.min(...zs) - FALL_DISTANCE - PAN_MARGIN,
      maxZ: Math.max(...zs) + FALL_DISTANCE + PAN_MARGIN,
    }
  }, [board])

  useEffect(() => {
    const azimuth = useViewStore.getState().azimuth
    if (menuOpen) {
      headingBeforeMenu.current = azimuth
      alignedPivot.current = null
      pendingPivot.current = 0
      useViewStore.setState({ pivotTarget: null, pivotRequest: 0 })
    } else {
      // Ease back the short way round to where the player left the camera.
      const diff = headingBeforeMenu.current - azimuth
      pendingPivot.current = Math.atan2(Math.sin(diff), Math.cos(diff))
    }
  }, [menuOpen])

  // Capture only manual lateral requests. Gravity never updates this target.
  useEffect(
    () =>
      useGameStore.subscribe((s, prev) => {
        if (s.runId !== prev.runId) {
          starting.current = true
          framingTarget.current = null
        }
        if (s.cameraMove !== prev.cameraMove || s.cameraFollow !== prev.cameraFollow) {
          following.current = s.cameraFollow
          recentering.current = null
        }
        if (s.fallDirection !== prev.fallDirection || s.board !== prev.board)
          recentering.current = null
      }),
    [],
  )
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const start = () => {
      interacting.current = true
      following.current = null
      recentering.current = null
      alignedPivot.current = null
      pendingPivot.current = 0
      useViewStore.setState({ pivotTarget: null, pivotRequest: 0 })
    }
    const end = () => {
      interacting.current = false
    }
    c.addEventListener('start', start)
    c.addEventListener('end', end)
    return () => {
      c.removeEventListener('start', start)
      c.removeEventListener('end', end)
    }
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
      if (alignedPivot.current !== null) pendingPivot.current = 0
      alignedPivot.current = null
      useViewStore.setState({ pivotTarget: null, pivotRequest: 0 })
      pendingPivot.current += pixels * PIVOT_PER_PIXEL
    }
    host.addEventListener('wheel', onWheel, { capture: true, passive: false })
    return () => host.removeEventListener('wheel', onWheel, { capture: true })
  }, [canvas])

  useFrame(({ camera }, delta) => {
    const c = controls.current
    if (!c) return
    const { target } = c

    viewportElapsed.current += delta
    if (!menuOpen && (starting.current || !viewport.current || viewportElapsed.current >= 0.1)) {
      const next = measureCameraViewport(canvas)
      const previous = viewport.current
      if (
        !previous ||
        Object.keys(next).some(
          (key) =>
            Math.abs(next[key as keyof CameraViewport] - previous[key as keyof CameraViewport]) >
            0.001,
        )
      )
        recentering.current = null
      viewport.current = next
      viewportElapsed.current = 0
    }

    if (
      starting.current &&
      !menuOpen &&
      camera instanceof PerspectiveCamera &&
      board === useGameStore.getState().board
    ) {
      const damping = c.enableDamping
      c.enableDamping = false // Consume old pan/rotation damping before applying the starting frame.
      c.reset()
      c.enableDamping = damping
      target.set(0, 0, 0)
      camera.position.set(0, 16, 16)
      camera.lookAt(target)
      const framing = planStartFraming(
        camera,
        useGameStore.getState(),
        MIN_DISTANCE,
        MAX_DISTANCE,
        viewport.current,
      )
      if (framing) {
        framingTarget.current = framing.target
        target.copy(framing.target)
        offset.set(0, 1, 1).normalize().multiplyScalar(framing.distance)
        camera.position.copy(target).add(offset)
        camera.lookAt(target)
      }
      following.current = null
      recentering.current = null
      pendingPivot.current = 0
      alignedPivot.current = null
      pendingZoom.current = 0
      headingBeforeMenu.current = 0
      starting.current = false
      useViewStore.setState({
        pivotTarget: null,
        pivotRequest: 0,
        zoomRequest: 0,
        recenterRequest: 0,
      })
    }

    const view = useViewStore.getState()
    const hasSideRequest = view.pivotTarget !== null && alignedPivot.current === null
    if (view.pivotRequest !== 0 || hasSideRequest || view.zoomRequest !== 0) {
      following.current = null
      recentering.current = null
      if (view.pivotRequest !== 0 || hasSideRequest) {
        if (view.pivotTarget !== null && alignedPivot.current === null)
          pendingPivot.current = view.pivotRequest
        else pendingPivot.current += view.pivotRequest
        alignedPivot.current = view.pivotTarget
      }
      pendingZoom.current += view.zoomRequest
      useViewStore.setState({ pivotRequest: 0, zoomRequest: 0 })
    }

    if (menuOpen) pendingPivot.current += delta * MENU_ORBIT_SPEED
    const finishPivot = alignedPivot.current !== null && Math.abs(pendingPivot.current) < 1e-4
    offset.copy(camera.position).sub(target)
    const heading = Math.atan2(offset.x, offset.z)
    const difference = (alignedPivot.current ?? heading) - heading
    const step = finishPivot
      ? Math.atan2(Math.sin(difference), Math.cos(difference))
      : pendingPivot.current * (1 - Math.exp(-delta * PIVOT_EASING))
    if (finishPivot || Math.abs(step) > 1e-5) {
      pendingPivot.current -= step
      offset.copy(camera.position).sub(target).applyAxisAngle(UP, step)
      camera.position.copy(target).add(offset)
    }
    if (finishPivot) {
      pendingPivot.current = 0
      alignedPivot.current = null
      useViewStore.setState({ pivotTarget: null })
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

    const follow = following.current
    if (follow !== null) {
      const k = 1 - Math.exp(-delta * FOLLOW_EASING)
      shift.set(
        follow.axis === 'q' ? (follow.value - target.x) * k : 0,
        0,
        follow.axis === 'r' ? (follow.value - target.z) * k : 0,
      )
      target.add(shift)
      camera.position.add(shift)
    }

    shift.set(
      Math.min(
        Math.max(bounds.maxX, framingTarget.current?.x ?? bounds.maxX),
        Math.max(Math.min(bounds.minX, framingTarget.current?.x ?? bounds.minX), target.x),
      ) - target.x,
      0,
      Math.min(
        Math.max(bounds.maxZ, framingTarget.current?.z ?? bounds.maxZ),
        Math.max(Math.min(bounds.minZ, framingTarget.current?.z ?? bounds.minZ), target.z),
      ) - target.z,
    )
    if (shift.lengthSq() > 0) {
      target.add(shift)
      camera.position.add(shift)
    }
    camera.lookAt(target)

    const game = useGameStore.getState()
    if (!menuOpen && !starting.current && game.falling && camera instanceof PerspectiveCamera) {
      const requested = view.recenterRequest !== 0
      const outside = !isTileInFrame(camera, game.falling, viewport.current)
      const settled = Math.abs(pendingPivot.current) < 0.01 && Math.abs(pendingZoom.current) < 0.01
      if (requested || (outside && settled && !interacting.current && !recentering.current)) {
        recentering.current = planFallFraming(
          camera,
          game,
          target,
          MIN_DISTANCE,
          MAX_DISTANCE,
          viewport.current,
        )
        framingTarget.current = recentering.current?.target ?? null
        following.current = null
        if (requested) {
          pendingPivot.current = 0
          alignedPivot.current = null
          pendingZoom.current = 0
          useViewStore.setState({ recenterRequest: 0, pivotTarget: null, pivotRequest: 0 })
        }
      }
      const framing = recentering.current
      if (framing) {
        const k = 1 - Math.exp(-delta * FOLLOW_EASING)
        offset.copy(camera.position).sub(target)
        const distance = offset.length() + (framing.distance - offset.length()) * k
        target.lerp(framing.target, k)
        camera.position.copy(target).add(offset.setLength(distance))
        camera.lookAt(target)
        if (
          target.distanceTo(framing.target) < 0.02 &&
          Math.abs(distance - framing.distance) < 0.02
        )
          recentering.current = null
      }
    }

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
      target={[0, 0, 0]}
    />
  )
}
