import { useTranslation } from '../i18n/useTranslation'
import { useEffect } from 'react'
import { ACTION_LABELS, ACTIONS, RESERVED_CODES } from '../input/bindings'
import type { Action, KeySlot } from '../input/bindings'
import { keyLabel } from '../input/keyLabels'
import { useSettingsStore } from '../store/settingsStore'
import { AudioSettings } from './AudioSettings'
import { LanguageSettings } from './LanguageSettings'
import type { Message } from '../i18n/messages'

/** Codes that only modify other keys; binding them alone would be confusing. */
const MODIFIERS = new Set(['MetaLeft', 'MetaRight', 'ContextMenu', 'OSLeft', 'OSRight'])

const MOUSE: [input: Message, action: Message][] = [
  ['Click / tap', 'Choose landing lane'],
  ['Drag', 'Pan'],
  ['Scroll / pinch', 'Zoom'],
  ['Shift + scroll', 'Pivot'],
  ['Sideways scroll', 'Pivot (touchpad)'],
  ['Right-drag', 'Tilt and turn'],
]

function SlotButton({ action, slot }: { action: Action; slot: KeySlot }) {
  const { t, language } = useTranslation()

  const code = useSettingsStore((s) => s.bindings[action][slot])
  const layout = useSettingsStore((s) => s.layout)
  const dark = useSettingsStore((s) => s.theme === 'dark')
  const capturing = useSettingsStore((s) => s.capturing)
  const setCapturing = useSettingsStore((s) => s.setCapturing)
  const active = capturing?.action === action && capturing.slot === slot

  return (
    <button
      type="button"
      onClick={() => setCapturing(active ? null : { action, slot })}
      aria-label={t('{action}, key {slot}: {key}. Press to change.', {
        action: t(ACTION_LABELS[action]),
        slot: slot + 1,
        key: code ? keyLabel(code, layout, language) : t('unbound'),
      })}
      className={`min-h-8 w-full min-w-0 rounded-lg px-2 py-1 text-xs font-semibold break-words transition ${
        active
          ? 'bg-moss text-paper shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)]'
          : code
            ? `bg-paper text-ink shadow-[inset_0_0_0_1px_rgb(59_46_34/0.14),0_2px_0_rgb(59_46_34/0.14)] ${dark ? 'hover:bg-ink/10' : 'hover:bg-white'}`
            : 'text-ink/35 shadow-[inset_0_0_0_1px_rgb(59_46_34/0.12)] hover:text-ink/60'
      }`}
    >
      {active ? t('Press a key') : code ? keyLabel(code, layout, language) : '—'}
    </button>
  )
}

/** Keyboard binding editor plus a reference list of mouse and touchpad controls. */
export function KeySettings() {
  const { t } = useTranslation()

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
    <div className="min-w-0 space-y-6">
      <LanguageSettings />
      <AudioSettings />
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h3 className="font-display text-lg font-semibold">{t('Keyboard')}</h3>
          <button
            type="button"
            onClick={resetBindings}
            className="text-xs font-semibold text-ink/55 underline decoration-ink/20 underline-offset-4 hover:text-ink"
          >
            {t('Reset to defaults')}
          </button>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-ink/65">{t('Keyboard layout')}</span>
          <div
            role="group"
            aria-label={t('Keyboard layout')}
            className="flex rounded-lg bg-ink/6 p-1"
          >
            {(['azerty', 'qwerty'] as const).map((layout) => (
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
          {t(
            'Pick a slot, then press a key. Escape cancels; Backspace or Delete clears. C or ! recenters the falling tile and its destination. Camera turn keys move to the next aligned side, one press per side.',
          )}
        </p>
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[50%]" />
            <col className="w-[25%]" />
            <col className="w-[25%]" />
          </colgroup>
          <tbody>
            {ACTIONS.map((action) => (
              <tr key={action} className="border-t border-ink/6 first:border-t-0">
                <th
                  scope="row"
                  className="py-1.5 pr-2 text-left font-normal break-words text-ink/80"
                >
                  {t(ACTION_LABELS[action])}
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
              <th scope="row" className="py-1.5 pr-2 text-left font-normal text-ink/80">
                {t('Menu')}
              </th>
              <td className="py-1.5 pr-1.5" colSpan={2}>
                <kbd>{t('Esc')}</kbd>{' '}
                <span className="ml-1 text-xs text-ink/45">{t('always')}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg font-semibold">{t('Mouse and touchpad')}</h3>
        <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-5 gap-y-1.5 text-sm">
          {MOUSE.map(([input, action]) => (
            <div key={input} className="contents">
              <dt className="text-ink/55">{t(input)}</dt>
              <dd className="text-ink/80">{t(action)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
