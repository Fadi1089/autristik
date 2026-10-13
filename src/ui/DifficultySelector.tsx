import { useTranslation } from '../i18n/useTranslation'
import { formatPoints } from './format'
import { useId } from 'react'
import { DIFFICULTIES, DIFFICULTY_LABELS, fallInterval } from '../game/levels'
import type { Difficulty } from '../game/levels'
import { FALL_DISTANCE } from '../game/falling'
import { useGameStore } from '../store/gameStore'

/** A compact new-game choice; resuming keeps the current game's difficulty. */
export function DifficultySelector() {
  const { t, language } = useTranslation()

  const id = useId()
  const difficulty = useGameStore((s) => s.nextDifficulty)
  const variant = useGameStore((s) => s.nextVariant)
  const select = useGameStore((s) => s.setNextDifficulty)
  if (variant === 'time-attack')
    return (
      <p className="text-xs font-semibold text-ink/60">
        {t('Time-attack')} · {t('Fixed speed · 15 s')}
      </p>
    )
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <label htmlFor={id} className="font-semibold text-ink/60">
        {t('Difficulty')}
      </label>
      <select
        id={id}
        aria-label={t('New game difficulty')}
        title={t('Starting speed for a new game')}
        value={difficulty}
        onChange={(event) => select(event.target.value as Difficulty)}
        className="rounded-lg border border-ink/15 bg-paper px-3 py-2 text-ink"
      >
        {DIFFICULTIES.map((option) => (
          <option key={option} value={option}>
            {t(DIFFICULTY_LABELS[option])} ·{' '}
            {formatPoints(fallInterval(1, option) * FALL_DISTANCE, language)} s
          </option>
        ))}
      </select>
    </div>
  )
}
