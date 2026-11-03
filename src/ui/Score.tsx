import { useGameStore } from '../store/gameStore'

/** The running score. What each placement adds floats up from the board in a cloud. */
export function Score() {
  const score = useGameStore((s) => s.score)
  return (
    <div
      role="status"
      aria-label={`Score: ${score}`}
      className="card flex h-14 min-w-[5.5rem] flex-col items-end justify-center gap-1 px-4 sm:h-[4.6rem] sm:min-w-[7rem] sm:px-5"
    >
      <span aria-hidden className="eyebrow pl-[0.18em]">
        Score
      </span>
      <span
        aria-hidden
        className="font-display text-2xl leading-none font-semibold text-ink tabular-nums sm:text-3xl"
      >
        {score}
      </span>
    </div>
  )
}
