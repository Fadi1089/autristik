import { routeScore } from '../game/routes'
import { useGameStore } from '../store/gameStore'

/** The running score. What each placement adds floats up from the board in a cloud. */
export function Score() {
  const score = useGameStore((s) => s.score)
  const routes = useGameStore((s) => s.routes)
  const routePoints = routes ? routeScore(routes) : 0

  return (
    <div
      role="status"
      aria-label={`Score: ${score}${routePoints > 0 ? ` (dont ${routePoints} de routes)` : ''}`}
      title={
        routePoints > 0
          ? `${score} points au total (dont ${routePoints} point${
              routePoints > 1 ? 's' : ''
            } provenant des cases traversées par les routes)`
          : undefined
      }
      className="card flex h-14 min-w-[5.5rem] flex-col items-end justify-center gap-0.5 px-4 sm:h-[4.6rem] sm:min-w-[7rem] sm:px-5"
    >
      <div className="flex items-center gap-1.5">
        {routePoints > 0 && (
          <span className="text-[9px] font-semibold tracking-wide text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded-full uppercase">
            +{routePoints} routes
          </span>
        )}
        <span aria-hidden className="eyebrow pl-[0.18em]">
          Score
        </span>
      </div>
      <span
        aria-hidden
        className="font-display text-2xl leading-none font-semibold text-ink tabular-nums sm:text-3xl"
      >
        {score}
      </span>
    </div>
  )
}
