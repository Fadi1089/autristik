import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { coordsEqual } from '../game/coords'
import { destructionTargets } from '../game/board'
import { landingPosition } from '../game/falling'
import { currentQuadrants } from '../game/game'
import { tileKind } from '../game/tiles'
import { useGameStore } from '../store/gameStore'
import { BASE_HEIGHT, coordToWorld } from './layout'
import { SquareTile } from './SquareTile'
import { GhostOutline } from './GhostOutline'

/** Moving tile, readable landing projection and the void's destruction area. */
export function Ghost() {
  const falling = useGameStore((s) => s.falling)
  const menuOpen = useGameStore((s) => s.menuOpen)
  const board = useGameStore((s) => s.board)
  const current = useGameStore((s) => s.current)
  const rotation = useGameStore((s) => s.rotation)
  const currentMultiplier = useGameStore((s) => s.currentMultiplier)
  const fallDirection = useGameStore((s) => s.fallDirection)
  const fallAnchor = useGameStore((s) => s.fallAnchor)
  const tucked = useGameStore((s) => s.tucked)
  const { quadrants, target, destroyed } = useMemo(() => {
    const hand = { board, current, rotation }
    const quadrants = currentQuadrants(hand)
    const target = landingPosition({ ...hand, falling, fallDirection, fallAnchor, tucked })
    return {
      quadrants,
      target,
      destroyed:
        target && quadrants && tileKind(quadrants) === 'void'
          ? destructionTargets(board, target)
          : [],
    }
  }, [board, current, rotation, falling, fallDirection, fallAnchor, tucked])
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 0.16 + Math.sin(clock.elapsedTime * 3) * 0.03
  })
  if (menuOpen || !falling || !quadrants) return null
  const [x, z] = coordToWorld(falling)
  const [targetX, targetZ] = target ? coordToWorld(target) : [x, z]
  return (
    <>
      <group position={[x, 0, z]}>
        <group ref={ref} renderOrder={40}>
          <SquareTile
            quadrants={quadrants}
            multiplier={currentMultiplier}
            glow={0.12}
            opacity={0.8}
            overlay
          />
          <GhostOutline moving />
        </group>
      </group>
      <group position={[targetX, 0.02, targetZ]} renderOrder={50}>
        {target && !coordsEqual(falling, target) && (
          <SquareTile
            quadrants={quadrants}
            multiplier={currentMultiplier}
            glow={0.12}
            opacity={0.25}
            overlay
          />
        )}
        {target && <GhostOutline moving={false} />}
      </group>
      {destroyed.map((coord) => {
        const [blastX, blastZ] = coordToWorld(coord)
        return (
          <mesh key={`${coord.q},${coord.r}`} position={[blastX, BASE_HEIGHT + 0.23, blastZ]}>
            <boxGeometry args={[0.92, 0.02, 0.92]} />
            <meshBasicMaterial color="#b977f0" transparent opacity={0.38} depthWrite={false} />
          </mesh>
        )
      })}
    </>
  )
}
