import { loadLayoutMap } from './keyLabels'
import type { KeyboardLayout, LayoutMap } from './keyLabels'

/** A language-based fallback until the browser or a letter key identifies the keyboard. */
export function fallbackKeyboardLayout(language: string): KeyboardLayout {
  return /^fr(?:-|$)/i.test(language) && !/^fr-CA(?:-|$)/i.test(language) ? 'azerty' : 'qwerty'
}

export function layoutFromMap(layout: LayoutMap): KeyboardLayout | null {
  const q = layout.KeyQ?.toLowerCase()
  const w = layout.KeyW?.toLowerCase()
  if (q === 'a' && w === 'z') return 'azerty'
  if (q === 'q' && w === 'w') return 'qwerty'
  return null
}

/** Only keys whose printed letters distinguish the two supported layouts are useful. */
export function layoutFromKey(
  event: Pick<KeyboardEvent, 'code' | 'key' | 'ctrlKey' | 'altKey' | 'metaKey' | 'isComposing'>,
): KeyboardLayout | null {
  if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return null
  const key = event.key.toLowerCase()
  switch (event.code) {
    case 'KeyQ':
      return key === 'a' ? 'azerty' : key === 'q' ? 'qwerty' : null
    case 'KeyW':
      return key === 'z' ? 'azerty' : key === 'w' ? 'qwerty' : null
    case 'KeyA':
      return key === 'q' ? 'azerty' : key === 'a' ? 'qwerty' : null
    case 'KeyZ':
      return key === 'w' ? 'azerty' : key === 'z' ? 'qwerty' : null
    default:
      return null
  }
}

/** Uses the browser map when available and real keystrokes as a cross-browser fallback. */
export function observeKeyboardLayout(onDetected: (layout: KeyboardLayout) => void): () => void {
  let stopped = false
  let seenLetter = false
  const onKey = (event: KeyboardEvent) => {
    const layout = layoutFromKey(event)
    if (layout) {
      seenLetter = true
      onDetected(layout)
    }
  }
  window.addEventListener('keydown', onKey, { capture: true })
  void loadLayoutMap().then((map) => {
    if (stopped || seenLetter || !map) return
    const layout = layoutFromMap(map)
    if (layout) onDetected(layout)
  })
  return () => {
    stopped = true
    window.removeEventListener('keydown', onKey, { capture: true })
  }
}
