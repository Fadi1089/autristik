import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { TERRAIN_COLORS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'
import villageArt from '../assets/menu-village.webp'
import { KeySettings } from './KeySettings'

type Panel = 'settings'

/** Four little squares that slide in next to the selected (focused or hovered) menu item. */
function Bullet() {
  return (
    <span
      aria-hidden
      className="grid size-4 -translate-x-2 grid-cols-2 gap-px overflow-hidden rounded-[3px] opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus:translate-x-0 group-focus:opacity-100 group-aria-pressed:translate-x-0 group-aria-pressed:opacity-100"
    >
      <span style={{ background: TERRAIN_COLORS.red }} />
      <span style={{ background: TERRAIN_COLORS.green }} />
      <span style={{ background: TERRAIN_COLORS.blue }} />
      <span style={{ background: TERRAIN_COLORS.yellow }} />
    </span>
  )
}

function MenuItem({
  children,
  onClick,
  pressed,
  primary,
  delay,
  autoFocus,
}: {
  children: ReactNode
  onClick: () => void
  pressed?: boolean
  primary?: boolean
  delay: number
  autoFocus?: boolean
}) {
  return (
    <li className="animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={pressed}
        autoFocus={autoFocus}
        // Hovering selects too, so the mouse and the arrow keys share one selection.
        onPointerEnter={(e) => e.currentTarget.focus({ preventScroll: true })}
        className={`group flex items-center gap-3 rounded-lg py-1.5 pr-2 font-display text-[clamp(1.7rem,3.4vw,2.4rem)] leading-none transition hover:translate-x-1 focus:translate-x-1 ${
          primary
            ? 'font-semibold text-ink'
            : 'font-normal text-ink/70 hover:text-ink focus:text-ink'
        } aria-pressed:text-ink`}
      >
        <Bullet />
        {children}
      </button>
    </li>
  )
}

export function Menu() {
  // No panel shows the village art; picking a panel again goes back to it.
  const [panel, setPanel] = useState<Panel | null>(null)
  const started = useGameStore((s) => s.started)
  const closeMenu = useGameStore((s) => s.closeMenu)
  const restart = useGameStore((s) => s.restart)

  const canResume = started
  const toggle = (next: Panel) => setPanel((p) => (p === next ? null : next))
  const items = useRef<HTMLUListElement>(null)

  // Up / Down move between the menu items; Enter (a native button press) picks one.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      if (useSettingsStore.getState().capturing || !items.current) return
      const active = document.activeElement
      // Leave arrows to the side panel while something in it has focus.
      if (active && active !== document.body && !items.current.contains(active)) return
      e.preventDefault()
      const buttons = [...items.current.querySelectorAll<HTMLButtonElement>('button')]
      const at = buttons.indexOf(active as HTMLButtonElement)
      const step = e.key === 'ArrowDown' ? 1 : -1
      const next = at < 0 ? 0 : (at + step + buttons.length) % buttons.length
      buttons[next]?.focus({ preventScroll: true })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Main menu"
      className="absolute inset-0 z-20 animate-fade overflow-y-auto"
    >
      {/* Blurred, warm-tinted view of the board behind the menu. */}
      <div className="fixed inset-0 bg-paper/40 backdrop-blur-[14px] backdrop-saturate-[1.15]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_30%_40%,transparent_20%,rgb(59_46_34/0.18)_100%)]" />
      <div className="pointer-events-none fixed inset-0 grain opacity-40" />

      {/*
        On wide screens the grid is exactly one screen tall and both columns have fixed
        widths, so swapping the right-hand panel never nudges the menu on the left.
      */}
      <div className="relative mx-auto grid min-h-full max-w-6xl content-center gap-10 px-6 py-12 sm:px-10 lg:h-full lg:grid-cols-[minmax(0,1fr)_25rem] lg:grid-rows-[minmax(0,1fr)] lg:gap-14">
        <section className="lg:self-center">
          <h1
            className="animate-rise font-display text-[clamp(4rem,10vw,9rem)] leading-[0.82] font-semibold tracking-[-0.03em] text-ink"
            style={{ animationDelay: '60ms' }}
          >
            Autristik
          </h1>
          <svg
            viewBox="0 0 320 18"
            aria-hidden
            className="mt-3 h-4 w-[min(22rem,70%)] animate-rise text-clay"
            style={{ animationDelay: '120ms' }}
          >
            <path
              d="M2 11c34-7 62 5 96-1s58-8 92-2 64 5 128-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
          <p
            className="mt-5 max-w-md animate-rise font-display text-lg leading-snug text-ink/70 italic"
            style={{ animationDelay: '160ms' }}
          >
            Place each tetromino on the grid to grow the world across distinct biomes.
          </p>

          <ul ref={items} className="mt-9 space-y-1">
            {canResume ? (
              <MenuItem primary autoFocus onClick={closeMenu} delay={220}>
                Resume
              </MenuItem>
            ) : (
              <MenuItem
                primary
                autoFocus
                onClick={started ? () => restart() : closeMenu}
                delay={220}
              >
                {started ? 'New game' : 'Play'}
              </MenuItem>
            )}
            {canResume && (
              <MenuItem onClick={() => restart()} delay={270}>
                New game
              </MenuItem>
            )}
            <MenuItem pressed={panel === 'settings'} onClick={() => toggle('settings')} delay={320}>
              Settings
            </MenuItem>
          </ul>
        </section>

        {panel ? (
          <aside
            key={panel}
            className="card animate-rise self-center p-6 sm:p-8 lg:max-h-full lg:overflow-y-auto"
          >
            <h2 className="eyebrow mb-5">Settings</h2>
            <KeySettings />
          </aside>
        ) : (
          <div
            className="pointer-events-none animate-rise self-center justify-self-center lg:h-full lg:max-h-[38rem] lg:w-[30rem] lg:max-w-none"
            style={{ animationDelay: '200ms' }}
          >
            <img
              src={villageArt}
              alt="A small village of tiles: fields, a pond with a waterfall, pine trees and a lookout tower."
              width={1102}
              height={1393}
              className="mx-auto h-full max-h-[60vh] w-auto object-contain drop-shadow-[0_24px_32px_rgb(59_46_34/0.22)] lg:max-h-full"
            />
          </div>
        )}
      </div>
    </div>
  )
}
