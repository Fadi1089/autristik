import { useTranslation } from '../i18n/useTranslation'
import { LEVEL_UP_TILES, levelGoal } from '../game/levels'
import { comboMultiplier } from '../game/scoring'
import { useGameStore } from '../store/gameStore'
import { formatDuration, formatPoints } from './format'
import { HelpDrawer } from './HelpDrawer'
import { MenuIcon } from './icons'
import { TileTray } from './TileTray'
import { ATTACK_TILE_LIMIT, LEVEL_ATTACK_TIME } from '../game/variants'
import { lowTime } from '../game/alerts'

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
  const { t, language } = useTranslation()

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
          <span className="eyebrow">{t('Level {level}', { level })}</span>
          <span className="text-[0.65rem] font-semibold text-ink/45 tabular-nums">
            {t('{score} total', { score: formatPoints(score, language) })}
          </span>
        </div>
        <div className="font-display text-[2rem] leading-tight font-semibold tabular-nums">
          {formatPoints(levelScore, language)}
          <span className="text-lg font-normal text-ink/45"> / {goal}</span>
        </div>
        <Meter value={levelScore / goal} />
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-ink/55">{t('Combo')}</span>
          <span
            aria-label={t('Current combo multiplier: {value}', {
              value: formatPoints(comboMultiplier(combo), language),
            })}
            className={`rounded-full px-2 py-0.5 font-semibold tabular-nums ${
              combo > 0 ? 'bg-moss text-paper' : 'bg-ink/6 text-ink/55'
            }`}
          >
            ×{formatPoints(comboMultiplier(combo), language)}
          </span>
        </div>
      </div>
      {last && last.points > 0 && (
        <div
          key={`${last.coord.q},${last.coord.r}`}
          className="absolute top-full left-3 mt-2 animate-float-up sm:top-3 sm:left-full sm:mt-0 sm:ml-2 rounded-full bg-moss px-2.5 py-0.5 font-display text-sm font-semibold whitespace-nowrap text-paper shadow"
        >
          +{formatPoints(last.points, language)}
          {last.perfect ? ` ${t('perfect')}` : ''}
        </div>
      )}
    </div>
  )
}

/** Announces each new level with its goal, then gets out of the way. */
function LevelBanner() {
  const { t, language } = useTranslation()

  const last = useGameStore((s) => s.lastPlacement)
  const level = useGameStore((s) => s.level)
  const variant = useGameStore((s) => s.variant)
  if (!last?.leveledUp) return null
  return (
    <div
      key={level}
      role="status"
      className="pointer-events-none absolute inset-x-0 top-28 flex animate-banner justify-center sm:top-10"
    >
      <div className="card px-7 py-3 text-center">
        <div className="eyebrow">{t('Goal reached')}</div>
        <div className="font-display text-3xl font-semibold">{t('Level {level}', { level })}</div>
        <div className="mt-0.5 text-sm text-ink/65">
          {variant === 'time-attack'
            ? t('{goal} points · {tiles} tiles · +{seconds} s', {
                goal: formatPoints(levelGoal(level), language),
                tiles: ATTACK_TILE_LIMIT,
                seconds: LEVEL_ATTACK_TIME,
              })
            : t('{goal} points · +{tiles} tiles', {
                goal: formatPoints(levelGoal(level), language),
                tiles: LEVEL_UP_TILES,
              })}
        </div>
      </div>
    </div>
  )
}

function PlayTimer() {
  const { t } = useTranslation()

  const seconds = useGameStore((s) => Math.floor(s.playedSeconds))
  const remaining = useGameStore((s) =>
    s.timeRemaining === null ? null : Math.ceil(s.timeRemaining),
  )
  const label = remaining === null ? t('Time played') : t('Time remaining')
  const warning = useGameStore((s) => lowTime(s.timeRemaining))
  return (
    <div
      className="card ml-auto min-w-24 px-3 py-2.5 text-right sm:min-w-32 sm:px-5"
      aria-label={label}
    >
      <div className="eyebrow">{label}</div>
      <div
        className={`mt-1 font-display text-2xl font-semibold tabular-nums sm:text-3xl ${warning ? 'text-danger' : ''}`}
      >
        {formatDuration(remaining ?? seconds)}
      </div>
      {remaining !== null && (
        <p className="mt-1 text-[0.65rem] text-ink/55">
          {t('Played {time}', { time: formatDuration(seconds) })}
        </p>
      )}
    </div>
  )
}

export function HUD() {
  const { t } = useTranslation()

  const openMenu = useGameStore((s) => s.openMenu)

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 select-none sm:p-6">
      <header
        data-camera-obstacle
        className="flex flex-wrap items-start justify-between gap-2 sm:gap-3"
      >
        <div className="flex items-start gap-2 sm:gap-3">
          <button
            type="button"
            onClick={openMenu}
            aria-label={t('Open menu (Esc)')}
            title={t('Menu (Esc)')}
            className="card grid size-14 place-items-center sm:size-[4.6rem] text-ink/80 transition hover:text-ink active:scale-95"
          >
            <MenuIcon className="size-6" />
          </button>
          <LevelCard />
        </div>
        <PlayTimer />
      </header>

      <LevelBanner />

      <footer data-camera-obstacle className="absolute right-4 top-1/2 -translate-y-1/2 sm:right-6">
        <TileTray />
      </footer>

      <HelpDrawer />
    </div>
  )
}
