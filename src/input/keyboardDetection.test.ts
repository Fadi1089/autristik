import { afterEach, describe, expect, it, vi } from 'vitest'
import { fallbackKeyboardLayout, layoutFromMap, observeKeyboardLayout } from './keyboardDetection'
import { loadLayoutMap } from './keyLabels'

afterEach(() => vi.unstubAllGlobals())

describe('keyboard detection', () => {
  it('uses the browser language only as a fallback', () => {
    expect(fallbackKeyboardLayout('fr-FR')).toBe('azerty')
    expect(fallbackKeyboardLayout('fr-BE')).toBe('azerty')
    expect(fallbackKeyboardLayout('en-GB')).toBe('qwerty')
    expect(fallbackKeyboardLayout('fr-CA')).toBe('qwerty')
  })

  it('identifies supported layouts from the actual key map', () => {
    expect(layoutFromMap({ KeyQ: 'a', KeyW: 'z' })).toBe('azerty')
    expect(layoutFromMap({ KeyQ: 'q', KeyW: 'w' })).toBe('qwerty')
    expect(layoutFromMap({})).toBeNull()
    expect(layoutFromMap({ KeyQ: "'", KeyW: ',' })).toBeNull()
  })

  it('handles browsers without the API or with a denied request', async () => {
    vi.stubGlobal('navigator', {})
    expect(await loadLayoutMap()).toBeNull()
    vi.stubGlobal('navigator', {
      keyboard: { getLayoutMap: () => Promise.reject(new Error('denied')) },
    })
    expect(await loadLayoutMap()).toBeNull()
  })

  it('uses the browser map when available', async () => {
    vi.stubGlobal('window', new EventTarget())
    vi.stubGlobal('navigator', {
      keyboard: {
        getLayoutMap: async () =>
          new Map([
            ['KeyQ', 'a'],
            ['KeyW', 'z'],
          ]),
      },
    })
    const detected = vi.fn()
    const stop = observeKeyboardLayout(detected)
    await vi.waitFor(() => expect(detected).toHaveBeenCalledWith('azerty'))
    stop()
  })

  it('does not reinterpret movement keys as a layout change before or after the browser map', async () => {
    const host = new EventTarget()
    vi.stubGlobal('window', host)
    let resolveMap!: (map: Map<string, string>) => void
    vi.stubGlobal('navigator', {
      keyboard: {
        getLayoutMap: () =>
          new Promise<Map<string, string>>((resolve) => {
            resolveMap = resolve
          }),
      },
    })
    const detected = vi.fn()
    const stop = observeKeyboardLayout(detected)
    const event = (key: string) =>
      Object.assign(new Event('keydown'), {
        code: `Key${key.toUpperCase()}`,
        key,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        isComposing: false,
      })
    for (const key of 'zqsd') host.dispatchEvent(event(key))
    expect(detected).not.toHaveBeenCalled()
    resolveMap(
      new Map([
        ['KeyQ', 'a'],
        ['KeyW', 'z'],
      ]),
    )
    await Promise.resolve()
    await Promise.resolve()
    expect(detected.mock.calls).toEqual([['azerty']])
    for (const key of 'zqsd') host.dispatchEvent(event(key))
    expect(detected).toHaveBeenCalledTimes(1)
    stop()
    host.dispatchEvent(event('q'))
    expect(detected).toHaveBeenCalledTimes(1)
  })

  it('discards a pending detection when it is stopped', async () => {
    vi.stubGlobal('window', new EventTarget())
    vi.stubGlobal('navigator', {
      keyboard: {
        getLayoutMap: async () =>
          new Map([
            ['KeyQ', 'a'],
            ['KeyW', 'z'],
          ]),
      },
    })
    const detected = vi.fn()
    const stop = observeKeyboardLayout(detected)
    stop()
    await Promise.resolve()
    await Promise.resolve()
    expect(detected).not.toHaveBeenCalled()
  })
})
