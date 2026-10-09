import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

const TICK_MS = 200

/**
 * Feeds real elapsed time into the store. The store ignores ticks while the menu
 * is open or the game is over, and hidden tabs don't count either.
 */
export function useGameClock() {
  useEffect(() => {
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      const seconds = (now - last) / 1000
      last = now
      if (!document.hidden) useGameStore.getState().tick(Math.min(seconds, 1))
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [])
}
