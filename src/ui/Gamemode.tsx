import { useTranslation } from '../i18n/useTranslation'
import type { Message } from '../i18n/messages'
import { useId, useState } from 'react'
import { GAME_MODES, GAME_MODE_LABELS } from '../game/modes'
import type { GameMode } from '../game/modes'
import { useGameStore } from '../store/gameStore'
import { GAME_VARIANTS, GAME_VARIANT_LABELS } from '../game/variants'
import { recordKey, useRecordsStore } from '../store/recordsStore'
import { formatPoints } from './format'

const MODE_INFO: Record<GameMode, readonly Message[]> = {
  classic: [
    'Only regular terrain: meadow, forest, field, water and village.',
    'No special blocks or per-tile score multipliers.',
    'Combos, levels and difficulty selection still apply.',
  ],
  superblock: [
    'Universal gold joker, compatible with bonuses, and indestructible bedrock that preserves combos.',
    'Bronze ×2, silver ×3 and diamond ×5 boost neighbouring placement scores without spreading; the strongest bonus applies.',
    'Rare void after 10 placements: destroys surrounding tiles, except bedrock.',
  ],
}

/** Both menu surfaces prepare the next game, with a small expandable information tab per mode. */
export function Gamemode() {
  const { t, language } = useTranslation()

  const id = useId()
  const selected = useGameStore((s) => s.nextMode)
  const active = useGameStore((s) => s.mode)
  const started = useGameStore((s) => s.started)
  const select = useGameStore((s) => s.setNextMode)
  const variant = useGameStore((s) => s.nextVariant)
  const activeVariant = useGameStore((s) => s.variant)
  const setVariant = useGameStore((s) => s.setNextVariant)
  const records = useRecordsStore((s) => s.records)
  const [info, setInfo] = useState<GameMode | null>(null)
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/65">
        {started
          ? t('Current mode: {mode}. Your choice applies to the next New game.', {
              mode: `${t(GAME_VARIANT_LABELS[activeVariant])} · ${t(GAME_MODE_LABELS[active])}`,
            })
          : t('Choose a mode, then start with Play.')}
      </p>
      <section>
        <h3 className="eyebrow mb-3">{t('Game format')}</h3>
        <div role="group" aria-label={t('Game format')} className="grid grid-cols-2 gap-2">
          {GAME_VARIANTS.map((choice) => (
            <button
              type="button"
              key={choice}
              aria-pressed={variant === choice}
              onClick={() => setVariant(choice)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${variant === choice ? 'border-moss bg-moss/12' : 'border-ink/12 hover:border-moss'}`}
            >
              {t(GAME_VARIANT_LABELS[choice])}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm leading-snug text-ink/70">
          {variant === 'time-attack'
            ? t(
                'Time-attack: 30 tiles and 45 seconds to start. Each level refills the supply to 30 and adds 45 seconds. Fixed 15-second approach, with increasing score goals.',
              )
            : t('Standard: a limited tile supply, earned tile rewards and difficulty-based speed.')}
        </p>
      </section>
      <h3 className="eyebrow border-t border-ink/10 pt-4">{t('Tile set')}</h3>
      <div role="group" aria-label={t('Next game mode')} className="space-y-3">
        {GAME_MODES.map((mode) => {
          const chosen = selected === mode
          const expanded = info === mode
          const best = records[recordKey(mode, variant)]
          return (
            <section
              key={mode}
              className={`rounded-2xl border p-4 transition ${chosen ? 'border-moss bg-moss/8' : 'border-ink/12 bg-paper/40'}`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-pressed={chosen}
                  onClick={() => {
                    select(mode)
                    setInfo(mode)
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left"
                >
                  <span
                    aria-hidden
                    className={`grid size-7 shrink-0 place-items-center rounded-full border text-sm ${chosen ? 'border-moss bg-moss text-paper' : 'border-ink/25 text-transparent'}`}
                  >
                    ✓
                  </span>
                  <span>
                    <span className="block font-display text-xl font-semibold">
                      {t(GAME_MODE_LABELS[mode])}
                    </span>
                    <span className="block text-xs text-ink/60">
                      {mode === 'classic'
                        ? t('Regular terrain only')
                        : t('Special blocks and bonuses')}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-moss-deep">
                      {t('Best score')} :{' '}
                      {best === undefined
                        ? t('No score yet')
                        : `${formatPoints(best, language)} ${t('points')}`}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`${id}-${mode}`}
                  aria-label={t('Info: {mode}', { mode: t(GAME_MODE_LABELS[mode]) })}
                  onClick={() => setInfo(expanded ? null : mode)}
                  className="shrink-0 rounded-lg border border-ink/15 px-2.5 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-ink/5"
                >
                  {t('Info')}
                </button>
              </div>
              <div id={`${id}-${mode}`} hidden={!expanded}>
                <ul className="mt-3 list-disc space-y-2 border-t border-ink/10 pt-3 pl-4 text-sm text-ink/75">
                  {MODE_INFO[mode].map((point) => (
                    <li key={point}>{t(point)}</li>
                  ))}
                </ul>
              </div>
            </section>
          )
        })}
      </div>
      <p className="text-xs text-ink/55">
        {t('Records are saved on this device, separately for each format and tile set.')}{' '}
        {variant === 'time-attack'
          ? t(
              'Time-attack works with either tile set. Menu and hidden-tab pauses stop the countdown.',
            )
          : t('Difficulty and approach speed are independent of the game mode.')}
      </p>
    </div>
  )
}
