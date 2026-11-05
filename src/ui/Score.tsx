import { routeScore } from '../game/routes'
import { useGameStore } from '../store/gameStore'

/**
 * The running score, with the part the roads bring in now shown beside it. What each placement
 * adds floats up from the board in a cloud.
 */
export function Score() {
  const score = useGameStore((s) => s.score)
  const roadPoints = useGameStore((s) => routeScore(s.routes))
  const fromRoads = roadPoints > 0 ? `, ${roadPoints} of them from road squares` : ''

  return (
    <div
      role="status"
      aria-label={`Score: ${score}${fromRoads}`}
      title={roadPoints > 0 ? `${score} points${fromRoads}` : undefined}
      className="card flex h-14 min-w-[5.5rem] flex-col items-end justify-center gap-1 px-4 sm:h-[4.6rem] sm:min-w-[7rem] sm:px-5"
    >
      <div aria-hidden className="flex items-center gap-1.5">
        {roadPoints > 0 && (
          <span className="rounded-full bg-ink/7 px-2 py-0.5 text-[0.65rem] leading-none font-semibold tracking-[0.08em] text-ink/75 uppercase tabular-nums">
            +{roadPoints} roads
          </span>
        )}
        <span className="eyebrow pl-[0.18em]">Score</span>
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
