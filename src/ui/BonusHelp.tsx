import { useEffect, useRef } from 'react'
import countsShot from '../assets/bonus-counts.webp'
import noCountShot from '../assets/bonus-no-count.webp'

/** A word pinned on a screenshot, at a spot given in percent of its size. */
function Pin({
  x,
  y,
  tone,
  children,
}: {
  x: number
  y: number
  tone: 'good' | 'bad'
  children: string
}) {
  return (
    <span
      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[0.7rem] leading-tight font-bold whitespace-nowrap text-paper shadow-[0_4px_10px_-4px_rgb(59_46_34/0.6)] ${
        tone === 'good' ? 'bg-moss-deep' : 'bg-clay'
      }`}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {children}
    </span>
  )
}

function Example({
  tone,
  verdict,
  shot,
  alt,
  pins,
  children,
}: {
  tone: 'good' | 'bad'
  verdict: string
  shot: string
  alt: string
  pins: { x: number; y: number; label: string }[]
  children: string
}) {
  return (
    <figure className="flex flex-col gap-1.5">
      <div className="relative overflow-hidden rounded-xl ring-1 ring-ink/10">
        <img src={shot} alt={alt} width={480} height={336} className="block h-auto w-full" />
        {pins.map((pin) => (
          <Pin key={pin.label} x={pin.x} y={pin.y} tone={tone}>
            {pin.label}
          </Pin>
        ))}
      </div>
      <figcaption className="text-xs leading-snug text-ink/75">
        <span className={`font-bold ${tone === 'good' ? 'text-moss-deep' : 'text-clay'}`}>
          {verdict}
        </span>{' '}
        {children}
      </figcaption>
    </figure>
  )
}

/**
 * What counts for a bonus, shown rather than told: one patch grown up to the goal, and one
 * that was already big enough, which never counts. Esc or a click outside closes it.
 */
export function BonusHelp({ id, onClose }: { id: string; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Capturing on window ahead of the game's shortcuts keeps Esc from also opening the menu.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopImmediatePropagation()
      onClose()
    }
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Element
      if (!panel.current?.contains(target) && !target.closest('[data-bonus-help-toggle]')) onClose()
    }
    window.addEventListener('keydown', onKey, { capture: true })
    window.addEventListener('pointerdown', onPointer, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKey, { capture: true })
      window.removeEventListener('pointerdown', onPointer, { capture: true })
    }
  }, [onClose])

  return (
    <div
      ref={panel}
      id={id}
      role="dialog"
      aria-label="How bonus patches work"
      className="card absolute top-full right-0 z-10 mt-2 max-h-[calc(100dvh-11rem)] w-[min(31rem,calc(100vw-2rem))] animate-fade overflow-y-auto p-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Example
          tone="good"
          verdict="Counts."
          shot={countsShot}
          alt="A patch of four yellow squares with darker yellow cells blinking around it, and a yellow piece about to join it, making eight."
          pins={[{ x: 70, y: 55, label: '4 → 8 ✓' }]}
        >
          Grow a patch that's still under the goal. Tap Hint to blink where.
        </Example>
        <Example
          tone="bad"
          verdict="Doesn't count."
          shot={noCountShot}
          alt="A patch of eight yellow squares, already past the goal of seven, and a yellow piece about to join it."
          pins={[
            { x: 38, y: 56, label: 'already 8' },
            { x: 83, y: 56, label: '✗' },
          ]}
        >
          This patch was already big enough when the bonus came. Adding to it won't count.
        </Example>
        <p className="border-t border-ink/10 pt-2 sm:col-span-2 text-xs leading-snug font-semibold text-ink">
          Tip: start a fresh patch away from the big ones.
        </p>
      </div>
    </div>
  )
}
