import { pieceCount } from '../game/board'
import { endReason } from '../game/game'
import { useGameStore } from '../store/gameStore'

export function GameOver() {
  const reason = useGameStore(endReason)
  const menuOpen = useGameStore((s) => s.menuOpen)
  const score = useGameStore((s) => s.score)
  const tiles = useGameStore((s) => pieceCount(s.board))
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
        <div className="mt-3 font-display text-7xl leading-none font-semibold tabular-nums">
          {score}
        </div>
        <p className="mt-1 text-xs font-semibold tracking-wide text-ink/45 uppercase">points</p>
        <p className="mt-3 text-sm text-ink/60">{tiles} tiles</p>
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
