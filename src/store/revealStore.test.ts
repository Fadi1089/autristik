import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isRevealing, REVEAL_SECONDS, revealNow, useRevealStore } from './revealStore'

const DROP = 0.35

beforeEach(() => {
  vi.unstubAllGlobals()
  useRevealStore.getState().clear()
})

/** Starts a reveal of `total` pieces, then pins its start to 0 on the test's clock. */
function begin(total: number) {
  useRevealStore.getState().begin(total)
  const reveal = useRevealStore.getState().reveal!
  useRevealStore.setState({ reveal: { ...reveal, start: 0 } })
  return useRevealStore.getState().reveal!
}

describe('the landscape reveal', () => {
  it('brings the pieces in one after another, each landing a drop later', () => {
    const { step } = begin(40)
    expect(step).toBeCloseTo(REVEAL_SECONDS / 40)
    expect(isRevealing(useRevealStore.getState())).toBe(true)

    useRevealStore.getState().tick(0, DROP)
    expect(useRevealStore.getState()).toMatchObject({ shown: 1, landed: 0 })

    useRevealStore.getState().tick(step * 10 + 0.001, DROP)
    const { shown, landed } = useRevealStore.getState()
    expect(shown).toBe(11)
    expect(landed).toBe(Math.floor((step * 10 + 0.001 - DROP) / step) + 1)
    expect(landed).toBeLessThan(shown)

    useRevealStore.getState().tick(REVEAL_SECONDS + DROP, DROP)
    expect(useRevealStore.getState()).toMatchObject({ shown: 40, landed: 40 })
    expect(isRevealing(useRevealStore.getState())).toBe(false)
  })

  it("doesn't let a small world crawl in", () => {
    expect(begin(3).step).toBeLessThanOrEqual(0.04)
  })

  it('never goes backwards, even if the clock does', () => {
    begin(20)
    useRevealStore.getState().tick(1, DROP)
    const before = useRevealStore.getState().shown
    useRevealStore.getState().tick(0.1, DROP)
    expect(useRevealStore.getState().shown).toBe(before)
  })

  it('lands everything at once when the player gets on with it', () => {
    begin(30)
    useRevealStore.getState().finish()
    expect(useRevealStore.getState()).toMatchObject({ shown: 30, landed: 30 })
    expect(isRevealing(useRevealStore.getState())).toBe(false)
  })

  it("has nothing to reveal on a board that was loaded or isn't a landscape", () => {
    begin(30)
    useRevealStore.getState().clear()
    expect(useRevealStore.getState().reveal).toBeNull()
    expect(isRevealing(useRevealStore.getState())).toBe(false)
    useRevealStore.getState().tick(revealNow(), DROP)
    expect(useRevealStore.getState().shown).toBe(0)
  })

  it('shows the whole landscape at once to players who prefer less motion', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
    useRevealStore.getState().begin(25)
    expect(useRevealStore.getState()).toMatchObject({ shown: 25, landed: 25 })
    expect(isRevealing(useRevealStore.getState())).toBe(false)
  })
})
