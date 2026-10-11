import { beforeEach, describe, expect, it } from 'vitest'
import { useViewStore } from './viewStore'

beforeEach(() => useViewStore.setState({ azimuth: 0, pivotTarget: null, pivotRequest: 0 }))

describe('queued camera sides', () => {
  it('queues four quick presses as a full turn, including across the angle wrap', () => {
    for (let i = 0; i < 4; i++) useViewStore.getState().requestSidePivot(-1)
    expect(useViewStore.getState()).toMatchObject({
      pivotTarget: -2 * Math.PI,
      pivotRequest: -2 * Math.PI,
    })
  })

  it('uses the requested destination when another press arrives during animation', () => {
    useViewStore.getState().requestSidePivot(1)
    useViewStore.setState({ azimuth: 0.4, pivotRequest: 0 })
    useViewStore.getState().requestSidePivot(1)
    expect(useViewStore.getState()).toMatchObject({
      pivotTarget: Math.PI,
      pivotRequest: Math.PI / 2,
    })
    useViewStore.setState({ azimuth: 0.7, pivotRequest: 0 })
    useViewStore.getState().requestSidePivot(-1)
    expect(useViewStore.getState()).toMatchObject({
      pivotTarget: Math.PI / 2,
      pivotRequest: -Math.PI / 2,
    })
  })

  it('cancels opposite inputs queued before a frame and starts from a free camera heading', () => {
    useViewStore.setState({ azimuth: 0.3 })
    useViewStore.getState().requestSidePivot(-1)
    expect(useViewStore.getState()).toMatchObject({ pivotTarget: 0, pivotRequest: -0.3 })
    useViewStore.getState().requestSidePivot(1)
    expect(useViewStore.getState().pivotTarget).toBe(Math.PI / 2)
    useViewStore.setState({ azimuth: 0, pivotTarget: null, pivotRequest: 0 })
    useViewStore.getState().requestSidePivot(1)
    useViewStore.getState().requestSidePivot(-1)
    expect(useViewStore.getState()).toMatchObject({ pivotTarget: 0, pivotRequest: 0 })
  })
})
