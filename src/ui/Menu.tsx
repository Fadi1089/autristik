import { useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { isGameOver } from '../game/game'
import { FALL_INTERVAL } from '../game/falling'
import { MIN_FALL_INTERVAL } from '../game/levels'
import { tileCount } from '../game/board'
import { SCENE_COLORS, TERRAIN_COLORS } from '../palette'
import { actionForCode } from '../input/bindings'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'
import { KeySettings } from './KeySettings'
import { Customization } from './Customization'
import { KeyCaps, MoveKeyCaps } from './KeyCaps'
import { formatPoints } from './format'
import { useMenuSounds } from './useMenuSounds'
import { DifficultySelector } from './DifficultySelector'

type Panel = 'how' | 'customization' | 'settings'

const PANEL_TITLES: Record<Panel, string> = {
  how: 'How to play',
  customization: 'Customization',
  settings: 'Settings',
}

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
      <section aria-label="Controls">
        <h3 className="eyebrow mb-4">Controls</h3>
        <ControlGuide />
      </section>
      <h3 className="eyebrow border-t border-ink/10 pt-5">Rules</h3>
      <div className="flex items-center gap-5">
        <SeamDiagram />
        <p className="text-sm leading-snug text-ink/75">
          Where two tiles meet, each square faces one square on the other tile. Same terrain on both
          sides is a match. Golden joker tiles match every terrain on all four sides, including
          after placement, except indestructible bedrock, which never connects. Void tiles consume
          the eight surrounding cells and themselves, without scoring. They become available after
          20 placements, with a 1% draw chance. If a blast empties the island, a standard tile takes
          the void's place. Bronze, silver and diamond-blue frames multiply that tile's points by
          ×2, ×3 and ×5, on top of its combo; bonus tiles are unchanged.
        </p>
      </div>
      <ol className="space-y-2.5 text-sm text-ink/80">
        <Rule n="1">
          Tiles start ten squares away. At level 1 they advance every {FALL_INTERVAL} seconds; each
          level gently speeds up towards {MIN_FALL_INTERVAL} seconds per square. Difficulty changes
          only the starting speed: Easy starts at 15 seconds per tile, Medium at about 10, Hard at
          7.1 and Insane at the 4.5-second minimum. The stopwatch tracks active play time and pauses
          with the menu; it never ends a game. Arrows or WASD move relative to the camera: towards
          the stack advances one square; perpendicular keys move sideways. Moving past an edge turns
          the fall towards the stack from that side. Hold Shift with any movement key to choose the
          arrival side: Shift + right brings the tile from right to left, and similarly for the
          other sides. The remaining distance and cadence are preserved. On separate islands, the
          first press selects that side of the current island; another press of the same Shift +
          direction crosses to the near edge of the next island in that direction. Repeated presses
          alternate near and far edges. Cyan outlines the moving tile; pale gold outlines its
          landing position, even over other islands. The new lane follows the projected placement
          whenever it has an obstacle. Space or Enter places immediately. The next tile keeps the
          last placement's lane. Rotate to match the terrain; pan, pivot and zoom the camera
          throughout play. If the falling tile leaves the screen, the camera reframes it and the
          island edge. C or ! does the same on demand. Camera pivot keys turn to the next aligned
          side of the board (90°).
        </Rule>
        <Rule n="2">
          Every matching square along a seam scores 5 points. A placement with at least one fully
          matching side and no mismatched contacts raises the combo by 0.25, up to ×3. A mismatch
          resets it to ×1. The multiplier applies only to that tile's points; extra tiles stay the
          same. Reach each level&rsquo;s goal to move on and earn extra tiles; the next goal is
          higher. There is no time limit.
        </Rule>
        <Rule n="3">
          Match every side you touch (two or more) and a tile returns to your stack.
        </Rule>
        <Rule n="4">Fill a gap and match all four sides for 30 bonus points and two tiles.</Rule>
      </ol>
      <p className="font-display text-sm text-ink/60 italic">
        Mismatches never cost points. The game ends when the stack is empty.
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

/** A short control reference at the beginning of How to play. */
function ControlGuide() {
  return (
    <dl className="space-y-3.5 text-sm">
      <ControlHint
        title="Move the tile"
        note="Sideways to choose a lane; towards the island to advance."
      >
        <MoveKeyCaps slot={0} />
        <span className="text-ink/40">or</span>
        <MoveKeyCaps slot={1} />
      </ControlHint>
      <ControlHint
        title="Choose the arrival side"
        note="Shift + right brings the tile from the right; likewise for the other sides."
      >
        <kbd>Shift</kbd>
        <span>+</span>
        <MoveKeyCaps slot={0} />
        <span className="text-ink/40">or</span>
        <MoveKeyCaps slot={1} />
      </ControlHint>
      <ControlHint
        title="Turn the camera"
        note="Each press moves to the next aligned side of the island (90°)."
      >
        <span aria-label="Left">←</span>
        <KeyCaps action="pivotLeft" />
        <span className="ml-2" aria-label="Right">
          →
        </span>
        <KeyCaps action="pivotRight" />
      </ControlHint>
      <ControlHint
        title="Recenter the camera"
        note="Frame the falling tile and its destination together."
      >
        <kbd>C</kbd>
        <span className="text-ink/40">or</span>
        <kbd>!</kbd>
      </ControlHint>
      <ControlHint title="Place instantly" note="Place at the final transparent projection.">
        <KeyCaps action="place" />
      </ControlHint>
    </dl>
  )
}

function ControlHint({
  title,
  note,
  children,
}: {
  title: string
  note: string
  children: ReactNode
}) {
  return (
    <div>
      <dt className="font-semibold text-ink/85">{title}</dt>
      <dd className="mt-1">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">{children}</div>
        <p className="mt-1 text-xs leading-snug text-ink/60">{note}</p>
      </dd>
    </div>
  )
}

export function Menu() {
  const menuSounds = useMenuSounds()
  // No panel shows the village art; picking a panel again returns to it.
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

  const navigate = (e: KeyboardEvent<HTMLDivElement>) => {
    const settings = useSettingsStore.getState()
    if (settings.capturing || e.metaKey || e.ctrlKey || e.altKey) return
    // Native controls keep their arrow keys, e.g. the customization volume slider.
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
    // Enter/Space activate the focused button, even if rebound for movement in game.
    if (e.code === 'Enter' || e.code === 'Space') return
    const action = actionForCode(settings.bindings, e.code)
    const previous =
      e.code === 'ArrowUp' || e.code === 'ArrowLeft' || action === 'moveUp' || action === 'moveLeft'
    const next =
      e.code === 'ArrowDown' ||
      e.code === 'ArrowRight' ||
      action === 'moveDown' ||
      action === 'moveRight'
    if (!previous && !next) return
    const buttons = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled)'),
    )
    if (buttons.length === 0) return
    const current = buttons.indexOf(document.activeElement as HTMLElement)
    const step = previous ? -1 : 1
    const index =
      current < 0
        ? previous
          ? buttons.length - 1
          : 0
        : (current + step + buttons.length) % buttons.length
    buttons[index]?.focus()
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Main menu"
      onKeyDown={navigate}
      {...menuSounds}
      className="absolute inset-0 z-20 animate-fade overflow-y-auto"
    >
      {/* Blurred, warm-tinted view of the board behind the menu. */}
      <div className="fixed inset-0 bg-paper/40 backdrop-blur-[14px] backdrop-saturate-[1.15]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_30%_40%,transparent_20%,var(--menu-shade)_100%)]" />
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
            Guide falling meadow, forest and water tiles. Move sideways, rotate, and line up the
            terrain as each tile joins the stack.
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
            <li className="ml-7 py-2">
              <DifficultySelector />
            </li>
            <MenuItem pressed={panel === 'how'} onClick={() => toggle('how')} delay={320}>
              How to play
            </MenuItem>
            <MenuItem
              pressed={panel === 'customization'}
              onClick={() => toggle('customization')}
              delay={370}
            >
              Customization
            </MenuItem>
            <MenuItem pressed={panel === 'settings'} onClick={() => toggle('settings')} delay={420}>
              Settings
            </MenuItem>
          </ul>

          <p className="mt-4 text-xs text-ink/55">
            Arrows or movement keys to navigate · Enter / Space to select · Esc to return
          </p>

          {started && (
            <p
              className="mt-10 animate-rise font-display text-sm text-ink/70"
              style={{ animationDelay: '490ms' }}
            >
              Level {level} · {formatPoints(score)} points · {tiles} tiles
            </p>
          )}
        </section>

        {panel && (
          <aside
            key={panel}
            className="card animate-rise self-center p-6 sm:p-8 lg:max-h-full lg:overflow-y-auto"
          >
            <h2 className="eyebrow mb-5">{PANEL_TITLES[panel]}</h2>
            {panel === 'how' ? (
              <HowToPlay />
            ) : panel === 'customization' ? (
              <Customization />
            ) : (
              <KeySettings />
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
