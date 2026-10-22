import { useGameStore } from '../store/gameStore'
import { HelpDrawer } from './HelpDrawer'
import { MenuIcon, ResetGridIcon } from './icons'
import { TileTray } from './TileTray'

/** The running total, with the points of the last placement floating up beside it. */
function ScoreCard() {
  const score = useGameStore((s) => s.score)
  const last = useGameStore((s) => s.lastPlacement)

  return (
    <div className="relative">
      <div className="card flex h-14 w-24 flex-col justify-center px-4 sm:h-[4.6rem] sm:w-[7.5rem] sm:px-5">
        <span className="eyebrow">Score</span>
        <div className="font-display text-2xl leading-none font-semibold tabular-nums sm:mt-0.5 sm:text-[2rem]">
          {score}
        </div>
      </div>
      {last && last.points > 0 && (
        <div
          key={`${last.coord.q},${last.coord.r}`}
          className="absolute top-full left-3 mt-2 animate-float-up sm:top-3 sm:left-full sm:mt-0 sm:ml-2 rounded-full bg-moss px-2.5 py-0.5 font-display text-sm font-semibold whitespace-nowrap text-paper shadow"
        >
          +{last.points}
          {last.perfect ? ' perfect' : ''}
        </div>
      )}
    </div>
  )
}

export function HUD() {
  const openMenu = useGameStore((s) => s.openMenu)
  const resetGrid = useGameStore((s) => s.resetGrid)

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 select-none sm:p-6">
      <header className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="flex items-start gap-2 sm:gap-3">
          <button
            type="button"
            onClick={openMenu}
            aria-label="Open menu (Esc)"
            title="Menu (Esc)"
            className="card grid size-14 place-items-center sm:size-[4.6rem] text-ink/80 transition hover:text-ink active:scale-95"
          >
            <MenuIcon className="size-7 sm:size-9" />
          </button>
          <ScoreCard />
          <button
            type="button"
            onClick={resetGrid}
            aria-label="Reset grid"
            title="Reset grid: clear the placed tetrominoes back to a starting piece"
            className="group card flex size-14 flex-col items-center justify-center gap-1 text-ink/75 transition hover:text-ink active:scale-95 sm:size-[4.6rem] sm:gap-1.5"
          >
            {/* Labelled on top, like the Score card beside it. */}
            <span
              aria-hidden
              className="eyebrow pl-[0.18em] transition-colors group-hover:text-ink/80"
            >
              Reset
            </span>
            <ResetGridIcon className="size-6 origin-bottom-left transition-transform duration-300 ease-out group-hover:-rotate-12 sm:size-7" />
          </button>
        </div>
      </header>

      <footer className="flex justify-center">
        <TileTray />
      </footer>

      <HelpDrawer />
    </div>
  )
}
