import { useTranslation } from '../i18n/useTranslation'
import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'
import { nextTilePreview } from '../game/game'
import { TERRAIN_LABELS } from '../palette'
import { TrayTile } from '../scene/TrayTile'
import { useGameStore } from '../store/gameStore'
import { useKeyHint } from './useKeyHint'
import { lowSupply } from '../game/alerts'

/** Large current tile, smaller queued tile, and the separated supply counter. */
export function TileTray() {
  const { t } = useTranslation()

  const current = useGameStore((s) => s.current)
  const rotation = useGameStore((s) => s.rotation)
  const multiplier = useGameStore((s) => s.currentMultiplier)
  const remaining = useGameStore((s) => s.remaining)
  const seed = useGameStore((s) => s.seed)
  const placements = useGameStore((s) => s.placements)
  const mode = useGameStore((s) => s.mode)
  const queued = useGameStore((s) => s.queued)
  const menuOpen = useGameStore((s) => s.menuOpen)
  const rotate = useGameStore((s) => s.rotate)
  const swap = useGameStore((s) => s.swapTiles)
  const swapKey = useKeyHint('swap')
  const next = useMemo(
    () => nextTilePreview({ current, remaining, seed, placements, mode, queued }),
    [current, remaining, seed, placements, mode, queued],
  )

  if (!current) return null
  const description = current.map((terrain) => t(TERRAIN_LABELS[terrain]).toLowerCase()).join(', ')
  const nextDescription = next?.quadrants
    .map((terrain) => t(TERRAIN_LABELS[terrain]).toLowerCase())
    .join(', ')

  return (
    <div className="card flex max-w-full flex-col items-center gap-1 px-3 py-3 sm:gap-2 sm:px-4">
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect()
            rotate(event.detail !== 0 && event.clientX < bounds.left + bounds.width / 2 ? -1 : 1)
          }}
          title={t('Current tile: left half turns anticlockwise, right half clockwise.')}
          aria-label={t(
            'Current tile: {terrain}. Score ×{bonus}. Click left to turn anticlockwise, right to turn clockwise.',
            {
              terrain: description,
              bonus: multiplier,
            },
          )}
          className="relative size-[min(6rem,20dvh)] cursor-pointer min-[360px]:size-[min(7rem,20dvh)] sm:size-[min(8rem,22dvh)]"
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
        <span className="eyebrow mt-1">{t('Current')}</span>
      </div>

      <div className="my-1 h-px w-1/2 bg-ink/10" aria-hidden />
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={swap}
          disabled={!next || menuOpen}
          title={`${t('Swap current / next')}${swapKey ? ` (${swapKey})` : ''}`}
          aria-label={
            next
              ? t('Next tile: {terrain}. Score ×{bonus}. Click to swap with the current tile.', {
                  terrain: nextDescription!,
                  bonus: next.multiplier,
                })
              : t('No next tile in the supply')
          }
          className="relative size-[min(4rem,14dvh)] rounded-lg transition hover:bg-ink/5 disabled:cursor-default disabled:hover:bg-transparent min-[360px]:size-[min(5rem,14dvh)]"
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
                rotation={next.rotation ?? 0}
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
        </button>
        <span className="eyebrow mt-1">{t('Next')}</span>
      </div>

      <div className="mt-1 self-stretch border-t border-ink/10 pt-3 text-center flex flex-col justify-center">
        <div className="eyebrow">{t('Tiles')}</div>
        <div
          className={`font-display text-[2rem] leading-tight font-semibold tabular-nums ${lowSupply(remaining) ? 'text-danger' : ''}`}
          aria-label={t('Tiles remaining: {tiles}', { tiles: remaining })}
        >
          {remaining}
        </div>
      </div>
    </div>
  )
}
