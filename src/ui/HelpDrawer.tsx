import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { TERRAINS } from '../game/tiles'
import { TERRAIN_COLORS, TERRAIN_LABELS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { KeyCaps, MoveKeyCaps } from './KeyCaps'

const KEYS: [keys: ReactNode, action: string][] = [
  [<MoveKeyCaps key="move" slot={0} />, 'Move / advance towards stack'],
  [
    <>
      <kbd>Shift</kbd> + <MoveKeyCaps slot={0} />
    </>,
    'Choose arrival side',
  ],
  [<KeyCaps key="drop" action="place" />, 'Place immediately'],
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
  [<kbd key="esc">Esc</kbd>, 'Menu'],
  [
    <>
      <kbd>C</kbd> / <kbd>!</kbd>
    </>,
    'Recenter on falling tile',
  ],
]

/**
 * Legend and key hints tucked off the right edge of the screen. A half-circle tab
 * peeks out; hovering it (or tapping, on touch screens) slides the drawer in.
 */
export function HelpDrawer() {
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [keyboardFocus, setKeyboardFocus] = useState(false)
  const open = pinned || hovered || keyboardFocus
  const root = useRef<HTMLDivElement>(null)
  const openMenu = useGameStore((s) => s.openMenu)

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
      className="group/help pointer-events-none absolute right-0 bottom-36 flex translate-x-[calc(100%_-_2.5rem)] items-end transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] data-open:translate-x-0 sm:bottom-6"
    >
      <button
        type="button"
        onClick={() => setPinned((p) => !p)}
        onPointerEnter={(event) => {
          if (event.pointerType !== 'touch') setHovered(true)
        }}
        aria-expanded={open}
        aria-label="How to play"
        title="How to play"
        className="pointer-events-auto relative z-10 mb-5 -mr-px grid h-20 w-10 place-items-center rounded-l-full bg-paper pl-1.5 shadow-[-6px_4px_18px_-8px_rgb(59_46_34/0.45),inset_1px_0_0_rgb(59_46_34/0.09),inset_0_1px_0_rgb(59_46_34/0.09),inset_0_-1px_0_rgb(59_46_34/0.09)]"
      >
        <span className="font-display text-2xl leading-none font-semibold text-clay">?</span>
      </button>

      {/* Hidden once it has slid away, so its shadow doesn't show at the screen edge. */}
      <div
        inert={!open}
        aria-hidden={!open}
        className="invisible card pointer-events-none w-72 rounded-r-none py-5 pr-6 pl-5 transition-[visibility] duration-500 group-data-open/help:visible group-data-open/help:pointer-events-auto"
      >
        <h2 className="eyebrow">Terrain</h2>
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-ink/80">
          {TERRAINS.map((t) => (
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
              {TERRAIN_LABELS[t]}
            </li>
          ))}
        </ul>

        <h2 className="eyebrow mt-5">Keys</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
          {KEYS.map(([keys, action]) => (
            <div key={action} className="contents">
              <dt className="flex items-center gap-1">{keys}</dt>
              <dd className="text-ink/75">{action}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-ink/55">
          Towards the stack advances one square; sideways past an edge changes the fall direction.
          Click or tap selects a lane. Fully matching touching sides raise the combo by 0.25, up to
          ×3; any mismatch resets it. Golden jokers match ordinary terrain, even after being placed.
          Bedrock blocks all matches and is indestructible. Void appears after 20 placements (1%),
          clears its 3×3 area and disappears. If no tiles remain on the board, a standard tile
          replaces it. Bronze ×2, silver ×3 and diamond-blue ×5 frames boost that tile's score.
          Repeat Shift + a direction to visit the next island. Cyan outlines the moving tile; pale
          gold marks its destination.
          <kbd>Shift</kbd> + scroll pivots.
        </p>

        <button
          type="button"
          onClick={openMenu}
          className="mt-4 font-display text-sm text-moss-deep italic underline decoration-moss/40 underline-offset-4 transition hover:decoration-moss"
        >
          Rules and key settings
        </button>
      </div>
    </div>
  )
}
