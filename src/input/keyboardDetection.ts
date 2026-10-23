import { loadLayoutMap } from './keyLabels'
import type { KeyboardLayout, LayoutMap } from './keyLabels'

/** A language-based fallback until the browser identifies the keyboard or the player chooses. */
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

/**
 * Use the browser map when available. Never infer a new layout from individual keys:
 * some browsers report letter-based codes, making AZERTY Q/Z look like QWERTY rotation keys.
 */
export function observeKeyboardLayout(onDetected: (layout: KeyboardLayout) => void): () => void {
  let stopped = false
  void loadLayoutMap().then((map) => {
    if (stopped || !map) return
    const layout = layoutFromMap(map)
    if (layout) onDetected(layout)
  })
  return () => {
    stopped = true
  }
}
