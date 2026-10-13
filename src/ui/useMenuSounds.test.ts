import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FocusEvent } from 'react'
import { useMenuSounds } from './useMenuSounds'

const { settings, play } = vi.hoisted(() => ({
  settings: { menuSoundEnabled: true, menuSoundVolume: 0.25 },
  play: vi.fn().mockResolvedValue(true),
}))
vi.mock('react', () => ({ useRef: () => ({ current: null }) }))
vi.mock('../store/settingsStore', () => ({ useSettingsStore: { getState: () => settings } }))
vi.mock('../audio/placementAudio', () => ({ playMenuSound: play }))

class Target {
  button: Target | null = null
  closest(selector: string) {
    if (this.button instanceof Summary && !selector.includes('summary')) return null
    return this.button
  }
}
class Summary extends Target {
  constructor() {
    super()
    this.button = this
  }
}
class Button extends Target {
  disabled = false
  constructor() {
    super()
    this.button = this
  }
}
function event(target: Target, type: string) {
  return { target, type } as unknown as FocusEvent<HTMLElement>
}
beforeEach(() => {
  vi.clearAllMocks()
  settings.menuSoundEnabled = true
  settings.menuSoundVolume = 0.25
  vi.stubGlobal('Element', Target)
})
afterEach(() => vi.unstubAllGlobals())

describe('menu navigation cues', () => {
  it('skips opening autofocus and cues changed keyboard or pointer selections only once', () => {
    const events = useMenuSounds()
    const first = new Button()
    const second = new Button()
    const child = new Target()
    child.button = second
    events.onFocusCapture(event(first, 'focus'))
    expect(play).not.toHaveBeenCalled()
    events.onPointerOverCapture(event(second, 'pointerover'))
    events.onPointerOverCapture(event(child, 'pointerover'))
    events.onFocusCapture(event(second, 'focus'))
    expect(play).toHaveBeenCalledTimes(1)
    events.onFocusCapture(event(first, 'focus'))
    expect(play).toHaveBeenCalledTimes(2)
    expect(play).toHaveBeenLastCalledWith(0.25)
    const summary = new Summary()
    events.onFocusCapture(event(summary, 'focus'))
    events.onPointerOverCapture(event(summary, 'pointerover'))
    expect(play).toHaveBeenCalledTimes(3)
  })

  it('respects disabled buttons and live mute/volume preferences', () => {
    const events = useMenuSounds()
    const disabled = new Button()
    disabled.disabled = true
    events.onPointerOverCapture(event(disabled, 'pointerover'))
    settings.menuSoundEnabled = false
    events.onPointerOverCapture(event(new Button(), 'pointerover'))
    settings.menuSoundEnabled = true
    settings.menuSoundVolume = 0
    events.onFocusCapture(event(new Button(), 'focus'))
    expect(play).not.toHaveBeenCalled()
    settings.menuSoundVolume = 0.6
    events.onFocusCapture(event(new Button(), 'focus'))
    expect(play).toHaveBeenCalledOnce()
    expect(play).toHaveBeenCalledWith(0.6)
  })
})
