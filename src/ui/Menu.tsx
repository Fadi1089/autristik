import { useState } from 'react'
import type { ReactNode } from 'react'
import { isGameOver } from '../game/game'
import { tileCount } from '../game/board'
import { SCENE_COLORS, TERRAIN_COLORS } from '../palette'
import { useGameStore } from '../store/gameStore'
import villageArt from '../assets/menu-village.webp'
import { KeySettings } from './KeySettings'

type Panel = 'how' | 'settings'

/** Four little squares that slide in next to the hovered menu item. */
function Bullet() {
  return (
    <span
      aria-hidden
      className="grid size-4 -translate-x-2 grid-cols-2 gap-px overflow-hidden rounded-[3px] opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 group-aria-pressed:translate-x-0 group-aria-pressed:opacity-100"
    >
      <span style={{ background: TERRAIN_COLORS.grass }} />
      <span style={{ background: TERRAIN_COLORS.forest }} />
      <span style={{ background: TERRAIN_COLORS.water }} />
      <span style={{ background: TERRAIN_COLORS.field }} />
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
        className={`group flex items-center gap-3 rounded-lg py-1.5 pr-2 font-display text-[clamp(1.7rem,3.4vw,2.4rem)] leading-none transition hover:translate-x-1 ${
          primary ? 'font-semibold text-ink' : 'font-normal text-ink/70 hover:text-ink'
        } aria-pressed:text-ink`}
      >
        <Bullet />
        {children}
      </button>
    </li>
  )
}

/** Two tiles side by side: the top pair across the seam matches, the bottom pair doesn't. */
function SeamDiagram() {
  const c = TERRAIN_COLORS
  const cells: [x: number, y: number, fill: string][] = [
    [0, 0, c.forest],
    [24, 0, c.water],
    [0, 24, c.grass],
    [24, 24, c.field],
    [52, 0, c.water],
    [76, 0, c.grass],
    [52, 24, c.grass],
    [76, 24, c.grass],
  ]
  return (
    <svg viewBox="-2 -2 104 52" className="w-32 shrink-0" aria-hidden>
      {cells.map(([x, y, fill]) => (
        <rect key={`${x},${y}`} x={x} y={y} width={24} height={24} fill={fill} />
      ))}
      <path d="M50 -2V50" stroke="var(--color-ink)" strokeOpacity={0.35} strokeDasharray="3 3" />
      <circle cx={50} cy={12} r={4.5} fill={SCENE_COLORS.match} stroke="white" strokeWidth={1.5} />
      <circle
        cx={50}
        cy={36}
        r={4.5}
        fill={SCENE_COLORS.mismatch}
        stroke="white"
        strokeWidth={1.5}
      />
    </svg>
  )
}

function HowToPlay() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-5">
        <SeamDiagram />
        <p className="text-sm leading-snug text-ink/75">
          Where two tiles meet, each square faces one square on the other tile. Same terrain on both
          sides is a match.
        </p>
      </div>
      <ol className="space-y-2.5 text-sm text-ink/80">
        <Rule n="1">
          Place each tile next to the board: click a square, tap it twice on a touch screen, or use
          the keyboard alone (move, then Enter or Space). Rotate it to line up the squares.
        </Rule>
        <Rule n="2">
          Every matching square along a seam scores 5 points. Reach each level&rsquo;s goal before
          the clock runs out to move on; the next goal is higher and the clock a little shorter.
        </Rule>
        <Rule n="3">
          Match every side you touch (two or more) and a tile returns to your stack.
        </Rule>
        <Rule n="4">Fill a gap and match all four sides for 30 bonus points and two tiles.</Rule>
      </ol>
      <p className="font-display text-sm text-ink/60 italic">
        Mismatches never cost points. The game ends when time runs out or the stack is empty.
      </p>
    </div>
  )
}

function Rule({ n, children }: { n: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="font-display text-base leading-5 font-semibold text-clay">{n}</span>
      <span>{children}</span>
    </li>
  )
}

export function Menu() {
  // No panel shows the village art; picking a panel again goes back to it.
  const [panel, setPanel] = useState<Panel | null>(null)
  const started = useGameStore((s) => s.started)
  const over = useGameStore(isGameOver)
  const score = useGameStore((s) => s.score)
  const level = useGameStore((s) => s.level)
  const tiles = useGameStore((s) => tileCount(s.board))
  const closeMenu = useGameStore((s) => s.closeMenu)
  const restart = useGameStore((s) => s.restart)

  const canResume = started && !over
  const toggle = (next: Panel) => setPanel((p) => (p === next ? null : next))

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
            Lay down meadow, forest and water one tile at a time. Line up the squares where tiles
            meet and the stack keeps growing.
          </p>

          <ul className="mt-9 space-y-1">
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
            <MenuItem pressed={panel === 'how'} onClick={() => toggle('how')} delay={320}>
              How to play
            </MenuItem>
            <MenuItem pressed={panel === 'settings'} onClick={() => toggle('settings')} delay={370}>
              Settings
            </MenuItem>
          </ul>

          {started && (
            <p
              className="mt-10 animate-rise font-display text-sm text-ink/70"
              style={{ animationDelay: '440ms' }}
            >
              Level {level} · {score} points · {tiles} tiles
            </p>
          )}
        </section>

        {panel ? (
          <aside
            key={panel}
            className="card animate-rise self-center p-6 sm:p-8 lg:max-h-full lg:overflow-y-auto"
          >
            <h2 className="eyebrow mb-5">{panel === 'how' ? 'How to play' : 'Settings'}</h2>
            {panel === 'how' ? <HowToPlay /> : <KeySettings />}
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
