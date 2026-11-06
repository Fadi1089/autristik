import { useEffect, useRef } from 'react'
import type { BonusState } from '../game/bonus'
import type { Biome } from '../game/tiles'
import { useGameStore } from '../store/gameStore'
import { confettiColors, FLAKE_SIZE, flakeOpacity, spawnConfetti, stepFlake } from './confetti'
import type { Flake } from './confetti'

/**
 * The objective just completed: the open one, or, at a milestone or the end of a game, the one
 * just put into the history.
 */
function completedBiome(bonus: BonusState | undefined): Biome | null {
  if (bonus?.objective?.completed) return bonus.objective.biome
  const last = bonus?.history.at(-1)
  return last?.completed ? last.biome : null
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A light sprinkle of confetti drifting down from the top of the screen when a bonus objective is
 * completed, in gold, cream and shades of its biome. It never takes a click, and it is left out
 * for players who prefer reduced motion: the score cloud and the objective card still say it.
 */
export function ScreenConfetti() {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let flakes: Flake[] = []
    let frame = 0
    let last = 0

    const draw = (now: number) => {
      const element = canvas.current
      const context = element?.getContext('2d')
      if (!element || !context) return
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const ratio = window.devicePixelRatio || 1
      const { innerWidth: width, innerHeight: height } = window
      if (element.width !== Math.round(width * ratio)) element.width = Math.round(width * ratio)
      if (element.height !== Math.round(height * ratio)) element.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)
      for (const flake of flakes) {
        stepFlake(flake, dt, height)
        const opacity = flakeOpacity(flake)
        if (opacity <= 0) continue
        context.save()
        context.globalAlpha = opacity
        context.fillStyle = flake.color
        context.translate(flake.x, flake.y)
        context.rotate(flake.angle)
        // Flipping about its long side squashes it to an edge and back: paper catching the light.
        context.scale(1, Math.cos(flake.flip))
        context.fillRect(
          -FLAKE_SIZE.length / 2,
          -FLAKE_SIZE.width / 2,
          FLAKE_SIZE.length,
          FLAKE_SIZE.width,
        )
        context.restore()
      }
      flakes = flakes.filter((flake) => flake.age < flake.life)
      frame = flakes.length > 0 ? requestAnimationFrame(draw) : 0
      if (!frame) context.clearRect(0, 0, width, height)
    }

    const unsubscribe = useGameStore.subscribe((s, prev) => {
      const placed = s.lastPlacement
      if (!placed || placed === prev.lastPlacement || placed.bonusPoints <= 0) return
      const biome = completedBiome(s.bonus)
      if (!biome || prefersReducedMotion()) return
      flakes = [
        ...flakes,
        ...spawnConfetti(window.innerWidth, window.innerHeight, confettiColors(biome)),
      ]
      if (!frame) {
        last = performance.now()
        frame = requestAnimationFrame(draw)
      }
    })
    return () => {
      unsubscribe()
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
    />
  )
}
