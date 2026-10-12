import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { DoubleSide, RingGeometry } from 'three'
import type { MeshBasicMaterial } from 'three'

const border = new RingGeometry(0.68, 0.76, 4).rotateZ(Math.PI / 4).rotateX(-Math.PI / 2)
const backing = new RingGeometry(0.66, 0.79, 4).rotateZ(Math.PI / 4).rotateX(-Math.PI / 2)

/** A dark rim plus a bright border stays readable over both the ground and other islands. */
export function GhostOutline({ moving }: { moving: boolean }) {
  const ref = useRef<MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (ref.current)
      ref.current.opacity = moving ? 0.8 + 0.15 * Math.sin(clock.elapsedTime * 3) : 0.95
  })
  return (
    <group position-y={0.48}>
      <mesh geometry={backing} renderOrder={60}>
        <meshBasicMaterial
          color="#17252d"
          transparent
          opacity={0.85}
          depthTest={false}
          depthWrite={false}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh geometry={border} position-y={0.002} renderOrder={61}>
        <meshBasicMaterial
          ref={ref}
          color={moving ? '#8ce8fa' : '#fff4be'}
          transparent
          opacity={0.95}
          depthTest={false}
          depthWrite={false}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
