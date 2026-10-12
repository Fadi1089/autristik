import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import type { Group } from 'three'
import type { PlacedTile } from '../game/board'
import { coordToWorld } from './layout'
import { SquareTile } from './SquareTile'

/** Rare specials retain the same landing animation as instanced ordinary tiles. */
export function PlacedSpecialTile({ tile, animate }: { tile: PlacedTile; animate: boolean }) {
  const ref = useRef<Group>(null)
  const elapsed = useRef(0)
  useLayoutEffect(() => {
    elapsed.current = animate ? 0 : 0.35
    if (ref.current) ref.current.position.y = animate ? 0.6 : 0
  }, [animate])
  useFrame((_, delta) => {
    if (!ref.current || elapsed.current >= 0.35) return
    elapsed.current = Math.min(0.35, elapsed.current + delta)
    ref.current.position.y = 0.6 * (1 - elapsed.current / 0.35) ** 3
  })
  const [x, z] = coordToWorld(tile.coord)
  return (
    <group position={[x, 0, z]}>
      <group ref={ref}>
        <SquareTile quadrants={tile.quadrants} multiplier={tile.multiplier ?? 1} />
      </group>
    </group>
  )
}
