import { useEffect } from 'react'
import { ACTION_LABELS, ACTIONS, RESERVED_CODES } from '../input/bindings'
import type { Action, KeySlot } from '../input/bindings'
import { keyLabel } from '../input/keyLabels'
import { useSettingsStore } from '../store/settingsStore'

/** Codes that only modify other keys; binding them alone would be confusing. */
const MODIFIERS = new Set(['MetaLeft', 'MetaRight', 'ContextMenu', 'OSLeft', 'OSRight'])

const MOUSE: [input: string, action: string][] = [
  ['Click', 'Place tile'],
  ['Drag', 'Pan'],
  ['Scroll / pinch', 'Zoom'],
  ['Shift + scroll', 'Pivot'],
  ['Sideways scroll', 'Pivot (touchpad)'],
  ['Right-drag', 'Tilt and turn'],
]

function SlotButton({ action, slot }: { action: Action; slot: KeySlot }) {
  const code = useSettingsStore((s) => s.bindings[action][slot])
  const layout = useSettingsStore((s) => s.layout)
  const capturing = useSettingsStore((s) => s.capturing)
  const setCapturing = useSettingsStore((s) => s.setCapturing)
  const active = capturing?.action === action && capturing.slot === slot

  return (
    <button
      type="button"
      onClick={() => setCapturing(active ? null : { action, slot })}
      aria-label={`${ACTION_LABELS[action]}, key ${slot + 1}: ${
        code ? keyLabel(code, layout) : 'unbound'
      }. Press to change.`}
      className={`h-8 min-w-[4.5rem] rounded-lg px-2.5 text-xs font-semibold transition ${
        active
          ? 'bg-moss text-paper shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)]'
          : code
            ? 'bg-paper text-ink shadow-[inset_0_0_0_1px_rgb(59_46_34/0.14),0_2px_0_rgb(59_46_34/0.14)] hover:bg-white'
            : 'text-ink/35 shadow-[inset_0_0_0_1px_rgb(59_46_34/0.12)] hover:text-ink/60'
      }`}
    >
      {active ? 'Press a key' : code ? keyLabel(code, layout) : '—'}
    </button>
  )
}

/** Keyboard binding editor plus a reference list of mouse and touchpad controls. */
export function KeySettings() {
  const capturing = useSettingsStore((s) => s.capturing)
  const bind = useSettingsStore((s) => s.bind)
  const unbind = useSettingsStore((s) => s.unbind)
  const setCapturing = useSettingsStore((s) => s.setCapturing)
  const resetBindings = useSettingsStore((s) => s.resetBindings)
  const keyboardLayout = useSettingsStore((s) => s.keyboardLayout)
  const setKeyboardLayout = useSettingsStore((s) => s.setKeyboardLayout)

  // While a slot is waiting, the next key press is the new binding. Capturing on window
  // ahead of everything else keeps Esc from also closing the menu.
  useEffect(() => {
    if (!capturing) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopImmediatePropagation()
      if (e.repeat) return
      if (e.code === 'Escape') setCapturing(null)
      else if (e.code === 'Backspace' || e.code === 'Delete')
        unbind(capturing.action, capturing.slot)
      else if (!MODIFIERS.has(e.code) && !RESERVED_CODES.has(e.code))
        bind(capturing.action, capturing.slot, e.code)
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [capturing, bind, unbind, setCapturing])

  // Leaving the panel mid-capture shouldn't leave game keys switched off.
  useEffect(() => () => setCapturing(null), [setCapturing])

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h3 className="font-display text-lg font-semibold">Keyboard</h3>
          <button
            type="button"
            onClick={resetBindings}
            className="text-xs font-semibold text-ink/55 underline decoration-ink/20 underline-offset-4 hover:text-ink"
          >
            Reset to defaults
          </button>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-ink/65">Keyboard layout</span>
          <div role="group" aria-label="Keyboard layout" className="flex rounded-lg bg-ink/6 p-1">
            {(['qwerty', 'azerty'] as const).map((layout) => (
              <button
                key={layout}
                type="button"
                aria-pressed={keyboardLayout === layout}
                onClick={() => setKeyboardLayout(layout)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  keyboardLayout === layout ? 'bg-moss text-paper' : 'text-ink/60 hover:text-ink'
                }`}
              >
                {layout.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <p className="mb-3 text-xs text-ink/55">
          Pick a slot, then press a key. <kbd>Esc</kbd> cancels, <kbd>Backspace</kbd> clears.
        </p>
        <table className="w-full text-sm">
          <tbody>
            {ACTIONS.map((action) => (
              <tr key={action} className="border-t border-ink/6 first:border-t-0">
                <th
                  scope="row"
                  className="py-1.5 pr-4 text-left font-normal whitespace-nowrap text-ink/80"
                >
                  {ACTION_LABELS[action]}
                </th>
                <td className="py-1.5 pr-1.5">
                  <SlotButton action={action} slot={0} />
                </td>
                <td className="py-1.5">
                  <SlotButton action={action} slot={1} />
                </td>
              </tr>
            ))}
            <tr className="border-t border-ink/6">
              <th
                scope="row"
                className="py-1.5 pr-4 text-left font-normal whitespace-nowrap text-ink/80"
              >
                Menu
              </th>
              <td className="py-1.5 pr-1.5" colSpan={2}>
                <kbd>Esc</kbd> <span className="ml-1 text-xs text-ink/45">always</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg font-semibold">Mouse and touchpad</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-sm">
          {MOUSE.map(([input, action]) => (
            <div key={input} className="contents">
              <dt className="text-ink/55">{input}</dt>
              <dd className="text-ink/80">{action}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
