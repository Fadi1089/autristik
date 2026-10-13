import { useTranslation } from '../i18n/useTranslation'
import { tileCount } from '../game/board'
import { endReason } from '../game/game'
import { useGameStore } from '../store/gameStore'
import { formatDuration, formatPoints } from './format'
import { DifficultySelector } from './DifficultySelector'
import { GAME_MODE_LABELS } from '../game/modes'
import { GAME_VARIANT_LABELS } from '../game/variants'
import { recordKey, useRecordsStore } from '../store/recordsStore'

export function GameOver() {
  const { t, language } = useTranslation()

  const reason = useGameStore(endReason)
  const menuOpen = useGameStore((s) => s.menuOpen)
  const score = useGameStore((s) => s.score)
  const level = useGameStore((s) => s.level)
  const mode = useGameStore((s) => s.mode)
  const variant = useGameStore((s) => s.variant)
  const previousBest = useGameStore((s) => s.bestAtStart)
  const best = useRecordsStore((s) => s.records[recordKey(mode, variant)])
  const tiles = useGameStore((s) => tileCount(s.board))
  const playedSeconds = useGameStore((s) => s.playedSeconds)
  const restart = useGameStore((s) => s.restart)
  const openMenu = useGameStore((s) => s.openMenu)

  if (!reason || menuOpen) return null
  return (
    <div className="absolute inset-0 z-10 grid animate-fade place-items-center bg-ink/15 p-6 backdrop-blur-[6px]">
      <div
        role="dialog"
        aria-label={t('Game over')}
        className="card flex w-full max-w-md animate-rise flex-col items-center px-6 pt-8 pb-7 text-center sm:px-10"
      >
        <p className="eyebrow">{reason === 'time' ? t('Time is up') : t('The stack is empty')}</p>
        <h2 className="mt-2 font-display text-2xl text-ink/80 italic">
          {t('You reached level {level}', { level })}
        </h2>
        <div className="mt-3 font-display text-7xl leading-none font-semibold tabular-nums">
          {formatPoints(score, language)}
        </div>
        <p className="mt-1 text-xs font-semibold tracking-wide text-ink/45 uppercase">
          {t('points')}
        </p>
        <p className="mt-3 text-sm text-ink/60">
          {t('{mode} · {tiles} tiles · {time} played', {
            mode: `${t(GAME_VARIANT_LABELS[variant])} · ${t(GAME_MODE_LABELS[mode])}`,
            tiles,
            time: formatDuration(playedSeconds),
          })}
        </p>
        <div className="mt-4 w-full rounded-xl border border-ink/10 bg-moss/8 px-4 py-3 text-sm">
          <p className="font-semibold text-ink/80">
            {t('Best score')} : {formatPoints(Math.max(best ?? 0, score), language)} {t('points')}
          </p>
          <p className="mt-1 font-semibold text-moss-deep">
            {previousBest === null || score > previousBest
              ? t('New record!')
              : score === previousBest
                ? t('Record matched!')
                : t('{points} points short of your best', {
                    points: formatPoints(previousBest - score, language),
                  })}
          </p>
          {previousBest !== null && score > previousBest && (
            <p className="mt-1 text-xs text-ink/55">
              {t('Previous best: {score} points', { score: formatPoints(previousBest, language) })}
            </p>
          )}
        </div>
        <div className="mt-5">
          <DifficultySelector />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => restart()}
            className="rounded-full bg-moss px-6 py-2.5 font-semibold text-paper shadow-sm transition hover:bg-moss-deep active:scale-95"
          >
            {t('New game')}
          </button>
          <button
            type="button"
            onClick={openMenu}
            className="rounded-full px-5 py-2.5 font-semibold text-ink/70 transition hover:bg-ink/6 hover:text-ink"
          >
            {t('Menu')}
          </button>
        </div>
      </div>
    </div>
  )
}
