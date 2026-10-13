import { useTranslation } from '../i18n/useTranslation'
import { useState } from 'react'
import { GAME_THEMES, PLACEMENT_SOUNDS } from '../customization'
import type { PlacementSound } from '../customization'
import { playPlacementSound } from '../audio/placementAudio'
import { useSettingsStore } from '../store/settingsStore'

const CHOICE =
  'rounded-xl border px-3 py-2.5 text-sm transition hover:border-moss focus-visible:border-moss'

export function Customization() {
  const { t } = useTranslation()

  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const sound = useSettingsStore((s) => s.placementSound)
  const setSound = useSettingsStore((s) => s.setPlacementSound)
  const [audioUnavailable, setAudioUnavailable] = useState(false)

  const preview = async (selected: PlacementSound) => {
    if (!useSettingsStore.getState().placementSoundEnabled) return
    setAudioUnavailable(
      !(await playPlacementSound(selected, useSettingsStore.getState().soundVolume)),
    )
  }

  return (
    <div className="space-y-7">
      <section aria-label={t('Visual theme')}>
        <h3 className="font-display text-lg font-semibold">{t('Visuals')}</h3>
        <p className="mt-1 text-xs text-ink/60">
          {t('Choose the atmosphere of the island and menus.')}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label={t('Theme')}>
          {GAME_THEMES.map((option) => (
            <button
              type="button"
              key={option}
              aria-pressed={theme === option}
              onClick={() => setTheme(option)}
              className={`${CHOICE} ${theme === option ? 'border-moss bg-moss/12' : 'border-ink/12 bg-paper/50'}`}
            >
              <span
                aria-hidden
                className={`mx-auto mb-2 block h-10 rounded-lg border border-ink/10 ${option === 'light' ? 'bg-[#e7dbc3]' : 'bg-[#25343b]'}`}
              />
              {option === 'light' ? t('Light') : t('Dark')}
            </button>
          ))}
        </div>
      </section>

      <section aria-label={t('Placement sound')}>
        <h3 className="font-display text-lg font-semibold">{t('Standard tile sounds')}</h3>
        <p className="mt-1 text-xs text-ink/60">
          {t('Choose a sound for standard tiles only. Special tiles keep their own effects.')}
        </p>
        <div
          className="mt-3 grid grid-cols-2 gap-2"
          role="group"
          aria-label={t('Placement sounds')}
        >
          {PLACEMENT_SOUNDS.map((option) => (
            <button
              type="button"
              key={option.id}
              aria-pressed={sound === option.id}
              onClick={() => {
                setSound(option.id)
                void preview(option.id)
              }}
              className={`${CHOICE} ${sound === option.id ? 'border-moss bg-moss/12 text-ink' : 'border-ink/12 text-ink/75'}`}
            >
              {t(option.label)}
            </button>
          ))}
        </div>
        {audioUnavailable && (
          <p role="status" className="mt-2 text-xs text-clay">
            {t('Audio is unavailable. Try previewing again.')}
          </p>
        )}
      </section>
      <p className="text-xs text-ink/50">{t('Your choices are saved on this device.')}</p>
    </div>
  )
}
