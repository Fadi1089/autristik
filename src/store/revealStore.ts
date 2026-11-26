import { create } from 'zustand'

/**
 * Starting value: how long a landscape's pieces take to start dropping in, from the first to
 * the last, however many there are. Test: watching a new landscape, the growth should read as
 * spreading out from the centre, and the wait shouldn't feel like loading; if it drags, shorten.
 */
export const REVEAL_SECONDS = 1.6
/** Starting value: the longest gap between two pieces, so a small world doesn't crawl in. */
const MAX_STEP_SECONDS = 0.04

/** Seconds on a clock shared by the store and the scene. */
export const revealNow = () => performance.now() / 1000

/** A landscape growing in, one piece after another, in the order its cells collapsed. */
export interface Reveal {
  /** When the first piece started dropping, on revealNow's clock. */
  readonly start: number
  /** Seconds between one piece and the next. */
  readonly step: number
  /** How many pieces the landscape has; they are numbered from 0, in the order they come in. */
  readonly total: number
}

interface RevealStore {
  /** The landscape growing in, or the one that grew in this game; null for any other board. */
  readonly reveal: Reveal | null
  /** Pieces shown so far: the ones below this number are dropping in or have landed. */
  readonly shown: number
  /** Pieces that have landed, whose trees, houses and fields can grow. */
  readonly landed: number

  /** Starts growing in a landscape of `total` pieces. */
  begin(total: number): void
  /** Brings every piece in at once, as when the player clicks to get on with it. */
  finish(): void
  /** A board that isn't revealed: loaded, or another mode's. */
  clear(): void
  /** Moves the reveal on to `now`, given how long a piece takes to drop. */
  tick(now: number, dropSeconds: number): void
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export const useRevealStore = create<RevealStore>()((set, get) => ({
  reveal: null,
  shown: 0,
  landed: 0,

  begin: (total) => {
    const reveal = {
      start: revealNow(),
      step: Math.min(MAX_STEP_SECONDS, REVEAL_SECONDS / Math.max(1, total)),
      total,
    }
    // Players who prefer less motion get the whole landscape at once.
    if (prefersReducedMotion()) set({ reveal, shown: total, landed: total })
    else set({ reveal, shown: 0, landed: 0 })
  },

  finish: () => {
    const { reveal } = get()
    if (reveal) set({ shown: reveal.total, landed: reveal.total })
  },

  clear: () => set({ reveal: null, shown: 0, landed: 0 }),

  tick: (now, dropSeconds) => {
    const { reveal, shown, landed } = get()
    if (!reveal || landed >= reveal.total) return
    const count = (elapsed: number) =>
      Math.max(0, Math.min(reveal.total, Math.floor(elapsed / reveal.step) + 1))
    const nextShown = Math.max(shown, count(now - reveal.start))
    const nextLanded = Math.max(landed, count(now - reveal.start - dropSeconds))
    if (nextShown !== shown || nextLanded !== landed) set({ shown: nextShown, landed: nextLanded })
  },
}))

/** Whether a landscape is still growing in: some of its pieces have yet to land. */
export function isRevealing(s: Pick<RevealStore, 'reveal' | 'landed'>): boolean {
  return s.reveal !== null && s.landed < s.reveal.total
}

if (import.meta.env.DEV && typeof window !== 'undefined')
  // Handy for slowing a reveal down from the browser console, to watch it grow.
  (window as unknown as { revealStore: typeof useRevealStore }).revealStore = useRevealStore

if (import.meta.hot) import.meta.hot.accept(() => window.location.reload())
