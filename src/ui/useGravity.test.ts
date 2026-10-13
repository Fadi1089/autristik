import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest'
import type { useGameStore as Store } from '../store/gameStore'

let cleanup: (() => void) | undefined
vi.mock('react', () => ({
  useEffect: (effect: () => () => void) => {
    cleanup = effect()
  },
}))

let game: typeof Store
let install: () => void
let time = 0
let tick: () => void
let visibility: () => void
const page = {
  hidden: false,
  addEventListener: (_type: string, callback: () => void) => {
    visibility = callback
  },
  removeEventListener: vi.fn(),
}

beforeAll(async () => {
  vi.stubGlobal('performance', { now: () => time })
  vi.stubGlobal('document', page)
  vi.stubGlobal('window', {
    location: { search: '?seed=42' },
    setInterval: (callback: () => void) => {
      tick = callback
      return 1
    },
    clearInterval: vi.fn(),
  })
  game = (await import('../store/gameStore')).useGameStore
  install = (await import('./useGravity')).useGravity
})
beforeEach(() => {
  cleanup?.()
  time = 0
  page.hidden = false
  game.getState().restart(42, 'easy', 'classic', 'time-attack')
  install()
})
afterAll(() => {
  cleanup?.()
  vi.unstubAllGlobals()
})

function elapse(milliseconds: number) {
  time += milliseconds
  tick()
}

describe('active Time-attack clock', () => {
  it('counts all visible elapsed time after a delayed tick, rather than slowing the countdown', () => {
    elapse(5000)
    expect(game.getState().timeRemaining).toBe(40)
    elapse(100000)
    expect(game.getState()).toMatchObject({ timeRemaining: 0, playedSeconds: 45, current: null })
  })

  it('excludes a long hidden-tab pause even when no interval fires in the background', () => {
    elapse(3000)
    page.hidden = true
    visibility()
    time += 90000
    page.hidden = false
    visibility()
    elapse(1000)
    expect(game.getState().timeRemaining).toBe(41)
    expect(game.getState().playedSeconds).toBe(4)
  })

  it('excludes menu pauses and starts a new clock on restart', () => {
    elapse(4000)
    game.getState().openMenu()
    time += 60000
    game.getState().closeMenu()
    elapse(1000)
    expect(game.getState().timeRemaining).toBe(40)
    time += 10000
    game.getState().restart(42)
    elapse(1000)
    expect(game.getState()).toMatchObject({ timeRemaining: 44, playedSeconds: 1 })
  })
})
