import { useRef } from 'react'
import type { FocusEvent, PointerEvent } from 'react'
import { playMenuSound } from '../audio/placementAudio'
import { useSettingsStore } from '../store/settingsStore'

/** One cue per changed menu option, shared by mouse hover, Tab and arrow-key focus. */
export function useMenuSounds() {
  const selected = useRef<HTMLElement | null>(null)
  const cue = (event: FocusEvent<HTMLElement> | PointerEvent<HTMLElement>) => {
    if (!(event.target instanceof Element)) return
    const button = event.target.closest<HTMLElement>('button, summary')
    if (!button || ('disabled' in button && button.disabled) || selected.current === button) return
    const initialFocus = selected.current === null && event.type === 'focus'
    selected.current = button
    if (initialFocus) return
    const { menuSoundEnabled, menuSoundVolume } = useSettingsStore.getState()
    if (menuSoundEnabled && menuSoundVolume > 0) void playMenuSound(menuSoundVolume)
  }
  return { onFocusCapture: cue, onPointerOverCapture: cue }
}
