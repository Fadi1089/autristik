import { describe, expect, it } from 'vitest'
import { viewportWithoutHud } from './hudViewport'
import type { ScreenRect } from './hudViewport'

export function hudRects(width: number, height: number, help = false): ScreenRect[] {
  return [
    { left: 24, right: width - 24, top: 24, bottom: 170 },
    { left: width - 224, right: width - 24, top: height / 2 - 240, bottom: height / 2 + 240 },
    { left: 0, right: 40, top: height - 124, bottom: height - 44 },
    ...(help ? [{ left: 0, right: 328, top: 200, bottom: height - 24 }] : []),
  ]
}

describe('HUD-free camera viewport', () => {
  it.each([
    [1920, 1080, false],
    [800, 900, false],
    [400, 900, false],
    [1920, 1080, true],
  ] as const)(
    'finds a play area without any HUD overlap at %s × %s (help %s)',
    (width, height, help) => {
      const obstacles = hudRects(width, height, help)
      const viewport = viewportWithoutHud(width, height, obstacles)
      const rect = {
        left: ((viewport.left + 1) * width) / 2,
        right: ((viewport.right + 1) * width) / 2,
        top: ((1 - viewport.top) * height) / 2,
        bottom: ((1 - viewport.bottom) * height) / 2,
      }
      expect(rect.right - rect.left).toBeGreaterThan(90)
      expect(rect.bottom - rect.top).toBeGreaterThan(90)
      for (const obstacle of obstacles)
        expect(
          rect.left < obstacle.right &&
            rect.right > obstacle.left &&
            rect.top < obstacle.bottom &&
            rect.bottom > obstacle.top,
        ).toBe(false)
    },
  )
  it('ignores off-screen HUD and keeps a small screen-edge margin', () => {
    expect(
      viewportWithoutHud(1000, 1000, [{ left: -300, right: -10, top: 0, bottom: 500 }]),
    ).toEqual({ left: -0.968, right: 0.968, top: 0.968, bottom: -0.968 })
  })
})
