import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

const TICK_MS = 50

/**
 * Advances gravity, elapsed time and the optional Time-attack countdown.
 * The store ignores ticks while paused or after game over; hidden tabs pause too.
 */
export function useGravity() {
  useEffect(() => {
    let last = performance.now()
    const resetClock = () => {
      last = performance.now()
    }
    document.addEventListener('visibilitychange', resetClock)
    const unsubscribe = useGameStore.subscribe((next, previous) => {
      if (
        next.menuOpen !== previous.menuOpen ||
        next.gameSeed !== previous.gameSeed ||
        (next.board !== previous.board && next.lastPlacement === null) ||
        next.playedSeconds < previous.playedSeconds
      )
        resetClock()
    })
    const id = window.setInterval(() => {
      const now = performance.now()
      const seconds = (now - last) / 1000
      last = now
      if (!document.hidden) {
        const game = useGameStore.getState()
        game.tick(game.variant === 'time-attack' ? seconds : Math.min(seconds, 1))
      }
    }, TICK_MS)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', resetClock)
      unsubscribe()
    }
  }, [])
}
