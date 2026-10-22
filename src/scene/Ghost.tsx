import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { MathUtils } from 'three'
import type { Group } from 'three'
import { canPlaceCurrent, currentSquares } from '../game/game'
import { normalizeRotation } from '../game/tiles'
import { SCENE_COLORS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { useViewStore } from '../store/viewStore'
import { BASE_HEIGHT, coordToWorld, TILE_SIZE } from './layout'
import { PieceTile } from './PieceTile'

const HOVER_LIFT = 0.1
const LABEL_HEIGHT = BASE_HEIGHT + 0.3
/** How quickly the ghost slides to a newly hovered square; higher is snappier. */
const SLIDE_EASING = 22
/** How quickly the ghost turns to a new rotation; higher is snappier. */
const SPIN_EASING = 18

/**
 * Floating preview of the piece in hand over the hovered square (pointer or keyboard
 * cursor). Biome colours stay visible even when the piece overlaps the board.
 * It slides from square to square rather than jumping, spins to each new rotation, and
 * appears in place when shown.
 */
export function Ghost() {
  const hover = useGameStore((s) => s.hover)
  const board = useGameStore((s) => s.board)
  const current = useGameStore((s) => s.current)
  const rotation = useGameStore((s) => s.rotation)

  const { squares, placeable } = useMemo(() => {
    const hand = { board, current, rotation }
    // Drawn around the anchor; the sliding group carries the hovered position.
    const origin = { q: 0, r: 0 }
    return {
      // Unrotated: the spinning group turns it, so rotations can be animated.
      squares: currentSquares({ ...hand, rotation: 0 }, origin),
      placeable: hover !== null && canPlaceCurrent(hand, hover),
    }
  }, [board, current, rotation, hover])

  const slide = useRef<Group>(null)
  const spin = useRef<Group>(null)
  const ref = useRef<Group>(null)
  /** Quarter turns so far, counted the short way round, so the spin never goes the long way. */
  const turns = useRef(rotation)
  const seen = useRef({ current, rotation })

  // A new piece starts at its own rotation; a turn of the same piece spins to it.
  useLayoutEffect(() => {
    const previous = seen.current
    seen.current = { current, rotation }
    if (previous.current !== current) {
      turns.current = rotation
      if (spin.current) spin.current.rotation.y = (-rotation * Math.PI) / 2
      return
    }
    const step = normalizeRotation(rotation - previous.rotation)
    turns.current += step === 3 ? -1 : step
  }, [current, rotation])
  const label = useRef<Group>(null)
  /**
   * Whether the ghost has been placed yet. Only its first appearance snaps; after that it
   * slides from wherever it last was, including across squares that can't take the tile.
   */
  const shown = useRef(false)
  useFrame(({ clock }, delta) => {
    if (slide.current && hover && squares) {
      const [x, z] = coordToWorld(hover)
      const k = shown.current ? 1 - Math.exp(-delta * SLIDE_EASING) : 1
      slide.current.position.x += (x - slide.current.position.x) * k
      slide.current.position.z += (z - slide.current.position.z) * k
      shown.current = true
    }
    // Clockwise seen from above is a negative turn around +Y.
    if (spin.current) {
      const target = (-turns.current * Math.PI) / 2
      spin.current.rotation.y = MathUtils.damp(spin.current.rotation.y, target, SPIN_EASING, delta)
    }
    if (ref.current) ref.current.position.y = HOVER_LIFT + Math.sin(clock.elapsedTime * 3) * 0.02
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

  // Stays mounted while hidden, so the slide and spin carry on from where they were.
  return (
    <group ref={slide} visible={hover !== null && squares !== null}>
      <group ref={ref}>
        <group ref={spin}>
          {squares?.map((square) => {
            const [x, z] = coordToWorld(square.coord)
            return (
              <mesh
                key={`${square.coord.q},${square.coord.r}`}
                position={[x, BASE_HEIGHT - 0.004, z]}
                renderOrder={1}
              >
                <planeGeometry args={[TILE_SIZE * 1.16, TILE_SIZE * 1.16]} />
                <meshBasicMaterial
                  color={placeable ? SCENE_COLORS.placementValid : SCENE_COLORS.placementInvalid}
                  transparent
                  opacity={placeable ? 0.16 : 0.28}
                  depthWrite={false}
                />
              </mesh>
            )
          })}
          <PieceTile squares={squares ?? []} glow={placeable ? 0.12 : 0.04} />
        </group>
      </group>
      {placeable && (
        <group ref={label}>
          <Html pointerEvents="none" zIndexRange={[10, 0]}>
            <div className="hidden translate-x-1.5 -translate-y-full items-baseline gap-1 rounded-full border border-ink/8 bg-paper/55 px-2 py-0.5 whitespace-nowrap text-ink/80 backdrop-blur-[2px] pointer-coarse:inline-flex">
              {/* Touch screens place on a second tap, so say so there. */}
              <span className="text-[0.7rem] text-ink/60">tap again</span>
            </div>
          </Html>
        </group>
      )}
    </group>
  )
}
