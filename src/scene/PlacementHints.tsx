import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, Matrix4, PlaneGeometry } from 'three'
import type { InstancedMesh, MeshBasicMaterial } from 'three'
import { bonusTargetCells } from '../game/bonus'
import type { Coord } from '../game/coords'
import { inBounds, modeRules } from '../game/modes'
import type { Biome } from '../game/tiles'
import { SCENE_COLORS, TERRAIN_COLORS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { useViewStore } from '../store/viewStore'
import { coordToWorld, TILE_SIZE } from './layout'
import { placementArea } from './placementArea'

/** One flat cell of the area, lying on the ground a little above the grid lines. */
const cellGeometry = new PlaneGeometry(TILE_SIZE, TILE_SIZE).rotateX(-Math.PI / 2)
const AREA_HEIGHT = 0.003
const OPACITY = 0.3
/** The bonus cells blink a few times, then go: they point the way without covering the board. */
const BONUS_OPACITY = 0.7
const BONUS_BLINKS = 3
const BONUS_BLINK_SECONDS = 0.7
/** How much of the biome's colour the blinking cells keep: a darker shade, to stand out on the ground. */
const BONUS_SHADE = 0.45

/** A darker shade of `biome`'s colour, for the cells that blink where it should go. */
function bonusHintColor(biome: Biome): string {
  return `#${new Color(TERRAIN_COLORS[biome]).multiplyScalar(BONUS_SHADE).getHexString()}`
}
/** Each rebuild grows the buffer to a power of two, so the mesh is rarely remade. */
function capacityFor(count: number): number {
  return Math.max(256, 2 ** Math.ceil(Math.log2(Math.max(1, count))))
}

const matrix = new Matrix4()

/** Where to grow the open bonus objective, if there is one. */
function useBonusCells(): Coord[] {
  const board = useGameStore((s) => s.board)
  const objective = useGameStore((s) => s.bonus?.objective)
  const bounds = useGameStore((s) => modeRules(s.mode).bounds)
  return useMemo(
    () =>
      objective ? bonusTargetCells(board, objective).filter((cell) => inBounds(bounds, cell)) : [],
    [board, objective, bounds],
  )
}

/** Flat cells on the ground in one colour, their opacity set each frame from the clock. */
function GroundCells({
  cells,
  color,
  opacity,
  renderOrder = 1,
}: {
  cells: readonly Coord[]
  color: string
  opacity: (elapsed: number) => number
  renderOrder?: number
}) {
  const menuOpen = useGameStore((s) => s.menuOpen)
  const capacity = capacityFor(cells.length)
  const mesh = useRef<InstancedMesh>(null)
  const material = useRef<MeshBasicMaterial>(null)

  useLayoutEffect(() => {
    const area = mesh.current
    if (!area) return
    cells.forEach((cell, i) => {
      const [x, z] = coordToWorld(cell)
      area.setMatrixAt(i, matrix.makeTranslation(x, AREA_HEIGHT, z))
    })
    area.count = cells.length
    area.instanceMatrix.needsUpdate = true
    area.computeBoundingSphere()
  }, [cells, capacity])

  useFrame(({ clock }) => {
    if (material.current) material.current.opacity = opacity(clock.elapsedTime)
  })

  return (
    <instancedMesh
      key={capacity}
      ref={mesh}
      args={[cellGeometry, undefined, capacity]}
      visible={!menuOpen}
      renderOrder={renderOrder}
    >
      <meshBasicMaterial
        ref={material}
        color={color}
        transparent
        opacity={OPACITY}
        depthWrite={false}
      />
    </instancedMesh>
  )
}

/**
 * A flat green area on the ground over every cell the piece in hand can cover at a spot where
 * it fits as it is turned now. It follows the piece's shape and rotation, so turning it
 * reshapes the area. In creation mode a piece fits on any free cell, so there is no area.
 */
export function PlacementHints() {
  const board = useGameStore((s) => s.board)
  const current = useGameStore((s) => s.current)
  const rotation = useGameStore((s) => s.rotation)
  const mode = useGameStore((s) => s.mode)

  const cells = useMemo(
    () => (modeRules(mode).free ? [] : placementArea({ board, current, rotation, mode })),
    [board, current, rotation, mode],
  )

  // A slow breath, so the area reads as a hint rather than part of the board.
  return (
    <GroundCells
      cells={cells}
      color={SCENE_COLORS.placementValid}
      opacity={(t) => OPACITY * (0.8 + 0.2 * Math.sin(t * 2.2))}
    />
  )
}

/**
 * Cells beside the bonus objective's patch, in a darker shade of its biome: lay a square of that
 * biome there to grow it. They blink a few times when the objective appears, and again each time
 * the HUD asks.
 */
export function BonusHints() {
  const cells = useBonusCells()
  const issuedAt = useGameStore((s) => s.bonus?.objective?.issuedAt)
  const biome = useGameStore((s) => s.bonus?.objective?.biome)
  const request = useViewStore((s) => s.bonusHintRequest)
  const trigger = `${issuedAt}:${request}`
  const shownAt = useRef<{ trigger: string; time: number | null }>({ trigger: '', time: null })

  return (
    <GroundCells
      cells={cells}
      color={biome ? bonusHintColor(biome) : SCENE_COLORS.placementValid}
      renderOrder={2}
      opacity={(t) => {
        if (shownAt.current.trigger !== trigger || shownAt.current.time === null)
          shownAt.current = { trigger, time: t }
        const since = t - shownAt.current.time!
        if (since >= BONUS_BLINKS * BONUS_BLINK_SECONDS) return 0
        return BONUS_OPACITY * (0.5 - 0.5 * Math.cos((since / BONUS_BLINK_SECONDS) * Math.PI * 2))
      }}
    />
  )
}
