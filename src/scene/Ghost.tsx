import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { coordsEqual, directionOffset } from '../game/coords'
import { landingPosition } from '../game/falling'
import { currentQuadrants, previewPlacement } from '../game/game'
import type { Contact } from '../game/matching'
import { SCENE_COLORS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { BASE_HEIGHT, coordToWorld, QUADRANT_SIZE, quadrantToLocal } from './layout'
import { SquareTile } from './SquareTile'

function ContactDot({ contact }: { contact: Contact }) {
  const [x, z] = quadrantToLocal(contact.quadrant)
  const { q, r } = directionOffset(contact.direction)
  const reach = QUADRANT_SIZE / 2
  return (
    <mesh position={[x + q * reach, BASE_HEIGHT + 0.26, z + r * reach]}>
      <sphereGeometry args={[0.055, 12, 8]} />
      <meshBasicMaterial color={contact.matches ? SCENE_COLORS.match : SCENE_COLORS.mismatch} />
    </mesh>
  )
}

/** Moving tile and its faint landing projection with matching-terrain feedback. */
export function Ghost() {
  const falling = useGameStore((s) => s.falling)
  const menuOpen = useGameStore((s) => s.menuOpen)
  const board = useGameStore((s) => s.board)
  const current = useGameStore((s) => s.current)
  const rotation = useGameStore((s) => s.rotation)
  const fallDirection = useGameStore((s) => s.fallDirection)
  const timeLeft = useGameStore((s) => s.timeLeft)
  const { quadrants, target, preview } = useMemo(() => {
    const hand = { board, current, rotation }
    const target = landingPosition({ ...hand, falling, fallDirection, timeLeft })
    return {
      quadrants: currentQuadrants(hand),
      target,
      preview: target ? previewPlacement(hand, target) : null,
    }
  }, [board, current, rotation, falling, fallDirection, timeLeft])
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
        <group ref={ref}>
          <SquareTile quadrants={quadrants} glow={0.12} opacity={0.6} />
        </group>
      </group>
      <group position={[targetX, 0.02, targetZ]}>
        {target && !coordsEqual(falling, target) && (
          <SquareTile quadrants={quadrants} glow={0.12} opacity={0.25} />
        )}
        {preview?.contacts.map((c) => (
          <ContactDot key={`${c.direction}-${c.quadrant}`} contact={c} />
        ))}
      </group>
    </>
  )
}
