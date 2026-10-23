import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let saved: Map<string, string>

beforeEach(() => {
  vi.resetModules()
  saved = new Map()
  vi.stubGlobal('navigator', { language: 'fr-FR' })
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('keyboard layout preferences', () => {
  it('starts in automatic detection and allows the real keyboard to override the language fallback', async () => {
    const store = (await import('./settingsStore')).useSettingsStore
    expect(store.getState()).toMatchObject({
      keyboardLayout: 'azerty',
      keyboardLayoutManual: false,
    })
    store.getState().setDetectedKeyboardLayout('qwerty')
    expect(store.getState()).toMatchObject({
      keyboardLayout: 'qwerty',
      keyboardLayoutManual: false,
    })
  })

  it('preserves a manual choice across reloads and ignores late detections without altering bindings', async () => {
    const store = (await import('./settingsStore')).useSettingsStore
    store.getState().bind('moveUp', 1, 'KeyI')
    store.getState().setBiomeWeight('red', 42)
    store.getState().setKeyboardLayout('qwerty')
    store.getState().setDetectedKeyboardLayout('azerty')
    expect(store.getState()).toMatchObject({ keyboardLayout: 'qwerty', keyboardLayoutManual: true })
    expect(store.getState().bindings.moveUp).toEqual(['ArrowUp', 'KeyI'])
    vi.resetModules()
    const reloaded = (await import('./settingsStore')).useSettingsStore.getState()
    expect(reloaded).toMatchObject({ keyboardLayout: 'qwerty', keyboardLayoutManual: true })
    expect(reloaded.bindings.moveUp).toEqual(['ArrowUp', 'KeyI'])
    expect(reloaded.biomeProbabilities.biomeWeights.red).toBe(42)
  })

  it('keeps saved layouts from the previous version as manual preferences', async () => {
    saved.set(
      'autristik:settings',
      JSON.stringify({ version: 2, state: { keyboardLayout: 'qwerty' } }),
    )
    const store = (await import('./settingsStore')).useSettingsStore
    store.getState().setDetectedKeyboardLayout('azerty')
    expect(store.getState()).toMatchObject({ keyboardLayout: 'qwerty', keyboardLayoutManual: true })
  })

  it('does not turn an automatically detected layout into a manual preference on reload', async () => {
    const store = (await import('./settingsStore')).useSettingsStore
    store.getState().setDetectedKeyboardLayout('qwerty')
    vi.resetModules()
    const reloaded = (await import('./settingsStore')).useSettingsStore
    expect(reloaded.getState().keyboardLayoutManual).toBe(false)
    reloaded.getState().setDetectedKeyboardLayout('azerty')
    expect(reloaded.getState().keyboardLayout).toBe('azerty')
  })
})
