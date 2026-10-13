import { describe, expect, it } from 'vitest'
import { detectLanguage } from './language'
import { FRENCH } from './messages'
import type { Message } from './messages'
import { translate } from './translate'
import { keyLabel, KEYBOARD_LAYOUT_MAPS } from '../input/keyLabels'
import { formatPoints } from '../ui/format'

describe('browser language detection', () => {
  it.each([
    [['fr-FR'], 'fr'],
    [['fr-CA', 'en-US'], 'fr'],
    [['FR_be'], 'fr'],
    [['en-US', 'fr-FR'], 'en'],
    [['de-DE', 'fr-CH'], 'fr'],
    [['es-ES'], 'en'],
    [[], 'en'],
  ] as const)('uses supported preferences %j → %s', (preferences, expected) => {
    expect(detectLanguage(preferences)).toBe(expected)
  })
})

describe('localized messages, controls and numbers', () => {
  it('retains every named parameter in both languages', () => {
    for (const [english, french] of Object.entries(FRENCH)) {
      expect(french.trim()).not.toBe('')
      const parameters = (value: string) =>
        [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
      expect(parameters(french), english).toEqual(parameters(english))
    }
  })

  it('substitutes state values after translating without altering printed controls', () => {
    const message: Message = '{mode} · Level {level} · {score} points · {tiles} tiles'
    expect(
      translate('fr', message, { mode: 'Classique', level: 3, score: '22,5', tiles: 18 }),
    ).toBe('Classique · Niveau 3 · 22,5 points · 18 tuiles')
    expect(translate('en', message, { mode: 'Classic', level: 3, score: '22.5', tiles: 18 })).toBe(
      'Classic · Level 3 · 22.5 points · 18 tiles',
    )
    expect(keyLabel('Space', KEYBOARD_LAYOUT_MAPS.azerty, 'fr')).toBe('Espace')
    expect(keyLabel('PageDown', KEYBOARD_LAYOUT_MAPS.qwerty, 'fr')).toBe('Page bas')
    expect(keyLabel('PageDown', KEYBOARD_LAYOUT_MAPS.azerty, 'en')).toBe('Page Down')
    expect(keyLabel('Quote', KEYBOARD_LAYOUT_MAPS.azerty, 'en')).toBe('Ù')
    expect(keyLabel('KeyW', KEYBOARD_LAYOUT_MAPS.qwerty, 'fr')).toBe('W')
    expect(formatPoints(22.5, 'fr')).toBe('22,5')
    expect(formatPoints(22.5, 'en')).toBe('22.5')
  })
})
