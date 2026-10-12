import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

const TICK_MS = 50

/**
 * Advances automatic falling. This is only the movement cadence, with no game
 * countdown. The store ignores ticks while paused or out of tiles; hidden tabs pause too.
 */
export function useGravity() {
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
