import { tileCount } from '../game/board'
import { endReason } from '../game/game'
import { useGameStore } from '../store/gameStore'
import { formatDuration, formatPoints } from './format'
import { DifficultySelector } from './DifficultySelector'

export function GameOver() {
  const reason = useGameStore(endReason)
  const menuOpen = useGameStore((s) => s.menuOpen)
  const score = useGameStore((s) => s.score)
  const level = useGameStore((s) => s.level)
  const tiles = useGameStore((s) => tileCount(s.board))
  const playedSeconds = useGameStore((s) => s.playedSeconds)
  const restart = useGameStore((s) => s.restart)
  const openMenu = useGameStore((s) => s.openMenu)

  if (!reason || menuOpen) return null
  return (
    <div className="absolute inset-0 z-10 grid animate-fade place-items-center bg-ink/15 p-6 backdrop-blur-[6px]">
      <div
        role="dialog"
        aria-label="Game over"
        className="card flex animate-rise flex-col items-center px-10 pt-8 pb-7 text-center"
      >
        <p className="eyebrow">The stack is empty</p>
        <h2 className="mt-2 font-display text-2xl text-ink/80 italic">You reached level {level}</h2>
        <div className="mt-3 font-display text-7xl leading-none font-semibold tabular-nums">
          {formatPoints(score)}
        </div>
        <p className="mt-1 text-xs font-semibold tracking-wide text-ink/45 uppercase">points</p>
        <p className="mt-3 text-sm text-ink/60">
          {tiles} tiles · {formatDuration(playedSeconds)} played
        </p>
        <div className="mt-5">
          <DifficultySelector />
        </div>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => restart()}
            className="rounded-full bg-moss px-6 py-2.5 font-semibold text-paper shadow-sm transition hover:bg-moss-deep active:scale-95"
          >
            New game
          </button>
          <button
            type="button"
            onClick={openMenu}
            className="rounded-full px-5 py-2.5 font-semibold text-ink/70 transition hover:bg-ink/6 hover:text-ink"
          >
            Menu
          </button>
        </div>
      </div>
    </div>
  )
}
