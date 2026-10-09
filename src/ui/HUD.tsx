import { LEVEL_UP_TILES, levelGoal, levelTimeLimit } from '../game/levels'
import { useGameStore } from '../store/gameStore'
import { formatTime } from './format'
import { HelpDrawer } from './HelpDrawer'
import { MenuIcon } from './icons'
import { TileTray } from './TileTray'

/** Seconds left at which the countdown turns urgent. */
const URGENT_SECONDS = 10

function Meter({ value, tone }: { value: number; tone: 'moss' | 'clay' }) {
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/8">
      <div
        className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
          tone === 'moss' ? 'bg-moss' : 'bg-clay'
        }`}
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
  const last = useGameStore((s) => s.lastPlacement)
  const goal = levelGoal(level)

  return (
    <div className="relative">
      <div className="card w-40 px-4 pt-2.5 pb-3 sm:w-48 sm:px-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="eyebrow">Level {level}</span>
          <span className="text-[0.65rem] font-semibold text-ink/45 tabular-nums">
            {score} total
          </span>
        </div>
        <div className="font-display text-[2rem] leading-tight font-semibold tabular-nums">
          {levelScore}
          <span className="text-lg font-normal text-ink/45"> / {goal}</span>
        </div>
        <Meter value={levelScore / goal} tone="moss" />
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

function Countdown() {
  // Whole seconds, rounded up, so the clock reads 0:00 only once time is really up.
  const seconds = useGameStore((s) => Math.ceil(s.timeLeft))
  const level = useGameStore((s) => s.level)
  const urgent = seconds <= URGENT_SECONDS

  return (
    <div className="card w-28 px-4 pt-2.5 pb-3 text-right sm:w-36 sm:px-5">
      <div className="eyebrow">
        Time<span className="hidden sm:inline"> left</span>
      </div>
      <div
        className={`font-display text-[2rem] leading-tight font-semibold tabular-nums transition-colors ${
          urgent ? 'text-clay' : ''
        }`}
      >
        <time dateTime={`PT${seconds}S`}>{formatTime(seconds)}</time>
      </div>
      <Meter value={seconds / levelTimeLimit(level)} tone={urgent ? 'clay' : 'moss'} />
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
          {levelGoal(level)} points in {formatTime(levelTimeLimit(level))} · +{LEVEL_UP_TILES} tiles
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
        <Countdown />
      </header>

      <LevelBanner />

      <footer className="flex justify-center">
        <TileTray />
      </footer>

      <HelpDrawer />
    </div>
  )
}
