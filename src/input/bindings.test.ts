import { describe, expect, it } from 'vitest'
import {
  actionForCode,
  DEFAULT_BINDINGS,
  normalizeBindings,
  withBinding,
  withoutBinding,
} from './bindings'
import { KEYBOARD_LAYOUT_MAPS, keyCodeForLayout, keyLabel } from './keyLabels'

describe('key bindings', () => {
  it('finds the action for a key, including secondary slots', () => {
    expect(actionForCode(DEFAULT_BINDINGS, 'KeyW')).toBe('moveUp')
    expect(actionForCode(DEFAULT_BINDINGS, 'ArrowUp')).toBe('moveUp')
    expect(actionForCode(DEFAULT_BINDINGS, 'Space')).toBe('place')
    expect(actionForCode(DEFAULT_BINDINGS, 'KeyP')).toBeNull()
  })

  it('moves a key away from its old action when it is rebound', () => {
    const next = withBinding(DEFAULT_BINDINGS, 'place', 1, 'KeyR')
    expect(next.place).toEqual(['Enter', 'KeyR'])
    expect(next.rotateCw).toEqual([null, 'KeyE'])
    expect(actionForCode(next, 'KeyR')).toBe('place')
    expect(actionForCode(next, 'Space')).toBeNull()
  })

  it('never binds Escape, which always opens the menu', () => {
    expect(withBinding(DEFAULT_BINDINGS, 'place', 0, 'Escape')).toBe(DEFAULT_BINDINGS)
  })

  it('clears a single slot', () => {
    expect(withoutBinding(DEFAULT_BINDINGS, 'moveUp', 1).moveUp).toEqual(['ArrowUp', null])
  })

  it('restores defaults for missing or malformed stored entries', () => {
    const restored = normalizeBindings({ place: ['KeyP', null], moveUp: 'nope', zoomIn: [1, 2] })
    expect(restored.place).toEqual(['KeyP', null])
    expect(restored.moveUp).toEqual(DEFAULT_BINDINGS.moveUp)
    expect(restored.zoomIn).toEqual(DEFAULT_BINDINGS.zoomIn)
    expect(normalizeBindings(null)).toEqual(DEFAULT_BINDINGS)
    expect(normalizeBindings({ place: ['Escape', null] }).place).toEqual(DEFAULT_BINDINGS.place)
  })
})

describe('key labels and QWERTY/AZERTY layout maps', () => {
  it('resolves AZERTY movement from printed letters, including browsers reporting letter-based codes', () => {
    const layout = KEYBOARD_LAYOUT_MAPS.azerty
    for (const [key, code, action] of [
      ['z', 'KeyZ', 'moveUp'],
      ['q', 'KeyQ', 'moveLeft'],
      ['s', 'KeyS', 'moveDown'],
      ['d', 'KeyD', 'moveRight'],
      ['z', 'KeyW', 'moveUp'],
      ['q', 'KeyA', 'moveLeft'],
    ] as const)
      expect(actionForCode(DEFAULT_BINDINGS, keyCodeForLayout({ key, code }, layout))).toBe(action)
    expect(
      actionForCode(DEFAULT_BINDINGS, keyCodeForLayout({ key: 'a', code: 'KeyA' }, layout)),
    ).toBe('rotateCcw')
    expect(
      actionForCode(DEFAULT_BINDINGS, keyCodeForLayout({ key: 'w', code: 'KeyW' }, layout)),
    ).toBe('pivotLeft')
  })

  it('preserves QWERTY actions, custom bindings, Shift letters and non-letter keys', () => {
    const layout = KEYBOARD_LAYOUT_MAPS.qwerty
    expect(
      actionForCode(DEFAULT_BINDINGS, keyCodeForLayout({ key: 'q', code: 'KeyQ' }, layout)),
    ).toBe('rotateCcw')
    expect(keyCodeForLayout({ key: 'Z', code: 'KeyZ' }, KEYBOARD_LAYOUT_MAPS.azerty)).toBe('KeyW')
    expect(keyCodeForLayout({ key: 'ArrowUp', code: 'ArrowUp' }, layout)).toBe('ArrowUp')
    expect(keyCodeForLayout({ key: ' ', code: 'Space' }, layout)).toBe('Space')
    const custom = withBinding(DEFAULT_BINDINGS, 'place', 1, 'KeyA')
    expect(
      actionForCode(
        custom,
        keyCodeForLayout({ key: 'q', code: 'KeyQ' }, KEYBOARD_LAYOUT_MAPS.azerty),
      ),
    ).toBe('place')
  })

  it('names keys from their codes', () => {
    expect(keyLabel('KeyW')).toBe('W')
    expect(keyLabel('ArrowLeft')).toBe('←')
    expect(keyLabel('Digit3')).toBe('3')
    expect(keyLabel('Space')).toBe('Space')
  })

  it("prefers the player's printed layout for letters", () => {
    expect(keyLabel('KeyW', { KeyW: 'z' })).toBe('Z')
    expect(keyLabel('ArrowUp', { ArrowUp: 'x' })).toBe('↑')
  })

  it('supports QWERTY layout labels accurately', () => {
    const qwerty = KEYBOARD_LAYOUT_MAPS.qwerty
    expect(keyLabel('KeyW', qwerty)).toBe('W')
    expect(keyLabel('KeyA', qwerty)).toBe('A')
    expect(keyLabel('KeyS', qwerty)).toBe('S')
    expect(keyLabel('KeyD', qwerty)).toBe('D')
    expect(keyLabel('KeyQ', qwerty)).toBe('Q')
    expect(keyLabel('KeyZ', qwerty)).toBe('Z')
  })

  it('supports AZERTY layout labels accurately', () => {
    const azerty = KEYBOARD_LAYOUT_MAPS.azerty
    expect(keyLabel('KeyW', azerty)).toBe('Z')
    expect(keyLabel('KeyA', azerty)).toBe('Q')
    expect(keyLabel('KeyS', azerty)).toBe('S')
    expect(keyLabel('KeyD', azerty)).toBe('D')
    expect(keyLabel('KeyQ', azerty)).toBe('A')
    expect(keyLabel('KeyZ', azerty)).toBe('W')
  })
})
