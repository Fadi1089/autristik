import { describe, expect, it } from 'vitest'
import {
  actionForCode,
  DEFAULT_BINDINGS,
  normalizeBindings,
  upgradeCameraBindings,
  upgradeLegacyBindings,
  withBinding,
  withoutBinding,
} from './bindings'
import { KEYBOARD_LAYOUT_MAPS, keyLabel } from './keyLabels'

describe('key bindings', () => {
  it('finds the action for a key, including secondary slots', () => {
    expect(actionForCode(DEFAULT_BINDINGS, 'KeyW')).toBe('moveUp')
    expect(actionForCode(DEFAULT_BINDINGS, 'ArrowUp')).toBe('moveUp')
    expect(actionForCode(DEFAULT_BINDINGS, 'Space')).toBe('place')
    expect(actionForCode(DEFAULT_BINDINGS, 'KeyE')).toBe('rotateCw')
    expect(actionForCode(DEFAULT_BINDINGS, 'PageDown')).toBe('rotateCw')
    expect(actionForCode(DEFAULT_BINDINGS, 'PageUp')).toBe('rotateCcw')
    expect(actionForCode(DEFAULT_BINDINGS, 'KeyR')).toBeNull()
    expect(actionForCode(DEFAULT_BINDINGS, 'KeyP')).toBeNull()
    expect(actionForCode(DEFAULT_BINDINGS, 'Comma')).toBe('pivotLeft')
    expect(actionForCode(DEFAULT_BINDINGS, 'Period')).toBe('pivotRight')
  })

  it('moves a key away from its old action when it is rebound', () => {
    const next = withBinding(DEFAULT_BINDINGS, 'place', 1, 'KeyE')
    expect(next.place).toEqual(['Enter', 'KeyE'])
    expect(next.rotateCw).toEqual([null, 'PageDown'])
    expect(actionForCode(next, 'KeyE')).toBe('place')
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

  it('upgrades saved rotation defaults without overriding custom bindings', () => {
    const legacy = { ...DEFAULT_BINDINGS, rotateCw: ['KeyR', 'KeyE'], rotateCcw: ['KeyQ', null] }
    expect(upgradeLegacyBindings(legacy)).toEqual(DEFAULT_BINDINGS)
    const customized = withBinding(DEFAULT_BINDINGS, 'rotateCw', 0, 'KeyT')
    expect(upgradeLegacyBindings(customized)).toEqual(customized)
    const pageCustomized = { ...legacy, place: ['PageDown', 'PageUp'] }
    const upgraded = upgradeLegacyBindings(pageCustomized)
    expect(upgraded.place).toEqual(['PageDown', 'PageUp'])
    expect(upgraded.rotateCw).toEqual(['KeyE', null])
    expect(upgraded.rotateCcw).toEqual(['KeyQ', null])
  })

  it('adds secondary camera defaults without replacing custom controls or stealing keys', () => {
    const previous = { ...DEFAULT_BINDINGS, pivotLeft: ['KeyZ', null], pivotRight: ['KeyX', null] }
    expect(upgradeCameraBindings(previous)).toEqual(DEFAULT_BINDINGS)
    const customized = { ...previous, pivotLeft: ['KeyP', null], pivotRight: ['KeyX', 'KeyT'] }
    expect(upgradeCameraBindings(customized)).toEqual(customized)
    const occupied = { ...previous, rotateCw: ['Comma', 'Period'] }
    expect(upgradeCameraBindings(occupied)).toEqual(occupied)
  })
})

describe('key labels', () => {
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

  it('shows the selected AZERTY or QWERTY labels, including page keys', () => {
    const movement = ['KeyW', 'KeyA', 'KeyS', 'KeyD']
    expect(movement.map((code) => keyLabel(code, KEYBOARD_LAYOUT_MAPS.azerty))).toEqual([
      'Z',
      'Q',
      'S',
      'D',
    ])
    expect(movement.map((code) => keyLabel(code, KEYBOARD_LAYOUT_MAPS.qwerty))).toEqual([
      'W',
      'A',
      'S',
      'D',
    ])
    expect(keyLabel('KeyQ', KEYBOARD_LAYOUT_MAPS.azerty)).toBe('A')
    expect(keyLabel('PageDown', KEYBOARD_LAYOUT_MAPS.azerty)).toBe('Page Down')
    expect(keyLabel('PageUp', KEYBOARD_LAYOUT_MAPS.qwerty)).toBe('Page Up')
    expect(keyLabel('Comma', KEYBOARD_LAYOUT_MAPS.azerty)).toBe(';')
    expect(keyLabel('Period', KEYBOARD_LAYOUT_MAPS.azerty)).toBe(':')
    expect(keyLabel('Slash', KEYBOARD_LAYOUT_MAPS.azerty)).toBe('!')
    expect(keyLabel('Comma', KEYBOARD_LAYOUT_MAPS.qwerty)).toBe(',')
    expect(keyLabel('Period', KEYBOARD_LAYOUT_MAPS.qwerty)).toBe('.')
  })
})
