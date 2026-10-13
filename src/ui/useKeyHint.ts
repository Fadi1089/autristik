import type { Action } from '../input/bindings'
import { keyLabel } from '../input/keyLabels'
import { useSettingsStore } from '../store/settingsStore'

/** Plain-text key name for tooltips, e.g. "R". Empty when the action is unbound. */
export function useKeyHint(action: Action): string {
  const code = useSettingsStore((s) => s.bindings[action].find((c) => c !== null) ?? null)
  const layout = useSettingsStore((s) => s.layout)
  const language = useSettingsStore((s) => s.language)
  return code ? keyLabel(code, layout, language) : ''
}
