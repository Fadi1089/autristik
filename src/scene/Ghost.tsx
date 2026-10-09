import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { directionOffset } from '../game/coords'
import { currentQuadrants, previewPlacement, wouldLevelUp } from '../game/game'
import type { Contact } from '../game/matching'
import { SCENE_COLORS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { useViewStore } from '../store/viewStore'
import { BASE_HEIGHT, coordToWorld, QUADRANT_SIZE, quadrantToLocal, TILE_SIZE } from './layout'
import { SquareTile } from './SquareTile'

const HOVER_LIFT = 0.16
const LABEL_HEIGHT = BASE_HEIGHT + 0.42

/** Marker on the seam between one of our squares and the neighbour square it touches. */
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

/** Floating preview of the tile in hand over the hovered square, with seam feedback. */
export function Ghost() {
  const hover = useGameStore((s) => s.hover)
  const board = useGameStore((s) => s.board)
  const current = useGameStore((s) => s.current)
  const rotation = useGameStore((s) => s.rotation)
  const level = useGameStore((s) => s.level)
  const levelScore = useGameStore((s) => s.levelScore)

  const { quadrants, preview } = useMemo(() => {
    const hand = { board, current, rotation }
    return {
      quadrants: currentQuadrants(hand),
      preview: hover ? previewPlacement(hand, hover) : null,
    }
  }, [board, current, rotation, hover])

  const ref = useRef<Group>(null)
  const label = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = HOVER_LIFT + Math.sin(clock.elapsedTime * 3) * 0.03
    // Pin the score label to whichever top corner of the tile is up and right on screen,
    // so it never covers the tile or the squares it is being matched against.
    if (label.current) {
      const { azimuth } = useViewStore.getState()
      const half = TILE_SIZE / 2
      const right = [Math.cos(azimuth), -Math.sin(azimuth)] as const
      const away = [-Math.sin(azimuth), -Math.cos(azimuth)] as const
      label.current.position.set(
        (right[0] + away[0]) * half,
        LABEL_HEIGHT,
        (right[1] + away[1]) * half,
      )
    }
  })

  if (!hover || !quadrants || !preview) return null
  const [x, z] = coordToWorld(hover)

  return (
    <group position={[x, 0, z]}>
      <group ref={ref}>
        <SquareTile quadrants={quadrants} glow={0.12} />
        {preview.contacts.map((c) => (
          <ContactDot key={`${c.direction}-${c.quadrant}`} contact={c} />
        ))}
      </group>
      <group ref={label}>
        <Html pointerEvents="none" zIndexRange={[10, 0]}>
          <div className="flex translate-x-1.5 -translate-y-full items-baseline gap-1 rounded-full border border-ink/8 bg-paper/55 px-2 py-0.5 whitespace-nowrap text-ink/80 backdrop-blur-[2px]">
            <span className="font-display text-sm font-semibold">+{preview.points}</span>
            {wouldLevelUp({ level, levelScore }, preview.points) && (
              <span className="text-[0.7rem] font-semibold text-clay">level up</span>
            )}
            {preview.bonusTiles > 0 && (
              <span className="text-[0.7rem] font-semibold text-moss-deep/90">
                +{preview.bonusTiles} tile{preview.bonusTiles > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </Html>
      </group>
    </group>
  )
}
