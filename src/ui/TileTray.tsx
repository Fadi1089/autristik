import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { upcomingTiles } from '../game/game'
import { normalizeRotation, shapeOffsets } from '../game/tiles'
import type { Tetromino } from '../game/tiles'
import { TERRAIN_COLORS, TERRAIN_LABELS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { useViewStore } from '../store/viewStore'
import { RotateCcwIcon, RotateCwIcon } from './icons'
import { useKeyHint } from './useKeyHint'

type Spin = { dir: 1 | -1; n: number }

function RotateButton({
  label,
  dir,
  spin,
  shortcut,
  onClick,
  children,
}: {
  label: string
  dir: 1 | -1
  spin: Spin | null
  shortcut: string
  onClick: () => void
  children: ReactNode
}) {
  // Re-keying the icon restarts its spin animation on every turn in this direction.
  const spinning = spin?.dir === dir
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="group flex size-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full text-ink/60 transition hover:bg-ink/6 hover:text-ink active:scale-90 sm:size-16"
    >
      <span
        className={`grid transition-transform duration-300 ease-out ${
          dir === 1 ? 'group-hover:rotate-[25deg]' : 'group-hover:-rotate-[25deg]'
        }`}
      >
        <span
          key={spinning ? spin.n : 'idle'}
          className={spinning ? (dir === 1 ? 'animate-spin-cw' : 'animate-spin-ccw') : ''}
        >
          {children}
        </span>
      </span>
      <span aria-hidden className="text-[8px] leading-none text-ink/50 sm:text-[9px]">
        {shortcut || '—'}
      </span>
    </button>
  )
}

/**
 * A flat drawing of a piece, one terrain square per cell, sized in `em` so each slot sets
 * its scale with its font size. It turns with the main camera, plus `turns` quarter turns,
 * so it sits the way it will on the board; both turns ease, like the ghost on the board.
 */
function PieceIcon({ piece, turns = 0 }: { piece: Tetromino; turns?: number }) {
  const azimuth = useViewStore((s) => s.azimuth)
  // Drawn unrotated in a square frame, so turning it never clips or shifts the frame.
  const offsets = shapeOffsets(piece.shape)
  const minQ = Math.min(...offsets.map((o) => o.q))
  const minR = Math.min(...offsets.map((o) => o.r))
  const width = Math.max(...offsets.map((o) => o.q)) - minQ + 1
  const depth = Math.max(...offsets.map((o) => o.r)) - minR + 1
  const size = Math.max(width, depth)
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className="block transition-transform duration-200 ease-out"
      style={{
        width: `${size}em`,
        height: `${size}em`,
        transform: `rotate(${azimuth + (turns * Math.PI) / 2}rad)`,
      }}
    >
      <g transform={`translate(${(size - width) / 2} ${(size - depth) / 2})`}>
        {offsets.map((o, i) => (
          <rect
            key={i}
            x={o.q - minQ + 0.04}
            y={o.r - minR + 0.04}
            width={0.92}
            height={0.92}
            rx={0.16}
            fill={TERRAIN_COLORS[piece.terrains[i]!]}
          />
        ))}
      </g>
    </svg>
  )
}

function describe(piece: Tetromino): string {
  return `${piece.shape} tetromino: ${piece.terrains.map((t) => TERRAIN_LABELS[t].toLowerCase()).join(', ')}`
}

/**
 * Each upcoming slot is smaller and quieter than the one before it, so the line reads as a
 * queue receding from the piece in hand without needing a label. Sizes are per square.
 */
const UPCOMING_SLOTS = [
  'text-[7px] opacity-90 sm:text-[9px]',
  'text-[5.5px] opacity-70 sm:text-[7px]',
  'text-[4.5px] opacity-50 sm:text-[5.5px]',
] as const

/**
 * The piece in hand between its rotate buttons, and the next three pieces getting smaller as
 * they wait their turn.
 */
export function TileTray() {
  const current = useGameStore((s) => s.current)
  const rotation = useGameStore((s) => s.rotation)
  const seed = useGameStore((s) => s.seed)
  const biomeProbabilities = useGameStore((s) => s.biomeProbabilities)
  const upcoming = useMemo(
    () => upcomingTiles({ seed, biomeProbabilities }),
    [seed, biomeProbabilities],
  )
  const rotate = useGameStore((s) => s.rotate)
  const [spin, setSpin] = useState<Spin | null>(null)
  /** Quarter turns of the piece in hand, counted the short way round so it never spins back. */
  const [turns, setTurns] = useState<number>(rotation)
  /** Changes with each new piece in hand, so its icon appears at its own angle instead of spinning there. */
  const [drawn, setDrawn] = useState(0)

  // Spin the icons whenever the piece turns, whether by button or keyboard.
  useEffect(
    () =>
      useGameStore.subscribe((s, prev) => {
        if (s.current !== prev.current) {
          setDrawn((n) => n + 1)
          setTurns(s.rotation)
          return
        }
        if (s.rotation === prev.rotation) return
        const step = normalizeRotation(s.rotation - prev.rotation)
        const dir = step === 1 ? 1 : -1
        setSpin((old) => ({ dir, n: (old?.n ?? 0) + 1 }))
        setTurns((old) => old + (step === 3 ? -1 : step))
      }),
    [],
  )

  const cwKey = useKeyHint('rotateCw', 'KeyE')
  const ccwKey = useKeyHint('rotateCcw')

  if (!current) return null

  return (
    <div className="card flex h-14 items-center gap-4 px-3 sm:h-[4.6rem] sm:gap-6 sm:px-4">
      <div className="flex items-center gap-1">
        <RotateButton
          label={`Rotate counter-clockwise${ccwKey ? ` (${ccwKey})` : ''}`}
          dir={-1}
          spin={spin}
          shortcut={ccwKey}
          onClick={() => rotate(-1)}
        >
          <RotateCcwIcon className="hud-pictogram" />
        </RotateButton>

        <button
          type="button"
          onClick={() => rotate(1)}
          title="Current tetromino (click to rotate)"
          aria-label={`Current ${describe(current)}. Click to rotate.`}
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-2xl bg-paper-deep/70 text-[9.5px] shadow-[inset_0_1px_2px_rgb(59_46_34/0.08)] transition active:scale-95 sm:size-[3.6rem] sm:text-[12px]"
        >
          <PieceIcon key={drawn} piece={current} turns={turns} />
        </button>

        <RotateButton
          label={`Rotate clockwise${cwKey ? ` (${cwKey})` : ''}`}
          dir={1}
          spin={spin}
          shortcut={cwKey}
          onClick={() => rotate(1)}
        >
          <RotateCwIcon className="hud-pictogram" />
        </RotateButton>
      </div>

      {upcoming.length > 0 && (
        <ol aria-label="Upcoming tetrominoes" className="flex items-center gap-2 sm:gap-2.5">
          {upcoming.map((piece, i) => (
            // Re-keyed on every placement so each slot slides in as the queue moves up.
            // Fixed 4-square slots keep the line steady whatever the shapes are.
            <li
              key={`${i}-${seed}`}
              aria-label={describe(piece)}
              className={`grid size-[4em] animate-queue place-items-center ${UPCOMING_SLOTS[i]}`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <PieceIcon piece={piece} />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
