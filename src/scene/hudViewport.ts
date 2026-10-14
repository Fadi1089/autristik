export interface ScreenRect {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

/** Normalised device coordinates, with positive y towards the top of the canvas. */
export type CameraViewport = ScreenRect

export const FULL_VIEWPORT: CameraViewport = { left: -0.95, right: 0.95, top: 0.95, bottom: -0.95 }

/** Largest rectangular play area that does not intersect the visible HUD. */
export function viewportWithoutHud(
  width: number,
  height: number,
  obstacles: readonly ScreenRect[],
  padding = 16,
): CameraViewport {
  if (width <= padding * 2 || height <= padding * 2) return FULL_VIEWPORT
  const blocked = obstacles
    .filter((rect) => rect.right > 0 && rect.left < width && rect.bottom > 0 && rect.top < height)
    .map((rect) => ({
      left: Math.max(padding, rect.left - padding),
      right: Math.min(width - padding, rect.right + padding),
      top: Math.max(padding, rect.top - padding),
      bottom: Math.min(height - padding, rect.bottom + padding),
    }))
  const lefts = [padding, ...blocked.map((rect) => rect.right)]
  const rights = [width - padding, ...blocked.map((rect) => rect.left)]
  const tops = [padding, ...blocked.map((rect) => rect.bottom)]
  const bottoms = [height - padding, ...blocked.map((rect) => rect.top)]
  let best: ScreenRect | null = null
  let bestArea = 0
  let bestOffset = Infinity
  for (const left of lefts)
    for (const right of rights) {
      if (right <= left) continue
      for (const top of tops)
        for (const bottom of bottoms) {
          if (
            bottom <= top ||
            blocked.some(
              (rect) =>
                left < rect.right && right > rect.left && top < rect.bottom && bottom > rect.top,
            )
          )
            continue
          const area = (right - left) * (bottom - top)
          const offset = Math.hypot((right + left) / 2 - width / 2, (top + bottom) / 2 - height / 2)
          if (area > bestArea || (area === bestArea && offset < bestOffset)) {
            best = { left, right, top, bottom }
            bestArea = area
            bestOffset = offset
          }
        }
    }
  if (!best) return FULL_VIEWPORT
  return {
    left: (best.left * 2) / width - 1,
    right: (best.right * 2) / width - 1,
    top: 1 - (best.top * 2) / height,
    bottom: 1 - (best.bottom * 2) / height,
  }
}

export function measureCameraViewport(canvas: HTMLCanvasElement): CameraViewport {
  const bounds = canvas.getBoundingClientRect()
  const hud = canvas.closest('main')?.querySelectorAll<HTMLElement>('[data-camera-obstacle]')
  const obstacles = Array.from(hud ?? [])
    .filter((element) => element.getClientRects().length > 0)
    .map((element) => {
      const rect = element.getBoundingClientRect()
      return {
        left: rect.left - bounds.left,
        right: rect.right - bounds.left,
        top: rect.top - bounds.top,
        bottom: rect.bottom - bounds.top,
      }
    })
  return viewportWithoutHud(bounds.width, bounds.height, obstacles)
}
