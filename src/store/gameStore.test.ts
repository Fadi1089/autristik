import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { changeFallDirection, FALL_INTERVAL } from '../game/falling'
import { Direction } from '../game/coords'
import { screenToWorldDirection } from '../input/movement'
import type { useGameStore as Store } from './gameStore'

let useGameStore: typeof Store

beforeAll(async () => {
  vi.stubGlobal('window', { location: { search: '?seed=42' } })
  useGameStore = (await import('./gameStore')).useGameStore
})
afterAll(() => vi.unstubAllGlobals())
beforeEach(() => useGameStore.getState().restart(42))

describe('falling controls and camera requests', () => {
  it('leaves the camera request unchanged during gravity, locking and spawning', () => {
    useGameStore.getState().moveSideways(1)
    const { cameraMove, cameraFollow } = useGameStore.getState()
    useGameStore.getState().tick(FALL_INTERVAL * 12)
    expect(useGameStore.getState()).toMatchObject({ cameraMove, cameraFollow })
    expect(useGameStore.getState().lastPlacement).not.toBeNull()
  })

  it('requests camera movement for every successful manual move, including after a respawn', () => {
    useGameStore.getState().moveSideways(1)
    useGameStore.getState().tick(FALL_INTERVAL * 11)
    expect(useGameStore.getState().falling?.q).toBe(1)
    useGameStore.getState().moveSideways(-1)
    expect(useGameStore.getState()).toMatchObject({
      cameraMove: 2,
      cameraFollow: { axis: 'q', value: 0 },
    })
    useGameStore.getState().moveSideways(1)
    useGameStore.getState().moveSideways(1) // turns automatically around the right edge
    expect(useGameStore.getState()).toMatchObject({
      cameraMove: 4,
      fallDirection: Direction.West,
      cameraFollow: { axis: 'r', value: -1 },
    })
  })

  it('pauses gravity, the cadence remainder, clock and controls with the menu', () => {
    useGameStore.getState().tick(0.3)
    useGameStore.getState().openMenu()
    const paused = useGameStore.getState()
    paused.tick(5)
    paused.moveSideways(1)
    paused.rotate(1)
    paused.advance()
    paused.drop()
    expect(useGameStore.getState()).toBe(paused)
    paused.closeMenu()
    useGameStore.getState().tick(FALL_INTERVAL - 0.3)
    expect(useGameStore.getState().falling).toEqual({ q: 0, r: -10 })
  })

  it('keeps the camera unchanged during manual forward steps and hard drops', () => {
    useGameStore.getState().advance()
    useGameStore.getState().drop()
    expect(useGameStore.getState()).toMatchObject({ cameraMove: 0, cameraFollow: null })
  })

  it('follows the row for horizontal gravity, only on lateral movement', () => {
    useGameStore.setState(changeFallDirection(useGameStore.getState(), Direction.West))
    useGameStore.getState().move(Direction.North)
    expect(useGameStore.getState()).toMatchObject({
      cameraMove: 1,
      cameraFollow: { axis: 'r', value: -1 },
    })
    const request = useGameStore.getState().cameraFollow
    useGameStore.getState().move(Direction.West)
    expect(useGameStore.getState().cameraFollow).toBe(request)
    useGameStore.getState().drop()
    expect(useGameStore.getState().cameraFollow).toBe(request)
  })

  it.each([0, Math.PI / 2, Math.PI, -Math.PI / 2])(
    'maps camera-relative keys before applying gravity at azimuth %s',
    (azimuth) => {
      const towards = screenToWorldDirection('down', azimuth)
      useGameStore.setState(changeFallDirection(useGameStore.getState(), towards))
      const before = useGameStore.getState().falling!
      useGameStore.getState().move(screenToWorldDirection('down', azimuth))
      const after = useGameStore.getState().falling!
      expect(Math.abs(after.q - before.q) + Math.abs(after.r - before.r)).toBe(1)
      expect(useGameStore.getState().cameraMove).toBe(0)
      useGameStore.getState().move(screenToWorldDirection('left', azimuth))
      expect(useGameStore.getState().cameraMove).toBe(1)
    },
  )
})
