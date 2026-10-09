import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { normalizeRotation } from '../game/tiles'
import { TERRAIN_LABELS } from '../palette'
import { TrayTile } from '../scene/TrayTile'
import { useGameStore } from '../store/gameStore'
import { RotateCcwIcon, RotateCwIcon } from './icons'
import { useKeyHint } from './useKeyHint'

type Spin = { dir: 1 | -1; n: number }

function RotateButton({
  label,
  dir,
  spin,
  onClick,
  children,
}: {
  label: string
  dir: 1 | -1
  spin: Spin | null
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
      className="group grid size-11 place-items-center rounded-full text-ink/75 transition hover:bg-ink/6 hover:text-ink active:scale-90"
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
    </button>
  )
}

/** Next tile as a floating 3D piece over the stack, with animated rotate buttons. */
export function TileTray() {
  const current = useGameStore((s) => s.current)
  const rotation = useGameStore((s) => s.rotation)
  const remaining = useGameStore((s) => s.remaining)
  const rotate = useGameStore((s) => s.rotate)
  const [spin, setSpin] = useState<Spin | null>(null)

  // Spin the matching icon whenever the tile turns, whether by button or keyboard.
  useEffect(
    () =>
      useGameStore.subscribe((s, prev) => {
        if (s.current !== prev.current || s.rotation === prev.rotation) return
        const dir = normalizeRotation(s.rotation - prev.rotation) === 1 ? 1 : -1
        setSpin((old) => ({ dir, n: (old?.n ?? 0) + 1 }))
      }),
    [],
  )

  const cwKey = useKeyHint('rotateCw')
  const ccwKey = useKeyHint('rotateCcw')

  if (!current) return null
  const description = current.map((t) => TERRAIN_LABELS[t].toLowerCase()).join(', ')

  return (
    <div className="card flex items-center gap-1 py-2.5 pr-5 pl-2.5">
      <RotateButton
        label={`Rotate counter-clockwise${ccwKey ? ` (${ccwKey})` : ''}`}
        dir={-1}
        spin={spin}
        onClick={() => rotate(-1)}
      >
        <RotateCcwIcon className="size-5" />
      </RotateButton>

      <button
        type="button"
        onClick={() => rotate(1)}
        title="Next tile (click to rotate)"
        aria-label={`Next tile: ${description}. Click to rotate.`}
        className="relative -mt-14 -mb-4 size-32 cursor-pointer"
      >
        <Canvas
          shadows="percentage"
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true }}
          camera={{ fov: 26, near: 0.1, far: 20 }}
          className="pointer-events-none"
        >
          <TrayTile quadrants={current} rotation={rotation} remaining={remaining} />
        </Canvas>
      </button>

      <RotateButton
        label={`Rotate clockwise${cwKey ? ` (${cwKey})` : ''}`}
        dir={1}
        spin={spin}
        onClick={() => rotate(1)}
      >
        <RotateCwIcon className="size-5" />
      </RotateButton>

      <div className="ml-2 border-l border-ink/10 pl-4">
        <div className="eyebrow">Tiles</div>
        <div className="font-display text-[2rem] leading-tight font-semibold tabular-nums">
          {remaining}
        </div>
      </div>
    </div>
  )
}
