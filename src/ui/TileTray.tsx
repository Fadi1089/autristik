import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'
import { nextTilePreview } from '../game/game'
import { TERRAIN_LABELS } from '../palette'
import { TrayTile } from '../scene/TrayTile'
import { useGameStore } from '../store/gameStore'

/** Large current tile, smaller queued tile, and the separated supply counter. */
export function TileTray() {
  const current = useGameStore((s) => s.current)
  const rotation = useGameStore((s) => s.rotation)
  const multiplier = useGameStore((s) => s.currentMultiplier)
  const remaining = useGameStore((s) => s.remaining)
  const seed = useGameStore((s) => s.seed)
  const placements = useGameStore((s) => s.placements)
  const rotate = useGameStore((s) => s.rotate)
  const next = useMemo(
    () => nextTilePreview({ current, remaining, seed, placements }),
    [current, remaining, seed, placements],
  )

  if (!current) return null
  const description = current.map((t) => TERRAIN_LABELS[t].toLowerCase()).join(', ')
  const nextDescription = next?.quadrants.map((t) => TERRAIN_LABELS[t].toLowerCase()).join(', ')

  return (
    <div className="card flex max-w-full items-center gap-2 px-4 py-3 sm:gap-3 sm:px-5">
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => rotate(1)}
          title="Current tile (click to rotate)"
          aria-label={`Current tile: ${description}. Score ×${multiplier}. Click to rotate.`}
          className="relative size-24 cursor-pointer min-[360px]:size-28 sm:size-32"
        >
          <Canvas
            shadows="percentage"
            dpr={[1, 2]}
            gl={{ alpha: true, antialias: true }}
            camera={{ fov: 26, near: 0.1, far: 20 }}
            className="pointer-events-none"
          >
            <TrayTile
              quadrants={current}
              multiplier={multiplier}
              rotation={rotation}
              remaining={remaining}
            />
          </Canvas>
          {multiplier > 1 && (
            <span className="absolute right-0 bottom-0 rounded-full bg-paper px-2 py-0.5 text-xs font-bold text-ink">
              ×{multiplier}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-col items-center">
        <div
          role="img"
          aria-label={
            next
              ? `Next tile: ${nextDescription}. Score ×${next.multiplier}.`
              : 'No next tile in the supply'
          }
          className="relative size-16 min-[360px]:size-20"
        >
          {next ? (
            <Canvas
              shadows="percentage"
              dpr={[1, 2]}
              gl={{ alpha: true, antialias: true }}
              camera={{ fov: 26, near: 0.1, far: 20 }}
              className="pointer-events-none"
            >
              <TrayTile
                quadrants={next.quadrants}
                multiplier={next.multiplier}
                rotation={0}
                remaining={1}
                animateDraw={false}
              />
            </Canvas>
          ) : (
            <div className="grid h-full place-items-center font-display text-2xl text-ink/30">
              —
            </div>
          )}
          {next && next.multiplier > 1 && (
            <span className="absolute right-0 bottom-0 rounded-full bg-paper px-1.5 py-0.5 text-[0.65rem] font-bold text-ink">
              ×{next.multiplier}
            </span>
          )}
        </div>
      </div>

      <div className="ml-1 self-stretch border-l border-ink/10 pl-3 sm:ml-2 sm:pl-4 flex flex-col justify-center">
        <div className="eyebrow">Tiles</div>
        <div className="font-display text-[2rem] leading-tight font-semibold tabular-nums">
          {remaining}
        </div>
      </div>
    </div>
  )
}
