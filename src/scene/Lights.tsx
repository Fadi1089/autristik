import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { Vector3 } from 'three'
import type { DirectionalLight } from 'three'

/** Sun direction relative to whatever the camera is looking at. */
const SUN_OFFSET = new Vector3(-7, 11, 3)
const SHADOW_EXTENT = 14

interface ControlsWithTarget {
  target: Vector3
}

/**
 * Warm hemisphere fill plus a soft shadow-casting sun. The sun and its shadow
 * frustum follow the camera target so shadows stay crisp wherever you pan.
 */
export function Lights() {
  const sun = useRef<DirectionalLight>(null)
  const controls = useThree((s) => s.controls) as unknown as ControlsWithTarget | null

  useFrame(() => {
    const light = sun.current
    if (!light) return
    const focus = controls?.target ?? new Vector3()
    light.position.copy(focus).add(SUN_OFFSET)
    light.target.position.copy(focus)
    light.target.updateMatrixWorld()
  })

  return (
    <>
      <hemisphereLight args={['#fff4e0', '#b9a684', 1.4]} />
      <directionalLight
        ref={sun}
        intensity={2.4}
        color="#fff1d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={4}
      />
    </>
  )
}
