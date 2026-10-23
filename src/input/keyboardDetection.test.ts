import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fallbackKeyboardLayout,
  layoutFromKey,
  layoutFromMap,
  observeKeyboardLayout,
} from './keyboardDetection'
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

  it('identifies real letter keys but ignores modifiers, composition and unrelated keys', () => {
    const key = {
      code: 'KeyW',
      key: 'Z',
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      isComposing: false,
    }
    expect(layoutFromKey(key)).toBe('azerty')
    expect(layoutFromKey({ ...key, key: 'w' })).toBe('qwerty')
    expect(layoutFromKey({ ...key, ctrlKey: true })).toBeNull()
    expect(layoutFromKey({ ...key, altKey: true })).toBeNull()
    expect(layoutFromKey({ ...key, isComposing: true })).toBeNull()
    expect(layoutFromKey({ ...key, code: 'ArrowUp', key: 'ArrowUp' })).toBeNull()
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

  it('prefers a real keystroke over a late map and stops listening on cleanup', async () => {
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
    const event = () =>
      Object.assign(new Event('keydown'), {
        code: 'KeyW',
        key: 'z',
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        isComposing: false,
      })
    host.dispatchEvent(event())
    resolveMap(
      new Map([
        ['KeyQ', 'q'],
        ['KeyW', 'w'],
      ]),
    )
    await Promise.resolve()
    await Promise.resolve()
    expect(detected.mock.calls).toEqual([['azerty']])
    stop()
    host.dispatchEvent(event())
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
