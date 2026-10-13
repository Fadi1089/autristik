import { useId } from 'react'
import { LANGUAGES } from '../i18n/language'
import type { Language } from '../i18n/language'
import { useTranslation } from '../i18n/useTranslation'
import { useSettingsStore } from '../store/settingsStore'

export function LanguageSettings() {
  const id = useId()
  const { t, language } = useTranslation()
  const setLanguage = useSettingsStore((s) => s.setLanguage)
  return (
    <section>
      <label htmlFor={id} className="block font-display text-lg font-semibold">
        {t('Language')}
      </label>
      <select
        id={id}
        className="mt-3 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm text-ink"
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
      >
        {LANGUAGES.map((option) => (
          <option key={option} value={option} lang={option}>
            {option === 'fr' ? 'Français' : 'English'}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-ink/60">
        {t(
          'Language is detected from your browser on first launch. Your choice is saved on this device.',
        )}
      </p>
    </section>
  )
}
