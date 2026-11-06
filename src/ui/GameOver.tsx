import type { ReactNode } from 'react'
import { endReason } from '../game/game'
import { routeScore } from '../game/routes'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 text-sm">
      <dt className="text-ink/60">{label}</dt>
      <dd className="font-semibold text-ink tabular-nums">{children}</dd>
    </div>
  )
}

/**
 * The end of a performance game: why it ended, the final score and what made it, and whether it
 * beat the best so far. It sits low on the screen, so the finished board stays in view above it.
 */
export function GameOver() {
  const reason = useGameStore(endReason)
  const score = useGameStore((s) => s.score)
  const placed = useGameStore((s) => s.bonus?.placements ?? 0)
  const bonuses = useGameStore((s) => s.bonus?.completed ?? 0)
  const roads = useGameStore((s) => routeScore(s.routes))
  const piecesLeft = useGameStore((s) => s.piecesLeft ?? 0)
  const bestBefore = useGameStore((s) => s.bestBefore)
  const best = useSettingsStore((s) => s.bestPerformance)
  const restart = useGameStore((s) => s.restart)
  const openMenu = useGameStore((s) => s.openMenu)
  if (!reason) return null

  const newBest = bestBefore !== null && score > bestBefore
  const title = reason === 'pieces' ? 'Every piece is down' : 'No room left'
  const why =
    reason === 'pieces'
      ? 'All the pieces have been dealt.'
      : `No piece fits on the grid any more; ${piecesLeft} ${piecesLeft === 1 ? 'piece goes' : 'pieces go'} unused.`

  return (
    <section
      aria-labelledby="game-over-title"
      className="card pointer-events-auto w-[min(22rem,100%)] animate-rise px-5 py-4 sm:px-6 sm:py-5"
    >
      <p className="eyebrow">Performance</p>
      <h2
        id="game-over-title"
        className="mt-1 font-display text-2xl leading-tight font-semibold text-ink"
      >
        {title}
      </h2>
      <p className="mt-1 text-sm text-ink/65">{why}</p>

      <div role="status" className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Final score</p>
          <p className="font-display text-5xl leading-none font-semibold text-ink tabular-nums">
            {score}
          </p>
        </div>
        {newBest ? (
          <span className="rounded-full bg-gold/20 px-3 py-1 text-sm font-semibold text-gold">
            New best!
          </span>
        ) : (
          best > 0 && <span className="text-sm text-ink/55 tabular-nums">Best {best}</span>
        )}
      </div>

      <dl className="mt-4 space-y-1 border-t border-ink/8 pt-3">
        <Line label="Pieces placed">{placed}</Line>
        <Line label="Bonus objectives met">{bonuses}</Line>
        <Line label="Points from roads">{roads}</Line>
      </dl>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          autoFocus
          onClick={() => restart()}
          className="flex-1 rounded-full bg-ink px-4 py-2 font-semibold text-paper transition hover:bg-ink/85 active:scale-95"
        >
          Play again
        </button>
        <button
          type="button"
          onClick={openMenu}
          className="rounded-full bg-ink/8 px-4 py-2 font-semibold text-ink transition hover:bg-ink/12 active:scale-95"
        >
          Menu
        </button>
      </div>
    </section>
  )
}
