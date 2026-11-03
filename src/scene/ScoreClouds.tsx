import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import type { PlacementScore } from '../game/score'
import { useGameStore } from '../store/gameStore'
import { BASE_HEIGHT, coordToWorld } from './layout'
import { scoreLines } from './scoreNotes'

/** Height the cloud starts from, just above the tallest biome. */
const CLOUD_HEIGHT = BASE_HEIGHT + 0.25

function Cloud({ score }: { score: PlacementScore }) {
  return (
    <div className="relative animate-cloud whitespace-nowrap select-none">
      {/* Two puffs on top of the box make it read as a little cloud. */}
      <span aria-hidden className="absolute -top-2 left-3 size-5 rounded-full bg-paper" />
      <span aria-hidden className="absolute -top-3 left-6 size-7 rounded-full bg-paper" />
      <ul className="relative grid grid-cols-[auto_auto] items-baseline gap-x-2 gap-y-0.5 rounded-2xl bg-paper px-3 py-1.5 shadow-[0_8px_18px_-8px_rgb(59_46_34/0.45)]">
        {scoreLines(score).map((line) => (
          <li key={line.reason} className="col-span-2 grid grid-cols-subgrid items-baseline">
            <span
              className={`text-right font-display text-base leading-none font-semibold tabular-nums ${
                line.gold ? 'text-gold' : 'text-moss-deep'
              }`}
            >
              +{line.points}
            </span>
            <span className={`text-xs ${line.gold ? 'font-semibold text-gold' : 'text-ink/70'}`}>
              {line.reason}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * A little cloud that floats up over each piece placed, listing where its points came from:
 * the base point, its matching sides, then any pieces it surrounded.
 */
export function ScoreClouds() {
  const lastPlacement = useGameStore((s) => s.lastPlacement)
  const menuOpen = useGameStore((s) => s.menuOpen)

  const at = useMemo(() => {
    if (!lastPlacement) return null
    const cells = lastPlacement.squares.map((s) => coordToWorld(s.coord))
    const x = cells.reduce((sum, [cx]) => sum + cx, 0) / cells.length
    const z = cells.reduce((sum, [, cz]) => sum + cz, 0) / cells.length
    return [x, CLOUD_HEIGHT, z] as const
  }, [lastPlacement])

  if (menuOpen || !lastPlacement || !at) return null
  return (
    // Keyed on the placement, so each one starts its cloud afresh.
    <Html key={at.join()} position={at} center pointerEvents="none" zIndexRange={[10, 0]}>
      <Cloud score={lastPlacement.score} />
    </Html>
  )
}
