import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import { DoubleSide } from 'three'
import type { Group, MeshBasicMaterial } from 'three'
import { useGameStore } from '../store/gameStore'
import { tileKind } from '../game/tiles'
import { coordToWorld } from './layout'

/** A brief purple collapse marks the cells consumed by the last void placement. */
export function VoidBlast() {
  const last = useGameStore((s) => s.lastPlacement)
  const ref = useRef<Group>(null)
  const material = useRef<MeshBasicMaterial>(null)
  const elapsed = useRef(0)
  useLayoutEffect(() => {
    elapsed.current = 0
    if (ref.current) ref.current.visible = true
  }, [last])
  useFrame((_, delta) => {
    if (!ref.current || !material.current) return
    elapsed.current = Math.min(0.7, elapsed.current + delta)
    const t = elapsed.current / 0.7
    ref.current.scale.setScalar(0.5 + 2.5 * t)
    material.current.opacity = (1 - t) * 0.65
    if (t === 1) ref.current.visible = false
  })
  if (!last || tileKind(last.quadrants) !== 'void') return null
  const [x, z] = coordToWorld(last.coord)
  return (
    <group ref={ref} position={[x, 0.08, z]}>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.35, 0.5, 40]} />
        <meshBasicMaterial
          ref={material}
          color="#c17aff"
          transparent
          opacity={0.65}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </group>
  )
}
