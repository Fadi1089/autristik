import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_BINDINGS } from '../input/bindings'
import { keyLabel } from '../input/keyLabels'
import { DEFAULT_MENU_SOUND_VOLUME } from '../customization'
import type { useSettingsStore as Store } from './settingsStore'

let useSettingsStore: typeof Store
let migrated: ReturnType<typeof Store.getState>
const saved = new Map<string, string>()

beforeAll(async () => {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  })
  saved.set(
    'autristik:settings',
    JSON.stringify({
      version: 1,
      state: {
        bindings: {
          ...DEFAULT_BINDINGS,
          rotateCw: ['KeyR', 'KeyE'],
          rotateCcw: ['KeyQ', null],
          place: ['KeyP', 'Space'],
        },
      },
    }),
  )
  useSettingsStore = (await import('./settingsStore')).useSettingsStore
  migrated = useSettingsStore.getState()
})
afterAll(() => vi.unstubAllGlobals())
beforeEach(() => {
  useSettingsStore.getState().resetBindings()
  useSettingsStore.getState().setKeyboardLayout('qwerty')
  useSettingsStore.getState().setTheme('light')
  useSettingsStore.getState().setPlacementSound('wood')
  useSettingsStore.getState().setSoundVolume(0.5)
  useSettingsStore.getState().setMenuSoundEnabled(true)
  useSettingsStore.getState().setMenuSoundVolume(DEFAULT_MENU_SOUND_VOLUME)
  useSettingsStore.getState().setMusicEnabled(true)
  useSettingsStore.getState().setMusicVolume(0.18)
})

describe('keyboard layout settings', () => {
  it('migrates stored defaults and retains existing custom controls', () => {
    expect(migrated.bindings.rotateCw).toEqual(['KeyE', 'PageDown'])
    expect(migrated.bindings.rotateCcw).toEqual(['KeyQ', 'PageUp'])
    expect(migrated.bindings.place).toEqual(['KeyP', 'Space'])
    expect(migrated.theme).toBe('light')
    expect(migrated.placementSound).toBe('wood')
    expect(migrated.soundVolume).toBe(0.5)
  })

  it('switches labels without losing custom shortcuts, and saves the choice', async () => {
    const store = useSettingsStore.getState()
    store.bind('place', 0, 'KeyT')
    const bindings = useSettingsStore.getState().bindings
    store.setCapturing({ action: 'moveUp', slot: 1 })
    store.setKeyboardLayout('azerty')
    let state = useSettingsStore.getState()
    expect(keyLabel(state.bindings.moveUp[1]!, state.layout)).toBe('Z')
    expect(state.bindings).toBe(bindings)
    expect(state.capturing).toBeNull()
    expect(JSON.parse(saved.get('autristik:settings')!)).toMatchObject({
      version: 4,
      state: { keyboardLayout: 'azerty', bindings: { place: ['KeyT', 'Space'] } },
    })
    await useSettingsStore.persist.rehydrate()
    state = useSettingsStore.getState()
    expect(state.keyboardLayout).toBe('azerty')
    expect(keyLabel(state.bindings.moveLeft[1]!, state.layout)).toBe('Q')
    state.setKeyboardLayout('qwerty')
    expect(keyLabel(state.bindings.moveLeft[1]!, useSettingsStore.getState().layout)).toBe('A')
  })

  it('resets to the new rotation defaults and keeps the chosen layout', () => {
    const store = useSettingsStore.getState()
    store.setKeyboardLayout('azerty')
    store.bind('rotateCw', 0, 'KeyT')
    store.resetBindings()
    expect(useSettingsStore.getState().bindings).toEqual(DEFAULT_BINDINGS)
    expect(useSettingsStore.getState().keyboardLayout).toBe('azerty')
  })

  it('adds camera shortcuts to saved version 2 settings without changing custom controls', async () => {
    saved.set(
      'autristik:settings',
      JSON.stringify({
        version: 2,
        state: {
          keyboardLayout: 'azerty',
          bindings: {
            ...DEFAULT_BINDINGS,
            pivotLeft: ['KeyZ', null],
            pivotRight: ['KeyX', null],
            rotateCw: ['KeyR', 'KeyE'],
          },
        },
      }),
    )
    await useSettingsStore.persist.rehydrate()
    const state = useSettingsStore.getState()
    expect(state.bindings.pivotLeft).toEqual(['KeyZ', 'Comma'])
    expect(state.bindings.pivotRight).toEqual(['KeyX', 'Period'])
    expect(state.bindings.rotateCw).toEqual(['KeyR', 'KeyE'])
    expect(state.keyboardLayout).toBe('azerty')
    expect(JSON.parse(saved.get('autristik:settings')!).version).toBe(4)
  })
})

describe('customization preferences', () => {
  it.each([
    [0.25, DEFAULT_MENU_SOUND_VOLUME],
    [0.6, 0.6],
    [0, 0],
  ])(
    'migrates menu volume %s to %s without changing other preferences',
    async (previous, expected) => {
      const bindings = {
        ...DEFAULT_BINDINGS,
        pivotLeft: ['KeyZ', null],
        pivotRight: ['KeyX', 'KeyT'],
      }
      saved.set(
        'autristik:settings',
        JSON.stringify({
          version: 3,
          state: {
            bindings,
            keyboardLayout: 'azerty',
            theme: 'dark',
            menuSoundVolume: previous,
            menuSoundEnabled: false,
            musicEnabled: false,
            musicVolume: 0.37,
            placementSound: 'glass',
            soundVolume: 0.4,
          },
        }),
      )
      await useSettingsStore.persist.rehydrate()
      expect(useSettingsStore.getState()).toMatchObject({
        bindings,
        keyboardLayout: 'azerty',
        theme: 'dark',
        menuSoundVolume: expected,
        menuSoundEnabled: false,
        musicEnabled: false,
        musicVolume: 0.37,
        placementSound: 'glass',
        soundVolume: 0.4,
      })
      expect(JSON.parse(saved.get('autristik:settings')!).version).toBe(4)
    },
  )
  it('saves independent music and menu controls, including disabled and muted choices', async () => {
    const settings = useSettingsStore.getState()
    settings.setMusicEnabled(false)
    settings.setMusicVolume(0)
    settings.setMenuSoundEnabled(false)
    settings.setMenuSoundVolume(0.6)
    await useSettingsStore.persist.rehydrate()
    expect(useSettingsStore.getState()).toMatchObject({
      musicEnabled: false,
      musicVolume: 0,
      menuSoundEnabled: false,
      menuSoundVolume: 0.6,
      soundVolume: 0.5,
      placementSound: 'wood',
    })
    settings.resetBindings()
    expect(useSettingsStore.getState().musicEnabled).toBe(false)
  })
  it('persists theme, sound and volume without changing keyboard bindings', async () => {
    const store = useSettingsStore.getState()
    store.bind('place', 0, 'KeyT')
    const bindings = useSettingsStore.getState().bindings
    store.setTheme('dark')
    store.setPlacementSound('glass')
    store.setSoundVolume(0.75)
    await useSettingsStore.persist.rehydrate()
    expect(useSettingsStore.getState()).toMatchObject({
      theme: 'dark',
      placementSound: 'glass',
      soundVolume: 0.75,
      bindings,
    })
    store.resetBindings()
    expect(useSettingsStore.getState()).toMatchObject({
      theme: 'dark',
      placementSound: 'glass',
      soundVolume: 0.75,
    })
    store.setSoundVolume(2)
    expect(useSettingsStore.getState().soundVolume).toBe(1)
    store.setSoundVolume(-1)
    expect(useSettingsStore.getState().soundVolume).toBe(0)
    store.setPlacementSound('none')
    await useSettingsStore.persist.rehydrate()
    expect(useSettingsStore.getState()).toMatchObject({ placementSound: 'none', soundVolume: 0 })
  })

  it('restores safe defaults for missing or malformed saved preferences', async () => {
    saved.set(
      'autristik:settings',
      JSON.stringify({
        version: 3,
        state: {
          theme: 'unknown',
          placementSound: 'bad-path',
          soundVolume: 'loud',
          bindings: DEFAULT_BINDINGS,
        },
      }),
    )
    await useSettingsStore.persist.rehydrate()
    expect(useSettingsStore.getState()).toMatchObject({
      theme: 'light',
      placementSound: 'wood',
      soundVolume: 0.5,
      menuSoundVolume: DEFAULT_MENU_SOUND_VOLUME,
    })
  })
})
