import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { DoubleSide, RingGeometry } from 'three'
import type { MeshBasicMaterial } from 'three'
import type { TileMultiplier } from '../game/tiles'
import { BONUS_COLORS } from '../palette'

const rimGeometry = new RingGeometry(0.68, 0.76, 4).rotateZ(Math.PI / 4).rotateX(-Math.PI / 2)
const glowGeometry = new RingGeometry(0.75, 0.83, 4).rotateZ(Math.PI / 4).rotateX(-Math.PI / 2)

/** Colour the frame, not the matching terrain: bronze ×2, silver ×3, diamond blue ×5. */
export function BonusAura({
  multiplier,
  opacity = 1,
}: {
  multiplier: TileMultiplier
  opacity?: number
}) {
  const glow = useRef<MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (glow.current)
      glow.current.opacity = opacity * (0.16 + 0.07 * Math.sin(clock.elapsedTime * 2))
  })
  if (multiplier === 1) return null
  const color = BONUS_COLORS[multiplier]
  return (
    <group position-y={0.035}>
      <mesh geometry={rimGeometry}>
        <meshStandardMaterial
          color={color}
          metalness={0.45}
          roughness={0.3}
          emissive={color}
          emissiveIntensity={0.25}
          side={DoubleSide}
          transparent={opacity < 1}
          opacity={opacity}
          depthWrite={opacity === 1}
        />
      </mesh>
      <mesh geometry={glowGeometry}>
        <meshBasicMaterial
          ref={glow}
          color={color}
          transparent
          opacity={opacity * 0.2}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </group>
  )
}
