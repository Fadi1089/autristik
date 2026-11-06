import { describe, expect, it } from 'vitest'
import { createRng } from '../game/random'
import { confettiColors, flakeOpacity, mixColor, spawnConfetti, stepFlake } from './confetti'

const WIDTH = 1280
const HEIGHT = 800

function sprinkle(width = WIDTH) {
  const rng = createRng(3)
  return spawnConfetti(width, HEIGHT, confettiColors('green'), () => rng.next())
}

describe('screen confetti', () => {
  it('mixes colours, with gold more often than the biome itself', () => {
    expect(mixColor('#000000', '#ffffff', 0.5)).toBe('#808080')
    const colors = confettiColors('green')
    expect(colors[0]).toBe('#4f9e52')
    expect(colors.filter((color) => color === colors[2])).toHaveLength(2)
  })

  it('is a sprinkle above the top of the screen, sized to its width', () => {
    const flakes = sprinkle()
    expect(flakes.length).toBeGreaterThan(30)
    expect(flakes.length).toBeLessThanOrEqual(70)
    expect(sprinkle(375).length).toBeLessThan(flakes.length)
    for (const flake of flakes) {
      expect(flake.y).toBeLessThan(0)
      expect(flake.x).toBeGreaterThanOrEqual(0)
      expect(flake.x).toBeLessThanOrEqual(WIDTH)
    }
  })

  it('drifts down and fades out before it reaches the bottom of the screen', () => {
    const flakes = sprinkle()
    for (let t = 0; t < 4; t += 1 / 60)
      for (const flake of flakes) {
        const visible = flakeOpacity(flake) > 0
        stepFlake(flake, 1 / 60, HEIGHT)
        if (visible) expect(flake.y).toBeLessThan(HEIGHT * 0.85)
      }
    for (const flake of flakes) {
      expect(flake.y).toBeGreaterThan(HEIGHT * 0.2)
      expect(flakeOpacity(flake)).toBe(0)
    }
  })
})
