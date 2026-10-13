import { useTranslation } from '../i18n/useTranslation'
import { translate } from '../i18n/translate'
import type { Message } from '../i18n/messages'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { REGULAR_TERRAINS, TERRAINS } from '../game/tiles'
import { TERRAIN_COLORS, TERRAIN_LABELS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { KeyCaps, MoveKeyCaps } from './KeyCaps'

function keyHints(t: (message: Message) => string): [keys: ReactNode, action: Message][] {
  return [
    [<MoveKeyCaps key="move" slot={0} />, 'Move / advance towards stack'],
    [
      <>
        <kbd>{t('Shift')}</kbd> + <MoveKeyCaps slot={0} />
      </>,
      'Choose arrival side',
    ],
    [<KeyCaps key="drop" action="place" />, 'Place immediately'],
    [<KeyCaps key="swap" action="swap" />, 'Swap current / next'],
    [
      <>
        <KeyCaps action="rotateCw" max={1} />
        <KeyCaps action="rotateCcw" max={1} />
      </>,
      'Rotate',
    ],
    [
      <>
        <KeyCaps action="pivotLeft" />
        <span>/</span>
        <KeyCaps action="pivotRight" />
      </>,
      'Camera: next side (90°)',
    ],
    [<kbd key="esc">{t('Esc')}</kbd>, 'Menu'],
    [
      <>
        <kbd>C</kbd> / <kbd>!</kbd>
      </>,
      'Recenter on falling tile',
    ],
  ]
}

/**
 * Legend and key hints tucked off the bottom-left edge. A half-circle tab
 * peeks out; hovering it (or tapping, on touch screens) slides the drawer in.
 */
export function HelpDrawer() {
  const { t, language } = useTranslation()

  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [keyboardFocus, setKeyboardFocus] = useState(false)
  const open = pinned || hovered || keyboardFocus
  const root = useRef<HTMLDivElement>(null)
  const openMenu = useGameStore((s) => s.openMenu)
  const mode = useGameStore((s) => s.mode)
  const variant = useGameStore((s) => s.variant)

  // A tap opens it on touch screens, so a tap anywhere else should close it again.
  useEffect(() => {
    if (!pinned) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setPinned(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [pinned])

  return (
    <div
      ref={root}
      data-open={open || undefined}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        if (event.target.matches(':focus-visible')) setKeyboardFocus(true)
      }}
      onBlurCapture={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) setKeyboardFocus(false)
      }}
      className="group/help pointer-events-none absolute left-0 bottom-0 flex flex-row-reverse -translate-x-[calc(100%_-_2.5rem)] items-end transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] data-open:translate-x-0 sm:bottom-6"
    >
      <button
        type="button"
        onClick={() => setPinned((p) => !p)}
        onPointerEnter={(event) => {
          if (event.pointerType !== 'touch') setHovered(true)
        }}
        aria-expanded={open}
        aria-label={t('How to play')}
        title={t('How to play')}
        className="pointer-events-auto relative z-10 mb-5 -ml-px grid h-20 w-10 place-items-center rounded-r-full bg-paper pr-1.5 shadow-[6px_4px_18px_-8px_rgb(59_46_34/0.45),inset_-1px_0_0_rgb(59_46_34/0.09),inset_0_1px_0_rgb(59_46_34/0.09),inset_0_-1px_0_rgb(59_46_34/0.09)]"
      >
        <span className="font-display text-2xl leading-none font-semibold text-clay">?</span>
      </button>

      {/* Hidden once it has slid away, so its shadow doesn't show at the screen edge. */}
      <div
        inert={!open}
        aria-hidden={!open}
        className="invisible card pointer-events-none max-h-[calc(100dvh_-_3rem)] w-72 overflow-y-auto rounded-l-none py-5 pr-5 pl-6 transition-[visibility] duration-500 group-data-open/help:visible group-data-open/help:pointer-events-auto"
      >
        <h2 className="eyebrow">{t('Terrain')}</h2>
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-ink/80">
          {(mode === 'classic' ? REGULAR_TERRAINS : TERRAINS).map((t) => (
            <li key={t} className="flex items-center gap-2">
              <span
                className="size-3.5 rounded-[4px]"
                style={{
                  background:
                    t === 'rainbow'
                      ? 'linear-gradient(135deg, #a87516, #ffe9a0 40%, #e5b535 60%, #fff0ba)'
                      : TERRAIN_COLORS[t],
                }}
              />
              {translate(language, TERRAIN_LABELS[t])}
            </li>
          ))}
        </ul>

        <h2 className="eyebrow mt-5">{t('Keys')}</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
          {keyHints(t).map(([keys, action]) => (
            <div key={action} className="contents">
              <dt className="flex items-center gap-1">{keys}</dt>
              <dd className="text-ink/75">{t(action)}</dd>
            </div>
          ))}
        </dl>
        {mode === 'superblock' && (
          <p className="mt-3 text-xs text-ink/65">
            {t(
              'Side neighbours boost placement scores by ×2, ×3 or ×5 without changing the new tile. Gold jokers can also benefit.',
            )}
          </p>
        )}
        {variant === 'time-attack' && (
          <p className="mt-3 text-xs text-ink/65">
            {t(
              'Time-attack: 30 tiles and 45 seconds to start. Each level refills the supply to 30 and adds 45 seconds. Fixed 15-second approach, with increasing score goals.',
            )}
          </p>
        )}
        <p className="mt-3 text-xs text-ink/55">
          {t(
            'Towards the stack advances one square; sideways past an edge changes the fall direction. Click or tap selects a lane. Fully matching touching sides raise the combo by 0.25, up to ×3; any mismatch resets it.',
          )}
          {mode === 'superblock' && (
            <>
              {' '}
              {t(
                "Golden jokers match ordinary terrain and can carry score bonuses. Bedrock blocks all matches, is indestructible and leaves the combo unchanged. Void appears after 10 placements (3%), clears its 3×3 area and disappears. If no tiles remain on the board, a standard tile replaces it. Bronze ×2, silver ×3 and diamond-blue ×5 frames boost that tile's score. Repeat Shift + a direction to visit the next island.",
              )}
            </>
          )}{' '}
          {t(
            'Swap current / next freely, or click the next tile; the fall timer keeps running. Cyan outlines the moving tile; pale gold marks its destination. Shift + scroll turns the camera.',
          )}
        </p>

        <button
          type="button"
          onClick={openMenu}
          className="mt-4 font-display text-sm text-moss-deep italic underline decoration-moss/40 underline-offset-4 transition hover:decoration-moss"
        >
          {t('Rules and key settings')}
        </button>
      </div>
    </div>
  )
}
