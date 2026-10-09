import { Float } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import { MathUtils } from 'three'
import type { Group } from 'three'
import type { Quadrants, Rotation } from '../game/tiles'
import { normalizeRotation } from '../game/tiles'
import { SCENE_COLORS } from '../palette'
import { useViewStore } from '../store/viewStore'
import { BASE_HEIGHT, TILE_SIZE } from './layout'
import { SquareTile } from './SquareTile'

const CAMERA_DISTANCE = 3.5
const LOOK_AT_Y = -0.12
/** Keep the preview looking down enough to read the tile's top, even when the board camera is low. */
const MAX_POLAR = 0.6
const SHEET_HEIGHT = 0.07
const MAX_SHEETS = 4
/** Height the next tile falls from when it is drawn. */
const DROP_FROM = 1.6

/** Small, stable wobble so the stack looks hand-piled rather than machined. */
function sheetJitter(i: number): [x: number, z: number, turn: number] {
  const a = Math.sin(i * 12.9898) * 43758.5453
  const b = Math.sin(i * 78.233) * 12345.678
  return [(a - Math.floor(a) - 0.5) * 0.06, (b - Math.floor(b) - 0.5) * 0.06, (a % 1) * 0.05]
}

/**
 * The tile in hand, floating above the stack, for the HUD tray. It spins to each
 * new rotation, drops in when drawn, and is viewed from the main camera's angle.
 */
export function TrayTile({
  quadrants,
  rotation,
  remaining,
}: {
  /** Unrotated tile; rotation is applied as an animated spin. */
  quadrants: Quadrants
  rotation: Rotation
  remaining: number
}) {
  const spin = useRef<Group>(null)
  const drop = useRef<Group>(null)
  const turns = useRef(0)
  const seen = useRef({ quadrants, rotation })

  // Work out which way the tile turned (the short way round), or reset for a new tile.
  useLayoutEffect(() => {
    const prev = seen.current
    seen.current = { quadrants, rotation }
    if (prev.quadrants !== quadrants) {
      turns.current = rotation
      if (spin.current) spin.current.rotation.y = (-rotation * Math.PI) / 2
      if (drop.current) drop.current.position.y = DROP_FROM
      return
    }
    const step = normalizeRotation(rotation - prev.rotation)
    turns.current += step === 3 ? -1 : step
  }, [quadrants, rotation])

  useFrame(({ camera }, delta) => {
    // Clockwise seen from above is a negative turn around +Y.
    if (spin.current) {
      const target = (-turns.current * Math.PI) / 2
      spin.current.rotation.y = MathUtils.damp(spin.current.rotation.y, target, 12, delta)
    }
    if (drop.current) {
      drop.current.position.y = MathUtils.damp(drop.current.position.y, 0, 9, delta)
    }

    const view = useViewStore.getState()
    const azimuth = view.azimuth
    const polar = Math.min(view.polar, MAX_POLAR)
    const flat = Math.sin(polar) * CAMERA_DISTANCE
    camera.position.set(
      Math.sin(azimuth) * flat,
      Math.cos(polar) * CAMERA_DISTANCE,
      Math.cos(azimuth) * flat,
    )
    camera.lookAt(0, LOOK_AT_Y, 0)
  })

  const sheets = Math.min(MAX_SHEETS, Math.max(0, remaining - 1))
  const stackTop = -0.3

  return (
    <>
      <hemisphereLight args={['#fff4e0', '#b9a684', 1.5]} />
      <directionalLight
        position={[-2.5, 5, 2]}
        intensity={2.2}
        color="#fff1d6"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-camera-left={-1.5}
        shadow-camera-right={1.5}
        shadow-camera-top={1.5}
        shadow-camera-bottom={-1.5}
        shadow-bias={-0.001}
      />

      {Array.from({ length: sheets }, (_, i) => {
        const [x, z, turn] = sheetJitter(i)
        return (
          <mesh
            key={i}
            position={[x, stackTop - SHEET_HEIGHT / 2 - i * SHEET_HEIGHT, z]}
            rotation-y={turn}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[TILE_SIZE, SHEET_HEIGHT * 0.92, TILE_SIZE]} />
            <meshStandardMaterial color={SCENE_COLORS.soil} flatShading />
          </mesh>
        )
      })}

      <Float
        speed={2.2}
        rotationIntensity={0.25}
        floatIntensity={0.5}
        floatingRange={[-0.05, 0.08]}
      >
        <group ref={drop}>
          <group ref={spin} position-y={-BASE_HEIGHT / 2}>
            <SquareTile quadrants={quadrants} />
          </group>
        </group>
      </Float>
    </>
  )
}
