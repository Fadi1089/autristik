import { useTranslation } from '../i18n/useTranslation'
import { useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { isGameOver } from '../game/game'
import { tileCount } from '../game/board'
import { SCENE_COLORS, TERRAIN_COLORS } from '../palette'
import { navigateMenu } from './menuNavigation'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'
import { KeySettings } from './KeySettings'
import { Customization } from './Customization'
import { KeyCaps, MoveKeyCaps } from './KeyCaps'
import { formatPoints } from './format'
import { useMenuSounds } from './useMenuSounds'
import { DifficultySelector } from './DifficultySelector'
import { Gamemode } from './Gamemode'
import { GAME_MODE_LABELS } from '../game/modes'
import { GAME_VARIANT_LABELS } from '../game/variants'

type Panel = 'how' | 'mode' | 'customization' | 'settings'
type MenuChoice = 'start' | 'new' | Panel

const PANEL_TITLES = {
  how: 'How to play',
  mode: 'Gamemode',
  customization: 'Customization',
  settings: 'Settings',
} as const satisfies Record<Panel, string>

/** Four little squares that slide in next to the hovered menu item. */
function Bullet() {
  return (
    <span
      aria-hidden
      className="grid size-4 -translate-x-2 grid-cols-2 gap-px overflow-hidden rounded-[3px] opacity-0 transition duration-300 group-data-selected:translate-x-0 group-data-selected:opacity-100"
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
  id,
  selected,
  onSelect,
  side,
  delay,
  autoFocus,
}: {
  children: ReactNode
  onClick: () => void
  pressed?: boolean
  id: MenuChoice
  selected: boolean
  onSelect: () => void
  side?: ReactNode
  delay: number
  autoFocus?: boolean
}) {
  return (
    <li
      className="animate-rise flex flex-wrap items-center gap-x-4 gap-y-2"
      style={{ animationDelay: `${delay}ms` }}
      onPointerEnter={onSelect}
      onFocusCapture={onSelect}
    >
      <button
        type="button"
        onClick={onClick}
        aria-pressed={pressed}
        data-menu-item={id}
        data-selected={selected || undefined}
        onPointerEnter={(event) => event.currentTarget.focus({ preventScroll: true })}
        autoFocus={autoFocus}
        className="group flex items-center gap-3 rounded-lg py-1.5 pr-2 font-display text-[clamp(1.7rem,3.4vw,2.4rem)] leading-none font-normal text-ink/70 transition data-selected:translate-x-1 data-selected:font-semibold data-selected:text-ink focus-visible:outline-none"
      >
        <Bullet />
        {children}
      </button>
      {side && (
        <div data-menu-secondary={id} className="ml-7 min-w-0 sm:ml-0">
          {side}
        </div>
      )}
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

export function HowToPlay() {
  const { t } = useTranslation()
  const variant = useGameStore((s) => (s.started ? s.variant : s.nextVariant))
  const mode = useGameStore((s) => (s.started ? s.mode : s.nextMode))

  return (
    <div className="space-y-5">
      <GuideSection title={t('Rules')}>
        <p className="rounded-xl bg-moss/8 p-3 text-sm text-ink/75">
          {t(
            'Time-attack: 30 tiles and 45 seconds to start. Each level refills the supply to 30 and adds 45 seconds. Fixed 15-second approach, with increasing score goals.',
          )}{' '}
          {t(
            'Time-attack works with either tile set. Menu and hidden-tab pauses stop the countdown.',
          )}
        </p>
        <div className="flex items-center gap-5">
          <SeamDiagram />
          <p className="text-sm leading-snug text-ink/75">
            {t(
              'Where two tiles meet, each square faces one square on the other tile. Matching terrains score points. Classic uses only ordinary terrain; Superblock adds special tiles.',
            )}
          </p>
        </div>
        <ol className="space-y-2.5 text-sm text-ink/80">
          <Rule n="1">
            {variant === 'time-attack'
              ? t(
                  'Time-attack uses the same tile and camera controls. Reach a score goal before time runs out to gain 45 seconds. Tile travel time stays at 15 seconds at every level, independently of difficulty.',
                )
              : t(
                  'Tiles start ten squares away and accelerate gradually with each level. Starting travel time: Easy 15 s, Medium 10 s, Hard 7.1 s, Insane 4.5 s. They never take less than 4.5 s. The stopwatch counts active play and pauses with the menu, with no time limit. Movement keys follow the camera: towards the island advances one square; sideways selects a lane. Moving past an edge changes the arrival side. Shift + a movement key brings the tile from that side, keeping the remaining distance and cadence. Repeating the same Shift + direction visits the near edge of the next separate island; further presses alternate near and far edges. Cyan marks the moving tile, pale gold its destination. Place instantly with the bound placement keys. The next tile keeps the last lane. Rotate tiles to match terrain; pan, turn and zoom the camera freely. The camera reframes off-screen tiles automatically, or with C / !. Camera turn keys move between the four aligned sides (90°).',
                )}
          </Rule>
          <Rule n="2">
            {variant === 'time-attack'
              ? t(
                  'Every matching square scores 5 points. Fully matching sides with no mismatches raise the combo by 0.25, up to ×3; a mismatch resets it, except bedrock contacts. Combos and tile bonuses multiply only that tile’s score. Each level has a higher score goal and awards 45 seconds.',
                )
              : t(
                  "Every matching square along a seam scores 5 points. A placement with at least one fully matching side and no mismatched contacts raises the combo by 0.25, up to ×3. A mismatch resets it to ×1, except neutral bedrock contacts. The multiplier applies only to that tile's points; extra tiles stay the same. Reach each level's goal to move on and earn extra tiles; the next goal is higher. There is no time limit.",
                )}
          </Rule>
          {variant === 'standard' && (
            <Rule n="3">
              {t('Match every side you touch (two or more) and a tile returns to your stack.')}
            </Rule>
          )}
          <Rule n={variant === 'standard' ? '4' : '3'}>
            {variant === 'time-attack'
              ? t('Fill a gap and match all four sides for 30 bonus points.')
              : t('Fill a gap and match all four sides for 30 bonus points and two tiles.')}
          </Rule>
        </ol>
        <p className="text-sm text-ink/75">
          {t(
            'Slide sideways into a gap at the current tile position only when three of its four faces are occupied. It locks on the next fall step; otherwise lateral movement keeps the usual remaining distance.',
          )}
        </p>
        <p className="font-display text-sm text-ink/60 italic">
          {variant === 'time-attack'
            ? t('Mismatches never cost points. Time-attack ends when time or tiles run out.')
            : t('Mismatches never cost points. The game ends when the stack is empty.')}
        </p>
      </GuideSection>
      <GuideSection title={t('Controls')}>
        <ControlGuide />
      </GuideSection>
      {mode === 'superblock' && (
        <GuideSection title={t('Tile types (Superblock)')}>
          <SpecialTileGuide />
          <p className="text-sm text-ink/75">
            {t(
              'In Superblock, placement scores use the strongest bonus among the tile and its side neighbours. Tiles keep their own multiplier: bonuses do not spread. Standard tiles start at ×1; gold jokers can have ×1, ×2, ×3 or ×5.',
            )}
          </p>
        </GuideSection>
      )}
    </div>
  )
}

function GuideSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group/guide rounded-xl border border-ink/10 bg-ink/3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 font-semibold text-ink/85 transition hover:bg-ink/5 [&::-webkit-details-marker]:hidden">
        {title}
        <svg
          viewBox="0 0 24 24"
          className="size-4 shrink-0 text-ink/55 transition-transform group-open/guide:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="space-y-5 border-t border-ink/10 px-4 py-4">{children}</div>
    </details>
  )
}

function SpecialTileGuide() {
  const { t } = useTranslation()
  const types = [
    [
      'Golden joker',
      'Matches every ordinary terrain. Can have its own ×1, ×2, ×3 or ×5 bonus.',
      'linear-gradient(135deg, #a87516, #ffe9a0, #e5b535)',
    ],
    [
      'Bedrock · no matches',
      'Indestructible, even by void. Blocks connections without changing the combo.',
      'repeating-linear-gradient(45deg, #343746 0 4px, #8c8d93 4px 7px)',
    ],
    [
      'Void · clears 3×3',
      'Available after 10 placements, with a 3% draw chance. Removes its surrounding tiles and itself, except bedrock. If the board is emptied, a standard tile replaces it.',
      'radial-gradient(circle at 35% 35%, #9a52cc, #241039 70%)',
    ],
    [
      'Bronze ×2 · Silver ×3 · Diamond ×5',
      'Multiplies its placement score and the scores of new side neighbours. Received bonuses never spread to other tiles; the strongest bonus applies.',
      'linear-gradient(135deg, #a47545, #d4d9dd, #73ceef)',
    ],
  ] as const
  return (
    <dl className="space-y-4 text-sm">
      {types.map(([title, note, background]) => (
        <div key={title}>
          <dt className="flex items-center gap-2 font-semibold">
            <span
              className="size-5 shrink-0 rounded-md shadow-sm"
              style={{ background }}
              aria-hidden
            />
            {t(title)}
          </dt>
          <dd className="mt-1 text-ink/65">{t(note)}</dd>
        </div>
      ))}
    </dl>
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

/** A short control reference inside How to play. */
function ControlGuide() {
  const { t } = useTranslation()

  return (
    <dl className="space-y-3.5 text-sm">
      <ControlHint
        title={t('Move the tile')}
        note={t('Sideways to choose a lane; towards the island to advance.')}
      >
        <MoveKeyCaps slot={0} />
        <span className="text-ink/40">{t('or')}</span>
        <MoveKeyCaps slot={1} />
      </ControlHint>
      <ControlHint
        title={t('Choose the arrival side')}
        note={t('Shift + right brings the tile from the right; likewise for the other sides.')}
      >
        <kbd>{t('Shift')}</kbd>
        <span>+</span>
        <MoveKeyCaps slot={0} />
        <span className="text-ink/40">{t('or')}</span>
        <MoveKeyCaps slot={1} />
      </ControlHint>
      <ControlHint
        title={t('Turn the camera')}
        note={t('Each press moves to the next aligned side of the island (90°).')}
      >
        <span aria-label={t('Left')}>←</span>
        <KeyCaps action="pivotLeft" />
        <span className="ml-2" aria-label={t('Right')}>
          →
        </span>
        <KeyCaps action="pivotRight" />
      </ControlHint>
      <ControlHint
        title={t('Recenter the camera')}
        note={t('Frame the falling tile and its destination together.')}
      >
        <kbd>C</kbd>
        <span className="text-ink/40">{t('or')}</span>
        <kbd>!</kbd>
      </ControlHint>
      <ControlHint
        title={t('Place instantly')}
        note={t('Place at the final transparent projection.')}
      >
        <KeyCaps action="place" />
      </ControlHint>
      <ControlHint
        title={t('Swap current / next')}
        note={t(
          'Swap freely, or click the next tile. Rotations, bonuses and remaining fall time are preserved.',
        )}
      >
        <KeyCaps action="swap" />
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
  const { t, language } = useTranslation()

  const menuSounds = useMenuSounds()
  // Picking an active panel again closes it.
  const [panel, setPanel] = useState<Panel | null>(null)
  const [selected, setSelected] = useState<MenuChoice | null>('start')
  const started = useGameStore((s) => s.started)
  const over = useGameStore(isGameOver)
  const score = useGameStore((s) => s.score)
  const level = useGameStore((s) => s.level)
  const tiles = useGameStore((s) => tileCount(s.board))
  const mode = useGameStore((s) => s.mode)
  const variant = useGameStore((s) => s.variant)
  const closeMenu = useGameStore((s) => s.closeMenu)
  const restart = useGameStore((s) => s.restart)

  const canResume = started && !over
  const toggle = (next: Panel) => setPanel((p) => (p === next ? null : next))
  const selection = (id: MenuChoice) => ({
    id,
    selected: selected === id,
    onSelect: () => setSelected(id),
  })

  const navigate = (e: KeyboardEvent<HTMLDivElement>) => {
    const settings = useSettingsStore.getState()
    if (settings.capturing || e.metaKey || e.ctrlKey || e.altKey) return
    // Enter/Space activate the focused button, even if rebound for movement in game.
    if (e.code === 'Enter' || e.code === 'Space') return
    navigateMenu(e, settings.bindings)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('Main menu')}
      onKeyDown={navigate}
      {...menuSounds}
      className="absolute inset-0 z-20 animate-fade overflow-x-hidden overflow-y-auto"
    >
      {/* Blurred, warm-tinted view of the board behind the menu. */}
      <div className="fixed inset-0 bg-paper/40 backdrop-blur-[14px] backdrop-saturate-[1.15]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_30%_40%,transparent_20%,var(--menu-shade)_100%)]" />
      <div className="pointer-events-none fixed inset-0 grain opacity-40" />

      {/*
        On wide screens the grid is exactly one screen tall and both columns have fixed
        widths, so swapping the right-hand panel never nudges the menu on the left.
      */}
      <div className="relative mx-auto grid min-h-full max-w-[76rem] content-center gap-10 px-6 py-12 sm:px-10 lg:h-full lg:grid-cols-[minmax(0,1fr)_29rem] lg:grid-rows-[minmax(0,1fr)] lg:gap-14">
        <section className="min-w-0 lg:self-center">
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
            {t(
              'Guide falling meadow, forest and water tiles. Move sideways, rotate, and line up the terrain as each tile joins the stack.',
            )}
          </p>

          <ul className="mt-9 space-y-1">
            {canResume ? (
              <MenuItem {...selection('start')} autoFocus onClick={closeMenu} delay={220}>
                {t('Resume')}
              </MenuItem>
            ) : (
              <MenuItem
                {...selection('start')}
                side={<DifficultySelector />}
                autoFocus
                onClick={started ? () => restart() : closeMenu}
                delay={220}
              >
                {started ? t('New game') : t('Play')}
              </MenuItem>
            )}
            {canResume && (
              <MenuItem
                {...selection('new')}
                side={<DifficultySelector />}
                onClick={() => restart()}
                delay={270}
              >
                {t('New game')}
              </MenuItem>
            )}
            <MenuItem
              {...selection('mode')}
              pressed={panel === 'mode'}
              onClick={() => toggle('mode')}
              delay={320}
            >
              {t('Gamemode')}
            </MenuItem>
            <MenuItem
              {...selection('how')}
              pressed={panel === 'how'}
              onClick={() => toggle('how')}
              delay={370}
            >
              {t('How to play')}
            </MenuItem>
            <MenuItem
              {...selection('customization')}
              pressed={panel === 'customization'}
              onClick={() => toggle('customization')}
              delay={420}
            >
              {t('Customization')}
            </MenuItem>
            <MenuItem
              {...selection('settings')}
              pressed={panel === 'settings'}
              onClick={() => toggle('settings')}
              delay={470}
            >
              {t('Settings')}
            </MenuItem>
          </ul>

          <p className="mt-4 text-xs text-ink/55">
            {t(
              'Up / Down: menu options · Right: difficulty or panel · Left: return · Enter / Space: select',
            )}
          </p>

          {started && (
            <p
              className="mt-10 animate-rise font-display text-sm text-ink/70"
              style={{ animationDelay: '490ms' }}
            >
              {t('{mode} · Level {level} · {score} points · {tiles} tiles', {
                mode: `${t(GAME_VARIANT_LABELS[variant])} · ${t(GAME_MODE_LABELS[mode])}`,
                level,
                score: formatPoints(score, language),
                tiles,
              })}
            </p>
          )}
        </section>

        {panel && (
          <aside
            data-menu-panel={panel}
            onPointerEnter={() => setSelected(null)}
            key={panel}
            className="card animate-rise min-w-0 self-center overflow-x-hidden p-6 sm:p-8 lg:max-h-full lg:overflow-y-auto"
          >
            <h2 className="eyebrow mb-5">{t(PANEL_TITLES[panel])}</h2>
            {panel === 'mode' ? (
              <Gamemode />
            ) : panel === 'how' ? (
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
