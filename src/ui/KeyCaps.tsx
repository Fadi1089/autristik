import { useTranslation } from '../i18n/useTranslation'
import type { Action, KeySlot } from '../input/bindings'
import { keyLabel } from '../input/keyLabels'
import { useSettingsStore } from '../store/settingsStore'

/**
 * The key caps currently bound to an action, as the player's keyboard prints them.
 * Pass `slot` to show only that slot, or `max={1}` for just the first bound key.
 */
export function KeyCaps({
  action,
  max = 2,
  slot,
}: {
  action: Action
  max?: 1 | 2
  slot?: KeySlot
}) {
  const { language } = useTranslation()

  const slots = useSettingsStore((s) => s.bindings[action])
  const layout = useSettingsStore((s) => s.layout)
  const picked: readonly (string | null)[] = slot === undefined ? slots : [slots[slot]]
  const codes = picked.filter((c): c is string => c !== null).slice(0, max)
  if (codes.length === 0) return null
  return (
    <>
      {codes.map((code) => (
        <kbd key={code}>{keyLabel(code, layout, language)}</kbd>
      ))}
    </>
  )
}

const MOVES: readonly Action[] = ['moveUp', 'moveLeft', 'moveDown', 'moveRight']

/** The four movement keys from one slot, e.g. W A S D. */
export function MoveKeyCaps({ slot }: { slot: KeySlot }) {
  return (
    <>
      {MOVES.map((action) => (
        <KeyCaps key={action} action={action} slot={slot} />
      ))}
    </>
  )
}
