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

describe('biome probability preferences', () => {
  it('keeps as many biomes above 0 as the largest biome count', async () => {
    const store = (await import('./settingsStore')).useSettingsStore
    // The defaults allow 4-biome pieces, so only one of the five biomes can go.
    for (const biome of ['black', 'green', 'yellow', 'blue'] as const)
      store.getState().setBiomeWeight(biome, 0)
    expect(store.getState().biomeProbabilities.biomeWeights).toEqual({
      black: 0,
      red: 30,
      green: 30,
      yellow: 17.5,
      blue: 5,
    })
  })

  it('only raises a biome count once enough biomes are enabled', async () => {
    const store = (await import('./settingsStore')).useSettingsStore
    for (const count of [2, 3, 4] as const) store.getState().setBiomeCountWeight(count, 0)
    for (const biome of ['black', 'green', 'yellow', 'blue'] as const)
      store.getState().setBiomeWeight(biome, 0)
    expect(store.getState().biomeProbabilities.biomeWeights).toEqual({
      black: 0,
      red: 30,
      green: 0,
      yellow: 0,
      blue: 0,
    })
    store.getState().setBiomeCountWeight(2, 50)
    expect(store.getState().biomeProbabilities.biomeCounts[2]).toBe(0)
    store.getState().setBiomeWeight('green', 10)
    store.getState().setBiomeCountWeight(2, 50)
    store.getState().setBiomeCountWeight(3, 99)
    expect(store.getState().biomeProbabilities.biomeCounts).toMatchObject({ 2: 50, 3: 0 })
    store.getState().setBiomeWeight('blue', 9)
    store.getState().setBiomeCountWeight(3, 99)
    expect(store.getState().biomeProbabilities.biomeCounts[3]).toBe(99)
  })

  it('restores default biome weights when saved settings ask for more biomes than enabled', async () => {
    saved.set(
      'autristik:settings',
      JSON.stringify({
        version: 2,
        state: {
          biomeProbabilities: {
            biomeCounts: { 1: 0, 2: 0, 3: 99, 4: 0 },
            biomeWeights: { black: 0, red: 0, green: 0, yellow: 1, blue: 9 },
          },
        },
      }),
    )
    const { DEFAULT_BIOME_PROBABILITIES } = await import('../game/tiles')
    const store = (await import('./settingsStore')).useSettingsStore
    expect(store.getState().biomeProbabilities).toEqual({
      biomeCounts: { 1: 0, 2: 0, 3: 99, 4: 0 },
      biomeWeights: DEFAULT_BIOME_PROBABILITIES.biomeWeights,
    })
  })

  it('restores default biome weights when saved settings mix pieces with a single biome', async () => {
    saved.set(
      'autristik:settings',
      JSON.stringify({
        version: 2,
        state: {
          biomeProbabilities: {
            biomeCounts: { 1: 0, 2: 100, 3: 0, 4: 0 },
            biomeWeights: { black: 0, red: 100, green: 0, yellow: 0, blue: 0 },
          },
        },
      }),
    )
    const { DEFAULT_BIOME_PROBABILITIES } = await import('../game/tiles')
    const store = (await import('./settingsStore')).useSettingsStore
    expect(store.getState().biomeProbabilities).toEqual({
      biomeCounts: { 1: 0, 2: 100, 3: 0, 4: 0 },
      biomeWeights: DEFAULT_BIOME_PROBABILITIES.biomeWeights,
    })
  })

  it('normalizes invalid saved weights and restores defaults for an all-zero group', async () => {
    saved.set(
      'autristik:settings',
      JSON.stringify({
        version: 2,
        state: {
          biomeProbabilities: {
            biomeCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
            biomeWeights: { black: 0, red: 0, green: 0, yellow: 0, blue: 0 },
          },
        },
      }),
    )
    const store = (await import('./settingsStore')).useSettingsStore
    expect(store.getState().biomeProbabilities).toEqual(
      (await import('../game/tiles')).DEFAULT_BIOME_PROBABILITIES,
    )
    store.getState().setBiomeWeight('blue', Number.POSITIVE_INFINITY)
    expect(store.getState().biomeProbabilities.biomeWeights.blue).toBe(5)
  })
})
