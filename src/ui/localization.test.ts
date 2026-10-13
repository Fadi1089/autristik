import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import type { ComponentType } from 'react'

// Render the actual HTML overlays in both languages without requiring WebGL.
vi.mock('@react-three/fiber', () => ({ Canvas: () => null }))
vi.mock('../scene/TrayTile', () => ({ TrayTile: () => null }))
vi.mock('../store/settingsStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/settingsStore')>()
  const store = actual.useSettingsStore
  return {
    ...actual,
    useSettingsStore: Object.assign(
      (select: (state: ReturnType<typeof store.getState>) => unknown) => select(store.getState()),
      store,
    ),
  }
})
vi.mock('../store/gameStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/gameStore')>()
  const store = actual.useGameStore
  return {
    ...actual,
    useGameStore: Object.assign(
      (select: (state: ReturnType<typeof store.getState>) => unknown) => select(store.getState()),
      store,
    ),
  }
})
vi.mock('../store/recordsStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/recordsStore')>()
  const store = actual.useRecordsStore
  return {
    ...actual,
    useRecordsStore: Object.assign(
      (select: (state: ReturnType<typeof store.getState>) => unknown) => select(store.getState()),
      store,
    ),
  }
})

let Menu: ComponentType
let HowToPlay: ComponentType
let KeySettings: ComponentType
let Customization: ComponentType
let Gamemode: ComponentType
let HUD: ComponentType
let GameOver: ComponentType
let settings: typeof import('../store/settingsStore').useSettingsStore
let game: typeof import('../store/gameStore').useGameStore
let records: typeof import('../store/recordsStore').useRecordsStore

beforeAll(async () => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() })
  vi.stubGlobal('window', { location: { search: '?seed=42' } })
  settings = (await import('../store/settingsStore')).useSettingsStore
  game = (await import('../store/gameStore')).useGameStore
  records = (await import('../store/recordsStore')).useRecordsStore
  ;({ Menu, HowToPlay } = await import('./Menu'))
  ;({ KeySettings } = await import('./KeySettings'))
  ;({ Customization } = await import('./Customization'))
  ;({ Gamemode } = await import('./Gamemode'))
  ;({ HUD } = await import('./HUD'))
  ;({ GameOver } = await import('./GameOver'))
})
beforeEach(() => {
  records.setState({ records: {} })
  game.getState().restart(42, 'easy', 'superblock', 'standard')
})
afterAll(() => vi.unstubAllGlobals())

describe('localized game overlays', () => {
  it.each(['fr', 'en'] as const)(
    'groups the guide into closed disclosures, with special tiles only for Superblock in %s',
    (language) => {
      settings.getState().setLanguage(language)
      const render = () => renderToStaticMarkup(createElement(HowToPlay))
      game.setState({ started: false, nextMode: 'superblock' })
      const superblock = render()
      expect(superblock.match(/<details\b/g)).toHaveLength(3)
      expect(superblock.match(/<summary\b/g)).toHaveLength(3)
      expect(superblock).not.toMatch(/<details[^>]*\bopen=/)
      expect(superblock).toContain(
        language === 'fr' ? 'Types de tuiles (Superblock)' : 'Tile types (Superblock)',
      )
      expect(superblock).toContain(language === 'fr' ? '3 % de chance' : '3% draw chance')
      game.setState({ nextMode: 'classic' })
      expect(render().match(/<details\b/g)).toHaveLength(2)
      expect(render()).not.toContain(
        language === 'fr' ? 'Types de tuiles (Superblock)' : 'Tile types (Superblock)',
      )
      game.setState({ started: true, mode: 'superblock' })
      expect(render().match(/<details\b/g)).toHaveLength(3)
      expect(render()).toContain(
        language === 'fr' ? 'trois de ses quatre faces' : 'three of its four faces',
      )
    },
  )

  it('uses the same fifteen-second visual threshold as audio and marks a low tile supply', () => {
    const render = () => renderToStaticMarkup(createElement(HUD))
    game.getState().restart(42, 'easy', 'classic', 'time-attack')
    game.setState({ timeRemaining: 15.01, remaining: 6 })
    expect(render()).not.toContain('text-danger')
    game.setState({ timeRemaining: 15, remaining: 6 })
    expect(render()).toContain('text-danger')
    game.setState({ timeRemaining: 45, remaining: 5 })
    expect(render()).toContain('text-danger')
    game.setState({ remaining: 30 })
    expect(render()).not.toContain('text-danger')
  })

  it.each(['fr', 'en'] as const)(
    'compares final scores and the selected mode record in %s',
    (language) => {
      settings.getState().setLanguage(language)
      records.getState().recordScore('superblock', 'standard', 150)
      game.getState().restart(42, 'easy', 'superblock', 'standard')
      const render = (component: ComponentType) => renderToStaticMarkup(createElement(component))
      expect(render(Gamemode)).toContain('150 points')
      game.setState({ score: 130, current: null, falling: null, remaining: 0 })
      expect(render(GameOver)).toContain(
        language === 'fr' ? 'À 20 points de ton record' : '20 points short of your best',
      )
      game.getState().restart(42)
      game.setState({ score: 200, current: null, falling: null, remaining: 0 })
      expect(render(GameOver)).toContain(language === 'fr' ? 'Nouveau record !' : 'New record!')
      expect(render(GameOver)).toContain(
        language === 'fr' ? 'Record précédent : 150 points' : 'Previous best: 150 points',
      )
      game.getState().restart(42)
      game.setState({ score: 200, current: null, falling: null, remaining: 0 })
      expect(render(GameOver)).toContain(language === 'fr' ? 'Record égalé !' : 'Record matched!')
      records.getState().recordScore('classic', 'time-attack', 75)
      game.getState().setNextMode('classic')
      game.getState().setNextVariant('time-attack')
      expect(render(Gamemode)).toContain('75 points')
      expect(render(Gamemode)).not.toContain('200 points')
    },
  )

  it.each(['fr', 'en'] as const)(
    'shows Time-attack rules, limited supply and countdown in %s',
    (language) => {
      settings.getState().setLanguage(language)
      game.getState().restart(42, 'insane', 'classic', 'time-attack')
      const render = (component: ComponentType) => renderToStaticMarkup(createElement(component))
      expect(render(Gamemode)).toContain('Time-attack')
      expect(render(Gamemode)).toContain(language === 'fr' ? '30 tuiles' : '30 tiles')
      const hud = render(HUD)
      expect(hud).toContain(language === 'fr' ? 'Temps restant' : 'Time remaining')
      expect(hud).toContain('0:45')
      expect(hud).not.toContain('∞')
      expect(hud).toContain('>30<')
      game.getState().tick(100)
      expect(render(GameOver)).toContain(language === 'fr' ? 'Temps écoulé' : 'Time is up')
      expect(render(GameOver)).not.toContain(
        language === 'fr' ? 'La réserve est vide' : 'The stack is empty',
      )
    },
  )

  it.each([
    [
      'fr',
      'Jouer',
      'Réglages',
      'Langue',
      'Personnalisation',
      'Reprendre',
      'Niveau 1',
      'Temps de jeu',
      'Partie terminée',
    ],
    [
      'en',
      'Play',
      'Settings',
      'Language',
      'Customization',
      'Resume',
      'Level 1',
      'Time played',
      'Game over',
    ],
  ] as const)(
    'renders all surfaces in %s with a shared saved preference',
    (language, play, preferences, languageLabel, customization, resume, level, timer, ended) => {
      settings.getState().setLanguage(language)
      game.setState({ started: false, menuOpen: true })
      const render = (component: ComponentType) => renderToStaticMarkup(createElement(component))
      const main = render(Menu)
      expect(main).toContain('Autristik')
      expect(main).toContain(play)
      expect(main).toContain(preferences)
      expect(main).toContain(customization)
      expect(main.match(/data-selected="true"/g)).toHaveLength(1)
      expect(main).toContain('data-menu-secondary="start"')
      const options = render(KeySettings)
      expect(options).toContain(languageLabel)
      expect(options).toContain('Français')
      expect(options).toContain('English')
      expect(render(Customization)).toContain(
        language === 'fr' ? 'Bruitages des tuiles standard' : 'Standard tile sounds',
      )
      expect(options).toContain('id="placement-volume"')
      expect(options).not.toContain('id="special-tile-volume"')
      expect(options).toContain(language === 'fr' ? 'Bruitages des tuiles' : 'Tile sounds')
      expect(options).toContain(language === 'fr' ? 'Écouter le son' : 'Preview sound')
      const custom = render(Customization)
      expect(custom).not.toContain('type="range"')
      expect(custom).not.toContain('id="placement-volume"')
      expect(custom).not.toContain('id="special-tile-volume"')
      expect(custom).not.toContain('aria-label="Audio"')
      expect(custom).not.toContain(language === 'fr' ? 'Musique de fond' : 'Background music')
      expect(render(Gamemode)).toContain(
        language === 'fr' ? 'Terrains uniquement' : 'Regular terrain only',
      )
      game.setState({ started: true })
      expect(render(Menu)).toContain(resume)
      game.getState().closeMenu()
      expect(render(HUD)).toContain(level)
      expect(render(HUD)).toContain(timer)
      expect(render(HUD)).toContain(language === 'fr' ? 'Actuelle' : 'Current')
      expect(render(HUD)).toContain(language === 'fr' ? 'Suivante' : 'Next')
      game.setState({ current: null, remaining: 0, falling: null })
      expect(render(GameOver)).toContain(ended)
    },
  )
})
