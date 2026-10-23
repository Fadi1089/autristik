import type { Action } from '../input/bindings'
import { keyLabel } from '../input/keyLabels'
import { useSettingsStore } from '../store/settingsStore'

/** Prefer a specific bound key for the hint, falling back to the first assigned key. */
export function useKeyHint(action: Action, preferredCode?: string): string {
  const code = useSettingsStore((s) => {
    const slots = s.bindings[action]
    return preferredCode && slots.includes(preferredCode)
      ? preferredCode
      : (slots.find((c) => c !== null) ?? null)
  })
  const layout = useSettingsStore((s) => s.layout)
  return code ? keyLabel(code, layout) : ''
}
