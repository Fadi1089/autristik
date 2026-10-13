export const LANGUAGES = ['fr', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

/** Use browser preferences, without requesting location or changing keyboard bindings. */
export function detectLanguage(preferences: readonly string[]): Language {
  for (const preference of preferences) {
    const language = preference.toLowerCase().split(/[-_]/)[0]
    if (language === 'fr' || language === 'en') return language
  }
  return 'en'
}

export function browserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en'
  return detectLanguage(navigator.languages?.length ? navigator.languages : [navigator.language])
}

export function normalizeLanguage(value: unknown): Language {
  return value === 'fr' || value === 'en' ? value : browserLanguage()
}
