import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import {
  BONUS_INTERVAL,
  BONUS_POINTS,
  bonusProgress,
  bonusTargetCells,
  legacyPlacements,
} from '../game/bonus'
import type { BonusObjective as Objective } from '../game/bonus'
import { TERRAIN_COLORS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { useViewStore } from '../store/viewStore'
import { BonusHelp } from './BonusHelp'

/** The deadline turns clay when this few placements are left. */
const HURRY = 3

function placementsLeft(n: number): string {
  return `${n} ${n === 1 ? 'placement' : 'placements'}`
}

/**
 * One segment per square the objective asks for, filled in the biome's colour up to the largest
 * region that can still count: a row of little tiles, like the pieces on the board.
 */
function RegionMeter({ size, target, color }: { size: number; target: number; color: string }) {
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: target }, (_, i) => (
        <span
          key={i}
          className="h-2 flex-1 rounded-[3px] bg-ink/10 transition-colors duration-300"
          style={i < size ? { backgroundColor: color } : undefined}
        />
      ))}
    </div>
  )
}

/** How much of each card behind the top one shows while they are stacked, in pixels. */
const PEEK = 9
/** Cards that peek out from behind the top one; the rest hide in the stack. */
const PEEKING = 3
/** A past card's height in pixels: `h-[3.25rem]`. */
const PAST_HEIGHT = 52
const GAP = 8

/** An earlier objective, as small as a card can be: what it asked for and how it went. */
function PastObjective({ objective }: { objective: Objective }) {
  const { biome, target, issuedAt, completed } = objective
  return (
    <div className="card flex h-[3.25rem] flex-col justify-center gap-1.5 px-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-[3px]"
          style={{ backgroundColor: TERRAIN_COLORS[biome] }}
        />
        <span className="font-display text-[0.9rem] leading-none font-semibold text-ink">
          {biome[0]!.toUpperCase() + biome.slice(1)} patch of {target}
        </span>
        <span
          className={`ml-auto text-[0.7rem] leading-none font-semibold whitespace-nowrap ${completed ? 'text-moss-deep' : 'text-ink/45'}`}
        >
          {completed ? `✓ +${BONUS_POINTS}` : 'Missed'}
        </span>
      </div>
      <span className="pl-[1.125rem] text-[0.7rem] leading-none text-ink/50 tabular-nums">
        Placements {issuedAt + 1}–{issuedAt + BONUS_INTERVAL}
      </span>
    </div>
  )
}

/** The height of an element, kept up to date as it changes. */
function useHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [height, setHeight] = useState(0)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight))
    observer.observe(element)
    setHeight(element.offsetHeight)
    return () => observer.disconnect()
  }, [])
  return [ref, height] as const
}

/**
 * The current objective on top of the earlier ones, stacked like a deck of cards with the newest
 * just behind. Hovering spreads them into a list to scroll through under the current one, which
 * stays put; on a touch screen a tap spreads them, a drag scrolls, and a tap elsewhere stacks
 * them again.
 */
function ObjectiveStack({
  top,
  past,
  locked,
}: {
  top: ReactNode
  past: readonly Objective[]
  locked: boolean
}) {
  const [spread, setSpread] = useState(false)
  const [topRef, topHeight] = useHeight<HTMLDivElement>()
  const scroller = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; scrollTop: number } | null>(null)
  const open = spread && !locked && past.length > 0
  const newestFirst = [...past].reverse()

  useEffect(() => {
    if (!open && scroller.current) scroller.current.scrollTop = 0
  }, [open])

  // A tap outside stacks the cards again; hovering handles the mouse.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && !scroller.current?.contains(e.target as Node))
        setSpread(false)
    }
    window.addEventListener('pointerdown', onPointer, { capture: true })
    return () => window.removeEventListener('pointerdown', onPointer, { capture: true })
  }, [open])

  // The page turns off touch scrolling for the board, so a finger scrolls the list by hand.
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse' && open && scroller.current)
      drag.current = { y: e.clientY, scrollTop: scroller.current.scrollTop }
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    if (drag.current && scroller.current)
      scroller.current.scrollTop = drag.current.scrollTop - (e.clientY - drag.current.y)
  }
  const endDrag = () => {
    drag.current = null
  }

  const stackedHeight = topHeight + Math.min(past.length, PEEKING) * PEEK
  const spreadHeight = topHeight + past.length * (PAST_HEIGHT + GAP)

  return (
    <div
      ref={scroller}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setSpread(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setSpread(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      // Padding inside the scroller leaves room for the cards' shadows; when spread, the mask
      // hides cards scrolling past above the current one and fades out the bottom of the list.
      className={`pointer-events-auto -m-3 p-3 pb-5 ${open ? 'max-h-[calc(100dvh-15rem)] [mask-image:linear-gradient(transparent_0.75rem,black_0.75rem,black_calc(100%-1.5rem),transparent)] overflow-y-auto overscroll-contain' : ''}`}
    >
      <div
        className="relative transition-[height] duration-300 ease-out"
        style={{ height: open ? spreadHeight : stackedHeight }}
      >
        <div ref={topRef} className="sticky top-0 z-50">
          {top}
        </div>
        {past.length > 0 && (
          <ol aria-label="Earlier bonus objectives">
            {newestFirst.map((objective, i) => {
              const depth = Math.min(i + 1, PEEKING)
              const y = open
                ? topHeight + GAP + i * (PAST_HEIGHT + GAP)
                : topHeight + depth * PEEK - PAST_HEIGHT
              const tilt = open ? 0 : (i % 2 ? -1 : 1) * depth * 0.6
              const scale = open ? 1 : 1 - depth * 0.045
              return (
                <li
                  key={objective.issuedAt}
                  onClick={() => setSpread(true)}
                  className="absolute inset-x-0 top-0 origin-bottom transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                  style={{
                    zIndex: 40 - Math.min(i, 39),
                    transform: `translateY(${y}px) rotate(${tilt}deg) scale(${scale})`,
                    opacity: open || i < PEEKING ? 1 : 0,
                    transitionDelay: open ? `${Math.min(i, 8) * 25}ms` : '0ms',
                  }}
                >
                  <PastObjective objective={objective} />
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}

/**
 * The bonus objective under the score: the patch to grow, how big it is now, and how long is
 * left. It rises in afresh for each new objective, on top of the stack of earlier ones.
 */
export function BonusObjective() {
  const bonus = useGameStore((s) => s.bonus)
  const board = useGameStore((s) => s.board)
  const placements = bonus?.placements ?? legacyPlacements(board)
  const objective = bonus?.objective
  const completed = bonus?.completed ?? 0
  const [helpOpen, setHelpOpen] = useState(false)
  const closeHelp = useCallback(() => setHelpOpen(false), [])
  const helpId = useId()
  const requestHint = useViewStore((s) => s.requestBonusHint)

  if (placements < BONUS_INTERVAL) return null

  const remaining = objective
    ? objective.issuedAt + BONUS_INTERVAL - placements
    : BONUS_INTERVAL - (placements % BONUS_INTERVAL)
  const done = objective?.completed ?? false
  const { size, stale } = objective ? bonusProgress(board, objective) : { size: 0, stale: 0 }
  const canHint = objective && !done ? bonusTargetCells(board, objective).length > 0 : false
  const staleNote = `Patches already at ${objective?.target}+ don't count`
  const summary = !objective
    ? `Next bonus in ${placementsLeft(remaining)}.`
    : done
      ? `Bonus done, ${BONUS_POINTS} points. Next bonus in ${placementsLeft(remaining)}.`
      : `Bonus, ${BONUS_POINTS} points: grow a ${objective.biome} patch to ${objective.target} ` +
        `squares. Largest is ${size}, ${placementsLeft(remaining)} left.` +
        (stale > 0 ? ` ${staleNote}.` : '')

  const card = (
    <section
      key={objective?.issuedAt ?? 'waiting'}
      aria-label="Bonus objective"
      className="card w-[15rem] animate-rise px-4 py-3 sm:w-[16.5rem]"
    >
      <p role="status" className="sr-only">
        {summary}
      </p>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span aria-hidden className="eyebrow pl-[0.18em]">
            Bonus
          </span>
          <span
            aria-hidden
            className={`text-[0.7rem] leading-none font-semibold tabular-nums ${done ? 'text-moss-deep' : 'text-gold'}`}
          >
            +{BONUS_POINTS}
            {done && ' ✓'}
          </span>
          <span className="ml-auto flex items-center gap-2">
            {completed > 0 && (
              <span
                aria-hidden
                title={`${completed} completed this game`}
                className="text-[0.7rem] leading-none text-ink/50 tabular-nums"
              >
                {completed} done
              </span>
            )}
            {objective && !done && (
              <button
                type="button"
                disabled={!canHint}
                onClick={requestHint}
                title={canHint ? 'Blink where to grow the patch' : 'No patch to grow yet'}
                className="-my-1.5 flex h-8 items-center rounded-full transition not-disabled:active:scale-90 disabled:opacity-40"
              >
                <span className="rounded-full px-2 py-1 text-[0.7rem] leading-none font-semibold text-ink/70 ring-1 ring-ink/30 transition hover:text-ink hover:ring-ink/50">
                  Hint
                </span>
              </button>
            )}
            {objective && (
              <button
                type="button"
                data-bonus-help-toggle
                aria-label="How bonus patches work"
                aria-expanded={helpOpen}
                aria-controls={helpOpen ? helpId : undefined}
                title="How bonus patches work"
                onClick={() => setHelpOpen((open) => !open)}
                className={`-m-1.5 grid size-8 place-items-center rounded-full transition active:scale-90 ${
                  helpOpen ? 'text-paper' : 'text-ink/60 hover:text-ink'
                }`}
              >
                <span
                  aria-hidden
                  className={`grid size-5 place-items-center rounded-full font-display text-[0.75rem] leading-none font-bold ring-1 transition ${
                    helpOpen ? 'bg-ink ring-ink' : 'ring-ink/30'
                  }`}
                >
                  ?
                </span>
              </button>
            )}
          </span>
        </div>

        <div aria-hidden className="flex flex-col gap-2">
          {objective && (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={`font-display text-[0.95rem] leading-tight font-semibold sm:text-base ${done ? 'text-ink/45' : 'text-ink'}`}
                >
                  Grow a {objective.biome} patch
                </span>
                <span
                  className={`font-display text-[0.95rem] leading-none font-semibold tabular-nums sm:text-base ${done ? 'text-moss-deep' : 'text-ink'}`}
                >
                  {size}
                  <span className="text-ink/40">/{objective.target}</span>
                </span>
              </div>
              <RegionMeter
                size={size}
                target={objective.target}
                color={done ? 'var(--color-moss)' : TERRAIN_COLORS[objective.biome]}
              />
            </>
          )}

          <p
            className={`text-xs leading-snug tabular-nums ${
              objective && !done && remaining <= HURRY ? 'font-semibold text-clay' : 'text-ink/60'
            }`}
          >
            {objective && !done
              ? `${placementsLeft(remaining)} left`
              : `Next bonus in ${placementsLeft(remaining)}`}
          </p>
          {objective && !done && stale > 0 && (
            <p className="-mt-1.5 text-xs leading-snug text-ink/50">{staleNote}</p>
          )}
        </div>
      </div>
    </section>
  )

  return (
    <div className="relative">
      <ObjectiveStack top={card} past={bonus?.history ?? []} locked={helpOpen} />
      {helpOpen && objective && <BonusHelp id={helpId} onClose={closeHelp} />}
    </div>
  )
}
