import { LEVEL_UP_TILES, levelGoal } from '../game/levels'
import { comboMultiplier } from '../game/scoring'
import { useGameStore } from '../store/gameStore'
import { formatPoints } from './format'
import { HelpDrawer } from './HelpDrawer'
import { MenuIcon } from './icons'
import { TileTray } from './TileTray'

function Meter({ value }: { value: number }) {
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/8">
      <div
        className="h-full rounded-full bg-moss transition-[width] duration-1000 ease-linear"
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  )
}

/** Level, progress towards its goal, and the running total. */
function LevelCard() {
  const level = useGameStore((s) => s.level)
  const levelScore = useGameStore((s) => s.levelScore)
  const score = useGameStore((s) => s.score)
  const combo = useGameStore((s) => s.combo)
  const last = useGameStore((s) => s.lastPlacement)
  const goal = levelGoal(level)

  return (
    <div className="relative">
      <div className="card w-40 px-4 pt-2.5 pb-3 sm:w-48 sm:px-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="eyebrow">Level {level}</span>
          <span className="text-[0.65rem] font-semibold text-ink/45 tabular-nums">
            {formatPoints(score)} total
          </span>
        </div>
        <div className="font-display text-[2rem] leading-tight font-semibold tabular-nums">
          {formatPoints(levelScore)}
          <span className="text-lg font-normal text-ink/45"> / {goal}</span>
        </div>
        <Meter value={levelScore / goal} />
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-ink/55">Combo</span>
          <span
            aria-label={`Current combo multiplier: ${formatPoints(comboMultiplier(combo))}`}
            className={`rounded-full px-2 py-0.5 font-semibold tabular-nums ${
              combo > 0 ? 'bg-moss text-paper' : 'bg-ink/6 text-ink/55'
            }`}
          >
            ×{formatPoints(comboMultiplier(combo))}
          </span>
        </div>
      </div>
      {last && last.points > 0 && (
        <div
          key={`${last.coord.q},${last.coord.r}`}
          className="absolute top-full left-3 mt-2 animate-float-up sm:top-3 sm:left-full sm:mt-0 sm:ml-2 rounded-full bg-moss px-2.5 py-0.5 font-display text-sm font-semibold whitespace-nowrap text-paper shadow"
        >
          +{formatPoints(last.points)}
          {last.perfect ? ' perfect' : ''}
        </div>
      )}
    </div>
  )
}

/** Announces each new level with its goal, then gets out of the way. */
function LevelBanner() {
  const last = useGameStore((s) => s.lastPlacement)
  const level = useGameStore((s) => s.level)
  if (!last?.leveledUp) return null
  return (
    <div
      key={level}
      role="status"
      className="pointer-events-none absolute inset-x-0 top-28 flex animate-banner justify-center sm:top-10"
    >
      <div className="card px-7 py-3 text-center">
        <div className="eyebrow">Goal reached</div>
        <div className="font-display text-3xl font-semibold">Level {level}</div>
        <div className="mt-0.5 text-sm text-ink/65">
          {levelGoal(level)} points · +{LEVEL_UP_TILES} tiles
        </div>
      </div>
    </div>
  )
}

export function HUD() {
  const openMenu = useGameStore((s) => s.openMenu)

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
            <MenuIcon className="size-6" />
          </button>
          <LevelCard />
        </div>
      </header>

      <LevelBanner />

      <footer className="flex flex-col items-center justify-center">
        <TileTray />
      </footer>

      <HelpDrawer />
    </div>
  )
}
