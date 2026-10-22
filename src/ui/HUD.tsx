import { useGameStore } from '../store/gameStore'
import { MenuIcon, ResetGridIcon } from './icons'
import { TileTray } from './TileTray'

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
          <button
            type="button"
            onClick={resetGrid}
            aria-label="Reset grid"
            title="Reset grid: clear the placed tetrominoes back to a starting piece"
            className="group card flex size-14 flex-col items-center justify-center gap-1 text-ink/75 transition hover:text-ink active:scale-95 sm:size-[4.6rem] sm:gap-1.5"
          >
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
    </div>
  )
}
