import { describe, expect, it } from 'vitest'
import {
  actionForCode,
  DEFAULT_BINDINGS,
  normalizeBindings,
  withBinding,
  withoutBinding,
} from './bindings'
import { keyLabel } from './keyLabels'

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
})
