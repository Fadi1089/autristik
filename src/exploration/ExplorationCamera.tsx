import { MapControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useRef } from 'react'
import type { ComponentRef } from 'react'
import { Vector3 } from 'three'
import { actionForCode } from '../input/bindings'
import type { Action } from '../input/bindings'
import { useSettingsStore } from '../store/settingsStore'
import { cameraPan, GRID_CAMERA } from './gridMath'

export function ExplorationCamera({
  resetToken,
  onCentreChange,
}: {
  resetToken: number
  onCentreChange: (x: number, z: number) => void
}) {
  const controls = useRef<ComponentRef<typeof MapControls>>(null)
  const held = useRef(new Map<string, Action>())
  const elapsed = useRef(0)
  const camera = useThree((s) => s.camera)
  const reset = useCallback(() => {
    const c = controls.current
    if (!c) return
    held.current.clear()
    const damping = c.enableDamping
    c.enableDamping = false
    c.reset()
    c.enableDamping = damping
    onCentreChange(0, 0)
  }, [onCentreChange])

  useEffect(() => {
    reset()
  }, [resetToken, reset])
  useEffect(() => {
    const clear = () => held.current.clear()
    const keyup = (event: KeyboardEvent) => {
      held.current.delete(event.code)
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const element = event.target as HTMLElement | null
      if (element?.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(element?.tagName ?? ''))
        return
      const c = controls.current
      if (!c) return
      if (event.code === 'KeyC' || event.key === '!') {
        event.preventDefault()
        if (!event.repeat) reset()
        return
      }
      const action = actionForCode(useSettingsStore.getState().bindings, event.code)
      if (!action) return
      if (action.startsWith('move')) {
        event.preventDefault()
        held.current.set(event.code, action)
      } else if (action === 'pivotLeft' || action === 'pivotRight') {
        event.preventDefault()
        if (event.repeat) return
        const offset = camera.position.clone().sub(c.target)
        const heading = Math.atan2(offset.x, offset.z)
        const turn = action === 'pivotLeft' ? -1 : 1
        const quarter = Math.PI / 2
        const aligned =
          turn < 0
            ? Math.ceil(heading / quarter - 1e-6) - 1
            : Math.floor(heading / quarter + 1e-6) + 1
        offset.applyAxisAngle(new Vector3(0, 1, 0), aligned * quarter - heading)
        camera.position.copy(c.target).add(offset)
        c.update()
      } else if (action === 'zoomIn' || action === 'zoomOut') {
        event.preventDefault()
        const offset = camera.position.clone().sub(c.target)
        const scale = action === 'zoomIn' ? Math.exp(-0.14) : Math.exp(0.14)
        offset.setLength(
          Math.max(
            GRID_CAMERA.minDistance,
            Math.min(GRID_CAMERA.maxDistance, offset.length() * scale),
          ),
        )
        camera.position.copy(c.target).add(offset)
        c.update()
      }
    }
    window.addEventListener('keydown', keydown)
    window.addEventListener('keyup', keyup)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', clear)
    return () => {
      clear()
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', clear)
    }
  }, [camera, reset])

  useFrame((_, seconds) => {
    const c = controls.current
    if (!c) return
    const actions = new Set(held.current.values())
    const x = Number(actions.has('moveRight')) - Number(actions.has('moveLeft'))
    const y = Number(actions.has('moveDown')) - Number(actions.has('moveUp'))
    if (x || y) {
      const shift = cameraPan(
        x,
        y,
        c.getAzimuthalAngle(),
        camera.position.distanceTo(c.target),
        seconds,
      )
      c.target.add(shift)
      camera.position.add(shift)
      c.update()
    }
    elapsed.current += seconds
    if (elapsed.current > 0.15) {
      onCentreChange(Math.round(c.target.x) || 0, Math.round(c.target.z) || 0)
      elapsed.current = 0
    }
  }, -0.5)

  return (
    <MapControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      screenSpacePanning={false}
      minDistance={GRID_CAMERA.minDistance}
      maxDistance={GRID_CAMERA.maxDistance}
      minPolarAngle={GRID_CAMERA.minPolarAngle}
      maxPolarAngle={GRID_CAMERA.maxPolarAngle}
    />
  )
}
