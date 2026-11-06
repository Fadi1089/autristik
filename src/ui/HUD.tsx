import { useGameStore } from '../store/gameStore'
import { CAMERA_PIVOT_STEP, useViewStore } from '../store/viewStore'
import { useKeyHint } from './useKeyHint'
import { CameraLeftIcon, CameraRightIcon, MenuIcon, ResetGridIcon } from './icons'
import { Score } from './Score'
import { BonusObjective } from './BonusObjective'
import { StuckNotice, TileTray } from './TileTray'

function CameraControls() {
  const requestPivot = useViewStore((s) => s.requestPivot)
  const leftKey = useKeyHint('pivotLeft')
  const rightKey = useKeyHint('pivotRight')
  const controls = [
    {
      label: `Rotate camera left${leftKey ? ` (${leftKey})` : ''}`,
      key: leftKey,
      Icon: CameraLeftIcon,
      step: -CAMERA_PIVOT_STEP,
    },
    {
      label: `Rotate camera right${rightKey ? ` (${rightKey})` : ''}`,
      key: rightKey,
      Icon: CameraRightIcon,
      step: CAMERA_PIVOT_STEP,
    },
  ]

  return (
    <div className="card flex h-14 items-center gap-0.5 px-1 sm:h-[4.6rem] sm:gap-1 sm:px-1.5">
      {controls.map(({ label, key, Icon, step }) => (
        <button
          key={label}
          type="button"
          title={label}
          aria-label={label}
          onClick={() => requestPivot(step)}
          className="group flex size-12 flex-col items-center justify-center gap-0.5 rounded-full text-ink/60 transition hover:bg-ink/6 hover:text-ink active:scale-90 sm:size-16"
        >
          <Icon className="hud-pictogram opacity-75 transition-opacity group-hover:opacity-100" />
          <span aria-hidden className="text-[8px] leading-none text-ink/50 sm:text-[9px]">
            {key || '—'}
          </span>
        </button>
      ))}
    </div>
  )
}

export function HUD() {
  const openMenu = useGameStore((s) => s.openMenu)
  const resetGrid = useGameStore((s) => s.resetGrid)

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 select-none sm:p-6">
      <div className="flex flex-col items-end gap-3">
        <header className="flex w-full items-start justify-between gap-2 sm:gap-3">
          <div className="flex items-start gap-2 sm:gap-3">
            <button
              type="button"
              onClick={openMenu}
              aria-label="Open menu (Esc)"
              title="Menu (Esc)"
              className="card grid size-14 place-items-center sm:size-[4.6rem] text-ink/80 transition hover:text-ink active:scale-95"
            >
              <MenuIcon className="hud-pictogram" />
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
              <ResetGridIcon className="hud-pictogram origin-bottom-left transition-transform duration-300 ease-out group-hover:-rotate-12" />
            </button>
          </div>
          <Score />
        </header>
        <BonusObjective />
      </div>

      <footer className="flex flex-col items-center gap-2 sm:gap-3">
        <StuckNotice />
        <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-3">
          <CameraControls />
          <TileTray />
        </div>
      </footer>
    </div>
  )
}
