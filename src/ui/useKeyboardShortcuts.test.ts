import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Direction } from '../game/coords'
import { FALL_INTERVAL, landingPosition } from '../game/falling'
import { screenToWorldDirection } from '../input/movement'
import type { ScreenDirection } from '../input/movement'
import type { useGameStore as GameStore } from '../store/gameStore'
import type { useSettingsStore as SettingsStore } from '../store/settingsStore'
import { useViewStore } from '../store/viewStore'

// Install the actual listener without mounting the Three.js scene.
let cleanup: (() => void) | undefined
vi.mock('react', () => ({
  useEffect: (effect: () => () => void) => {
    cleanup = effect()
  },
}))

let onKey: (event: KeyboardEvent) => void
let useGameStore: typeof GameStore
let useSettingsStore: typeof SettingsStore

function press(code: string, overrides: Partial<KeyboardEvent> = {}) {
  const event = {
    code,
    key: code,
    shiftKey: true,
    repeat: false,
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as KeyboardEvent
  onKey(event)
  return event
}

beforeAll(async () => {
  vi.stubGlobal('window', {
    location: { search: '?seed=42' },
    addEventListener: (_type: string, listener: typeof onKey) => {
      onKey = listener
    },
    removeEventListener: vi.fn(),
  })
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })
  useGameStore = (await import('../store/gameStore')).useGameStore
  useSettingsStore = (await import('../store/settingsStore')).useSettingsStore
  const { useKeyboardShortcuts: installKeyboardShortcuts } = await import('./useKeyboardShortcuts')
  installKeyboardShortcuts()
})
afterAll(() => {
  cleanup?.()
  vi.unstubAllGlobals()
})
beforeEach(() => {
  useGameStore.getState().restart(42)
  useGameStore.getState().tick(FALL_INTERVAL * 5 + 0.3)
  useSettingsStore.getState().resetBindings()
  useSettingsStore.getState().setKeyboardLayout('qwerty')
  useViewStore.setState({ azimuth: 0, recenterRequest: 0 })
})

const moves: [ScreenDirection, string, string, ScreenDirection][] = [
  ['up', 'ArrowUp', 'KeyW', 'down'],
  ['right', 'ArrowRight', 'KeyD', 'left'],
  ['down', 'ArrowDown', 'KeyS', 'up'],
  ['left', 'ArrowLeft', 'KeyA', 'right'],
]

describe('Shift + movement controls', () => {
  it.each([
    { code: 'KeyR', key: 'R' },
    { code: 'Digit1', key: '!' },
    { code: 'Slash', key: '§' },
    { code: 'Slash', key: '!' },
  ])('requests camera framing with Shift + $key without changing the game', ({ code, key }) => {
    const before = useGameStore.getState()
    expect(press(code, { key }).preventDefault).toHaveBeenCalled()
    expect(useViewStore.getState().recenterRequest).toBe(1)
    expect(useGameStore.getState()).toBe(before)
    press(code, { key, repeat: true })
    expect(useViewStore.getState().recenterRequest).toBe(1)
  })

  it('keeps unmodified custom R bindings and disables reframing in menus or during capture', () => {
    useSettingsStore.getState().bind('rotateCw', 0, 'KeyR')
    press('KeyR', { key: 'r', shiftKey: false })
    expect(useGameStore.getState().rotation).toBe(1)
    expect(useViewStore.getState().recenterRequest).toBe(0)
    press('KeyR', { key: 'R' })
    expect(useGameStore.getState().rotation).toBe(1)
    expect(useViewStore.getState().recenterRequest).toBe(1)
    useGameStore.getState().openMenu()
    press('KeyR')
    expect(useViewStore.getState().recenterRequest).toBe(1)
    useGameStore.getState().closeMenu()
    useSettingsStore.getState().setCapturing({ action: 'moveUp', slot: 1 })
    press('KeyR')
    expect(useViewStore.getState().recenterRequest).toBe(1)
    useSettingsStore.getState().setCapturing(null)
    useGameStore.setState({ current: null, remaining: 0, falling: null })
    press('KeyR')
    expect(useViewStore.getState().recenterRequest).toBe(1)
  })
  it.each(moves)(
    'arrives from %s with arrows and both keyboard layouts',
    (_side, arrow, code, fallMotion) => {
      for (const layout of ['azerty', 'qwerty'] as const) {
        useSettingsStore.getState().setKeyboardLayout(layout)
        for (const azimuth of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          useViewStore.setState({ azimuth })
          for (const key of [arrow, code]) {
            const before = useGameStore.getState()
            const target = landingPosition(before)!
            const gap =
              Math.abs(target.q - before.falling!.q) + Math.abs(target.r - before.falling!.r)
            expect(press(key).preventDefault).toHaveBeenCalled()
            const after = useGameStore.getState()
            const landing = landingPosition(after)!
            expect(after.fallDirection).toBe(screenToWorldDirection(fallMotion, azimuth))
            expect(
              Math.abs(landing.q - after.falling!.q) + Math.abs(landing.r - after.falling!.r),
            ).toBe(gap)
            expect(after.fallElapsed).toBe(before.fallElapsed)
            expect(after.board).toBe(before.board)
            expect(after.cameraMove).toBe(before.cameraMove)
          }
        }
      }
    },
  )

  it('honours rebound movement keys and does not advance on a held Shift shortcut', () => {
    useSettingsStore.getState().bind('moveLeft', 1, 'KeyJ')
    press('KeyJ')
    expect(useGameStore.getState().fallDirection).toBe(Direction.East)
    const changed = useGameStore.getState()
    press('KeyJ', { repeat: true })
    press('KeyJ')
    press('ArrowDown', { repeat: true })
    expect(useGameStore.getState()).toBe(changed)
    press('ArrowRight', { shiftKey: false })
    expect(useGameStore.getState().falling!.q).toBe(changed.falling!.q + 1)
  })

  it('leaves ordinary lateral and forward controls intact', () => {
    press('ArrowRight', { shiftKey: false })
    const lateral = useGameStore.getState()
    expect(lateral.falling?.q).toBe(1)
    expect(lateral.cameraMove).toBe(1)
    press('ArrowDown', { shiftKey: false })
    expect(useGameStore.getState().falling?.r).toBe(lateral.falling!.r + 1)
    expect(useGameStore.getState().fallElapsed).toBe(0)
  })

  it('keeps the right-hand projected column when switching arrival from right to top', () => {
    press('ArrowRight')
    press('ArrowDown', { shiftKey: false })
    press('ArrowDown', { shiftKey: false })
    const before = useGameStore.getState()
    expect(landingPosition(before)).toEqual({ q: 1, r: 1 })
    press('ArrowUp')
    const after = useGameStore.getState()
    expect(after.fallDirection).toBe(Direction.South)
    expect(after.falling).toEqual({ q: 1, r: -5 })
    expect(landingPosition(after)).toEqual({ q: 1, r: -1 })
    expect(after.fallElapsed).toBe(before.fallElapsed)
    expect(after.cameraMove).toBe(before.cameraMove)
  })

  it('ignores shortcuts while paused, capturing a binding or after game over', () => {
    useGameStore.getState().openMenu()
    const paused = useGameStore.getState()
    press('ArrowLeft')
    expect(useGameStore.getState()).toBe(paused)
    paused.closeMenu()
    const playing = useGameStore.getState()
    useSettingsStore.getState().setCapturing({ action: 'moveLeft', slot: 1 })
    press('ArrowLeft')
    expect(useGameStore.getState()).toBe(playing)
    useSettingsStore.getState().setCapturing(null)
    press('ArrowLeft', { ctrlKey: true })
    expect(useGameStore.getState()).toBe(playing)
    useGameStore.setState({ current: null, remaining: 0, falling: null })
    const ended = useGameStore.getState()
    press('ArrowLeft')
    expect(useGameStore.getState()).toBe(ended)
  })
})
