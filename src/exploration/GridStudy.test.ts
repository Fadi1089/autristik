import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@react-three/fiber', () => ({ Canvas: () => null }))
vi.mock('@react-three/drei', () => ({ MapControls: () => null }))
// Importing the default app must not initialise the old game store or its mechanics.
vi.mock('../store/gameStore', () => {
  throw new Error('The grid study must be independent of game state')
})
vi.mock('../store/settingsStore', async (original) => {
  const actual = await original<typeof import('../store/settingsStore')>()
  const store = actual.useSettingsStore
  return {
    ...actual,
    useSettingsStore: Object.assign(
      (select: (state: ReturnType<typeof store.getState>) => unknown) => select(store.getState()),
      store,
    ),
  }
})

beforeAll(() => {
  vi.stubGlobal('window', { location: { search: '?seed=42' } })
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() })
})
afterAll(() => vi.unstubAllGlobals())

describe('standalone grid presentation', () => {
  it.each(['fr', 'en'] as const)(
    'opens directly on the grid without gameplay UI in %s',
    async (language) => {
      const { App } = await import('../App')
      const { useSettingsStore } = await import('../store/settingsStore')
      useSettingsStore.getState().setLanguage(language)
      for (const theme of ['light', 'dark'] as const) {
        useSettingsStore.getState().setTheme(theme)
        const markup = renderToStaticMarkup(createElement(App))
        expect(markup).toContain('Autristik')
        expect(markup).toContain(language === 'fr' ? 'Grille et caméra' : 'Grid and camera')
        expect(markup).toContain(language === 'fr' ? 'Centre : 0, 0' : 'Centre: 0, 0')
        expect(markup).toContain(language === 'fr' ? 'Recentrer' : 'Recenter')
        expect(markup).not.toContain('data-menu-item')
        expect(markup).not.toContain(language === 'fr' ? 'Temps restant' : 'Time remaining')
        expect(markup).not.toContain(language === 'fr' ? 'Suivante' : 'Next')
      }
    },
  )
})
