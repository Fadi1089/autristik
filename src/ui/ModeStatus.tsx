import { modeRules } from '../game/modes'
import { useGameStore } from '../store/gameStore'

/** Pieces left from this many down turn clay: the end is in sight. */
const LOW_PIECES = 5

/**
 * In a performance game, the pieces still to come, the one in hand included, with a bar that
 * empties as they go.
 */
export function PiecesLeft() {
  const piecesLeft = useGameStore((s) => s.piecesLeft)
  const total = useGameStore((s) => modeRules(s.mode).pieces)
  if (piecesLeft === undefined || total === null) return null
  const low = piecesLeft <= LOW_PIECES

  return (
    <div
      role="status"
      aria-label={`${piecesLeft} of ${total} pieces left`}
      className="card flex h-14 min-w-[5.5rem] flex-col items-end justify-center gap-1 px-4 sm:h-[4.6rem] sm:min-w-[7rem] sm:px-5"
    >
      <span aria-hidden className="eyebrow pl-[0.18em]">
        Pieces left
      </span>
      <span aria-hidden className="flex items-baseline gap-1 tabular-nums">
        <span
          className={`font-display text-2xl leading-none font-semibold transition-colors sm:text-3xl ${
            low ? 'text-clay' : 'text-ink'
          }`}
        >
          {piecesLeft}
        </span>
        <span className="text-xs text-ink/50">/ {total}</span>
      </span>
      <span aria-hidden className="block h-1 w-full overflow-hidden rounded-full bg-ink/8">
        <span
          className={`block h-full rounded-full transition-[width] duration-300 ease-out ${
            low ? 'bg-clay' : 'bg-moss'
          }`}
          style={{ width: `${(piecesLeft / total) * 100}%` }}
        />
      </span>
    </div>
  )
}

/** In creation mode, in place of the score: says there is none to chase. */
export function CreationBadge() {
  return (
    <div className="card flex h-14 flex-col items-end justify-center gap-1 px-4 sm:h-[4.6rem] sm:px-5">
      <span className="eyebrow pl-[0.18em]">Creation</span>
      <span className="font-display text-base leading-none text-ink/75 italic sm:text-lg">
        Free build
      </span>
    </div>
  )
}
