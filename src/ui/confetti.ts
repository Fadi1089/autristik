import type { Biome } from '../game/tiles'
import { SCENE_COLORS, TERRAIN_COLORS } from '../palette'

/** Screen width per flake, and the most flakes however wide the screen: a sprinkle, not a shower. */
const PIXELS_PER_FLAKE = 22
const MAX_FLAKES = 70
/** A flake's length and width in CSS pixels: a little paper rectangle. */
export const FLAKE_SIZE = { length: 10, width: 5 } as const
/**
 * Speeds are shares of the screen height, so a phone and a monitor look alike. Air drag holds a
 * flake to a quarter of the screen a second, so it fades out around halfway down, clear of the
 * tray.
 */
const GRAVITY = 0.75
const DRAG = 3
/** Side to side flutter while it falls, as a share of the screen height a second. */
const SWAY = 0.05
/** The last share of a flake's life, over which it fades away. */
const FADE_SHARE = 0.35

export interface Flake {
  /** Position and velocity in CSS pixels, from the top left of the screen. */
  x: number
  y: number
  vx: number
  vy: number
  readonly color: string
  /** Its turn in the screen's plane, and its flip about its long side, which makes it flicker. */
  angle: number
  flip: number
  readonly spin: number
  readonly flipSpeed: number
  /** Where in its flutter it starts, and how quickly it sways. */
  readonly phase: number
  readonly sway: number
  readonly life: number
  /** Seconds since it was thrown; negative while it waits its turn. */
  age: number
}

/** `a` mixed `t` of the way towards `b`, both as #rrggbb. */
export function mixColor(a: string, b: string, t: number): string {
  const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const [from, to] = [channels(a), channels(b)]
  return `#${from
    .map((c, i) =>
      Math.round(c + (to[i]! - c) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

/**
 * The objective's biome and a lighter shade of it, with gold drawn twice as often and paper
 * cream, so the celebration is warm whichever biome it was.
 */
export function confettiColors(biome: Biome): string[] {
  const base = TERRAIN_COLORS[biome]
  const gold = SCENE_COLORS.gold
  return [base, mixColor(base, '#ffffff', 0.45), gold, gold, '#fbf4e6']
}

const between = (random: () => number, min: number, max: number) => min + random() * (max - min)

/** A sprinkle of confetti just above the top of a `width` by `height` screen, spread across it. */
export function spawnConfetti(
  width: number,
  height: number,
  colors: readonly string[],
  random: () => number = Math.random,
): Flake[] {
  const count = Math.min(MAX_FLAKES, Math.max(12, Math.round(width / PIXELS_PER_FLAKE)))
  return Array.from({ length: count }, () => ({
    x: random() * width,
    y: -between(random, 10, 40),
    vx: between(random, -0.08, 0.08) * height,
    vy: between(random, 0.05, 0.2) * height,
    color: colors[Math.floor(random() * colors.length)]!,
    angle: random() * Math.PI * 2,
    flip: random() * Math.PI * 2,
    spin: between(random, 1.5, 4) * (random() < 0.5 ? -1 : 1),
    flipSpeed: between(random, 5, 10),
    phase: random() * Math.PI * 2,
    sway: between(random, 2, 4),
    life: between(random, 2.2, 3),
    // Staggered, so they arrive as a drift rather than a wall.
    age: -between(random, 0, 0.6),
  }))
}

/** Moves a flake on by `dt` seconds on a screen `height` pixels tall. */
export function stepFlake(flake: Flake, dt: number, height: number): void {
  flake.age += dt
  if (flake.age < 0) return
  flake.vy += GRAVITY * height * dt
  const drag = Math.exp(-DRAG * dt)
  flake.vx *= drag
  flake.vy *= drag
  flake.x += (flake.vx + Math.sin(flake.age * flake.sway + flake.phase) * SWAY * height) * dt
  flake.y += flake.vy * dt
  flake.angle += flake.spin * dt
  flake.flip += flake.flipSpeed * dt
}

/** How opaque a flake is drawn: fully, then fading out over the end of its life. */
export function flakeOpacity(flake: Flake): number {
  if (flake.age < 0 || flake.age >= flake.life) return 0
  return Math.min(1, (flake.life - flake.age) / (flake.life * FADE_SHARE))
}
