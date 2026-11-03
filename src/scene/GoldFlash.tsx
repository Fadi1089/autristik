import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, MeshBasicMaterial, Vector3 } from 'three'
import type { Group } from 'three'
import { boardSquares } from '../game/board'
import { SCENE_COLORS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { DROP_SECONDS } from './Board'
import { pieceGeometry } from './pieceGeometry'

/** Time to reach full brightness, then the time it takes to fade to almost nothing. */
const ATTACK_SECONDS = 0.06
const DECAY_SECONDS = 0.3
const DONE_SECONDS = ATTACK_SECONDS + DECAY_SECONDS * 4
/** How much the flash swells past the piece as it fades. */
const SWELL = 0.04

/** Drawn over the piece's own faces, adding light to whatever biome is underneath. */
const material = new MeshBasicMaterial({
  color: SCENE_COLORS.gold,
  transparent: true,
  opacity: 0,
  blending: AdditiveBlending,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
  toneMapped: false,
})

/** Brightness of the flash `t` seconds in: a sharp rise, then a quick fall, like a camera's. */
function brightness(t: number): number {
  if (t < 0) return 0
  if (t < ATTACK_SECONDS) return t / ATTACK_SECONDS
  return Math.exp(-(t - ATTACK_SECONDS) / DECAY_SECONDS)
}

/**
 * A quick gold flash over each piece the last placement surrounded with its own biomes, the
 * moment its 10 points are scored. It starts once the placed piece has landed.
 */
export function GoldFlash() {
  const board = useGameStore((s) => s.board)
  const lastPlacement = useGameStore((s) => s.lastPlacement)

  const flashes = useMemo(() => {
    const ids = new Set(lastPlacement?.score.surrounded)
    if (ids.size === 0) return []
    const squares = boardSquares(board)
    return [...ids].map((id) => {
      const geometry = pieceGeometry(squares.filter((s) => s.piece === id))
      geometry.computeBoundingBox()
      return { geometry, centre: geometry.boundingBox!.getCenter(new Vector3()) }
    })
  }, [board, lastPlacement])
  useEffect(() => () => flashes.forEach((f) => f.geometry.dispose()), [flashes])

  const group = useRef<Group>(null)
  /** Clock time the flash started from; null until the next frame sets it. */
  const flash = useRef<{ start: number | null } | null>(null)

  useLayoutEffect(() => {
    flash.current = flashes.length > 0 ? { start: null } : null
    material.opacity = 0
  }, [flashes])

  useFrame(({ clock }) => {
    const anim = flash.current
    if (!anim) return
    anim.start ??= clock.elapsedTime
    const t = clock.elapsedTime - anim.start - DROP_SECONDS
    material.opacity = brightness(t)
    const swell = 1 + SWELL * Math.min(1, Math.max(0, t) / DONE_SECONDS)
    for (const child of group.current?.children ?? []) child.scale.setScalar(swell)
    if (t >= DONE_SECONDS) {
      material.opacity = 0
      flash.current = null
    }
  })

  return (
    <group ref={group}>
      {flashes.map(({ geometry, centre }, i) => (
        // Scaled about the piece's centre, so the swell spreads evenly round it.
        <group key={i} position={centre}>
          <mesh
            geometry={geometry}
            material={material}
            position={centre.clone().negate()}
            renderOrder={3}
          />
        </group>
      ))}
    </group>
  )
}
