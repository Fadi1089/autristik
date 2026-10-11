import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_BINDINGS } from '../input/bindings'
import { keyLabel } from '../input/keyLabels'
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
})

describe('keyboard layout settings', () => {
  it('migrates stored defaults and retains existing custom controls', () => {
    expect(migrated.bindings.rotateCw).toEqual(['KeyE', 'PageDown'])
    expect(migrated.bindings.rotateCcw).toEqual(['KeyQ', 'PageUp'])
    expect(migrated.bindings.place).toEqual(['KeyP', 'Space'])
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
      version: 3,
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
    expect(JSON.parse(saved.get('autristik:settings')!).version).toBe(3)
  })
})
