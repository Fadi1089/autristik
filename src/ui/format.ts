import type { Language } from '../i18n/language'

const scoreFormats = {
  fr: new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }),
  en: new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }),
}

/** Keep fractional combo points and quarter-step multipliers readable. */
export function formatPoints(points: number, language: Language = 'fr'): string {
  return scoreFormats[language].format(points)
}

/** Elapsed play time: M:SS, then H:MM:SS for long games. */
export function formatDuration(seconds: number): string {
  const total = Math.floor(Math.max(0, Number.isFinite(seconds) ? seconds : 0))
  const minutes = Math.floor(total / 60)
  const tail = String(total % 60).padStart(2, '0')
  return total < 3600
    ? `${minutes}:${tail}`
    : `${Math.floor(total / 3600)}:${String(minutes % 60).padStart(2, '0')}:${tail}`
}
