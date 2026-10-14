import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Direction, directionOffset, oppositeDirection } from '../game/coords'
import { withTile } from '../game/board'
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
  useViewStore.setState({
    azimuth: 0,
    recenterRequest: 0,
    pivotRequest: 0,
    pivotTarget: null,
    zoomRequest: 0,
  })
})

const moves: [ScreenDirection, string, string, ScreenDirection][] = [
  ['up', 'ArrowUp', 'KeyW', 'down'],
  ['right', 'ArrowRight', 'KeyD', 'left'],
  ['down', 'ArrowDown', 'KeyS', 'up'],
  ['left', 'ArrowLeft', 'KeyA', 'right'],
]

describe('Shift + movement controls', () => {
  it.each(moves)(
    'aims towards %s inside cavities with arrows and both layouts at every camera heading',
    (motion, arrow, code) => {
      const grass = ['grass', 'grass', 'grass', 'grass'] as const
      let board = {}
      for (let q = 0; q <= 10; q++)
        for (let r = 0; r <= 10; r++) {
          if (q === 0 || q === 10 || r === 0 || r === 10)
            board = withTile(board, { coord: { q, r }, quadrants: grass })
        }
      for (const layout of ['azerty', 'qwerty'] as const) {
        useSettingsStore.getState().setKeyboardLayout(layout)
        for (const azimuth of [0, Math.PI / 2, Math.PI, -Math.PI / 2])
          for (const key of [arrow, code]) {
            const direction = screenToWorldDirection(motion, azimuth)
            useViewStore.setState({ azimuth })
            useGameStore.setState({
              board,
              falling: { q: 5, r: 5 },
              fallAnchor: undefined,
              tucked: false,
              fallDirection: oppositeDirection(direction),
              fallElapsed: 0.3,
            })
            const before = useGameStore.getState()
            press(key)
            const after = useGameStore.getState()
            const delta = directionOffset(direction)
            expect(after.fallDirection).toBe(direction)
            expect(landingPosition(after)).toEqual({ q: 5 + delta.q * 4, r: 5 + delta.r * 4 })
            expect(after.falling).toEqual(before.falling)
            expect(after.fallElapsed).toBe(0.3)
            expect(after.cameraMove).toBe(before.cameraMove)
            press(key, { repeat: true })
            expect(useGameStore.getState()).toBe(after)
          }
      }
    },
  )

  it('aims up at the upper wall and down at the lower wall while preserving the cavity distance limit', () => {
    const grass = ['grass', 'grass', 'grass', 'grass'] as const
    let board = {}
    for (let q = 0; q <= 6; q++)
      for (let r = 0; r <= 7; r++) {
        if (q === 0 || q === 6 || r === 0 || r === 7)
          board = withTile(board, { coord: { q, r }, quadrants: grass })
      }
    const local = {
      board,
      falling: { q: 3, r: 2 },
      fallAnchor: { q: 0, r: 2 },
      tucked: true,
      fallDirection: Direction.West,
      fallElapsed: 0.4,
    }
    useGameStore.setState(local)
    press('ArrowUp')
    expect(landingPosition(useGameStore.getState())).toEqual({ q: 3, r: 1 })
    expect(useGameStore.getState().falling).toEqual({ q: 3, r: 2 })
    useGameStore.setState(local)
    useSettingsStore.getState().bind('moveDown', 1, 'KeyJ')
    press('KeyJ')
    expect(landingPosition(useGameStore.getState())).toEqual({ q: 3, r: 6 })
    expect(useGameStore.getState().falling).toEqual({ q: 3, r: 4 })
    expect(useGameStore.getState().fallElapsed).toBe(0.4)
  })

  it.each(['azerty', 'qwerty'] as const)(
    'exchanges the same tiles using F and the right-hand key on %s',
    (layout) => {
      useSettingsStore.getState().setKeyboardLayout(layout)
      const before = useGameStore.getState()
      press('KeyF', { key: 'f', shiftKey: false })
      const exchanged = useGameStore.getState()
      expect(exchanged.queued?.quadrants).toBe(before.current)
      expect(exchanged.falling).toBe(before.falling)
      expect(exchanged.fallElapsed).toBe(before.fallElapsed)
      press('KeyF', { shiftKey: false, repeat: true })
      expect(useGameStore.getState()).toBe(exchanged)
      press('Quote', { key: layout === 'azerty' ? 'ù' : "'", shiftKey: false })
      expect(useGameStore.getState().current).toBe(before.current)
      expect(useGameStore.getState().queued?.quadrants).toBe(exchanged.current)
      expect(useGameStore.getState().seed).toBe(exchanged.seed)
      expect(useViewStore.getState().recenterRequest).toBe(0)
    },
  )

  it('supports rebound exchange and ignores it in menus, during capture and after game over', () => {
    useSettingsStore.getState().bind('swap', 0, 'KeyT')
    const before = useGameStore.getState()
    press('KeyF', { shiftKey: false })
    expect(useGameStore.getState()).toBe(before)
    before.openMenu()
    const paused = useGameStore.getState()
    press('KeyT', { shiftKey: false })
    expect(useGameStore.getState()).toBe(paused)
    paused.closeMenu()
    const playing = useGameStore.getState()
    useSettingsStore.getState().setCapturing({ action: 'swap', slot: 1 })
    press('KeyT', { shiftKey: false })
    expect(useGameStore.getState()).toBe(playing)
    useSettingsStore.getState().setCapturing(null)
    press('KeyT', { shiftKey: false })
    expect(useGameStore.getState().queued?.quadrants).toBe(playing.current)
    useGameStore.setState({ current: null, remaining: 0, falling: null })
    const ended = useGameStore.getState()
    press('KeyT', { shiftKey: false })
    expect(useGameStore.getState()).toBe(ended)
  })

  it.each(['azerty', 'qwerty'] as const)(
    'crosses separate islands with repeated Shift + Down / S on %s without key-repeat skipping',
    (layout) => {
      useSettingsStore.getState().setKeyboardLayout(layout)
      const grass = ['grass', 'grass', 'grass', 'grass'] as const
      const board = withTile(withTile({}, { coord: { q: 0, r: 0 }, quadrants: grass }), {
        coord: { q: 0, r: 8 },
        quadrants: grass,
      })
      useGameStore.setState({
        board,
        fallAnchor: undefined,
        fallDirection: Direction.South,
        falling: { q: 0, r: -10 },
        fallElapsed: 0.3,
      })
      press('ArrowDown')
      expect(landingPosition(useGameStore.getState())).toEqual({ q: 0, r: 1 })
      const edge = useGameStore.getState()
      press('ArrowDown', { repeat: true })
      expect(useGameStore.getState()).toBe(edge)
      press('KeyS')
      expect(landingPosition(useGameStore.getState())).toEqual({ q: 0, r: 7 })
      expect(useGameStore.getState()).toMatchObject({
        fallDirection: Direction.South,
        fallElapsed: 0.3,
        cameraMove: 0,
      })
    },
  )
  it.each(['azerty', 'qwerty'] as const)(
    'pivots one aligned side per press on %s, without changing the tile',
    (layout) => {
      useSettingsStore.getState().setKeyboardLayout(layout)
      const before = useGameStore.getState()
      press('KeyZ', { shiftKey: false }) // W on AZERTY, Z on QWERTY
      expect(useViewStore.getState()).toMatchObject({
        pivotTarget: -Math.PI / 2,
        pivotRequest: -Math.PI / 2,
      })
      press('KeyZ', { shiftKey: false, repeat: true })
      expect(useViewStore.getState().pivotTarget).toBe(-Math.PI / 2)
      press('KeyZ', { shiftKey: false })
      expect(useViewStore.getState().pivotTarget).toBe(-Math.PI)
      press('KeyX', { shiftKey: false })
      expect(useViewStore.getState().pivotTarget).toBe(-Math.PI / 2)
      expect(useGameStore.getState()).toBe(before)
    },
  )

  it('uses rebound pivot controls and ignores them while paused or capturing a key', () => {
    useSettingsStore.getState().bind('pivotRight', 0, 'KeyP')
    useGameStore.getState().openMenu()
    press('KeyP', { shiftKey: false })
    expect(useViewStore.getState().pivotTarget).toBeNull()
    useGameStore.getState().closeMenu()
    useSettingsStore.getState().setCapturing({ action: 'pivotRight', slot: 0 })
    press('KeyP', { shiftKey: false })
    expect(useViewStore.getState().pivotTarget).toBeNull()
    useSettingsStore.getState().setCapturing(null)
    press('KeyP', { shiftKey: false })
    expect(useViewStore.getState().pivotTarget).toBe(Math.PI / 2)
  })

  it('uses either hand for camera turns without rotating or moving the tile', () => {
    useSettingsStore.getState().setKeyboardLayout('azerty')
    const before = useGameStore.getState()
    press('Comma', { key: ';', shiftKey: false })
    expect(useViewStore.getState().pivotTarget).toBe(-Math.PI / 2)
    press('Comma', { key: ';', shiftKey: false, repeat: true })
    expect(useViewStore.getState().pivotTarget).toBe(-Math.PI / 2)
    press('KeyZ', { key: 'w', shiftKey: false })
    expect(useViewStore.getState().pivotTarget).toBe(-Math.PI)
    press('Period', { key: ':', shiftKey: false })
    expect(useViewStore.getState().pivotTarget).toBe(-Math.PI / 2)
    press('KeyX', { key: 'x', shiftKey: false })
    expect(useViewStore.getState().pivotTarget).toBe(0)
    expect(useGameStore.getState()).toBe(before)
  })
  it.each([
    { code: 'KeyC', key: 'c', shiftKey: false },
    { code: 'KeyC', key: 'C', shiftKey: true },
    { code: 'Digit1', key: '!', shiftKey: true },
    { code: 'Slash', key: '!', shiftKey: false },
  ])('requests camera framing with $key without changing the game', ({ code, key, shiftKey }) => {
    const before = useGameStore.getState()
    expect(press(code, { key, shiftKey }).preventDefault).toHaveBeenCalled()
    expect(useViewStore.getState().recenterRequest).toBe(1)
    expect(useGameStore.getState()).toBe(before)
    press(code, { key, shiftKey, repeat: true })
    expect(useViewStore.getState().recenterRequest).toBe(1)
  })

  it('removes the old Shift shortcuts and keeps custom R bindings', () => {
    useSettingsStore.getState().bind('rotateCw', 0, 'KeyR')
    press('KeyR', { key: 'r', shiftKey: false })
    expect(useGameStore.getState().rotation).toBe(1)
    expect(useViewStore.getState().recenterRequest).toBe(0)
    press('KeyR', { key: 'R' })
    expect(useGameStore.getState().rotation).toBe(2)
    press('KeyZ', { key: 'Z' })
    press('Slash', { key: '§' })
    expect(useViewStore.getState().recenterRequest).toBe(0)
  })

  it('disables reframing in menus, during capture and after game over', () => {
    press('KeyC', { key: 'c', shiftKey: false })
    expect(useViewStore.getState().recenterRequest).toBe(1)
    useGameStore.getState().openMenu()
    press('KeyC', { key: 'c', shiftKey: false })
    press('Slash', { key: '!', shiftKey: false })
    expect(useViewStore.getState().recenterRequest).toBe(1)
    useGameStore.getState().closeMenu()
    useSettingsStore.getState().setCapturing({ action: 'moveUp', slot: 1 })
    press('KeyC', { key: 'c', shiftKey: false })
    press('Slash', { key: '!', shiftKey: false })
    expect(useViewStore.getState().recenterRequest).toBe(1)
    useSettingsStore.getState().setCapturing(null)
    useGameStore.setState({ current: null, remaining: 0, falling: null })
    press('KeyC', { key: 'c', shiftKey: false })
    press('Slash', { key: '!', shiftKey: false })
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
