import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'

const harness = vi.hoisted(() => ({
  camera: null as unknown as PerspectiveCamera,
  controls: null as unknown as {
    target: Vector3
    enableDamping: boolean
    reset: () => void
    update: () => void
    getAzimuthalAngle: () => number
  },
  frame: null as unknown as (state: object, seconds: number) => void,
  cleanup: [] as (() => void)[],
}))
vi.mock('@react-three/drei', () => ({ MapControls: () => null }))
vi.mock('@react-three/fiber', () => ({
  useThree: (select: (state: { camera: PerspectiveCamera }) => unknown) =>
    select({ camera: harness.camera }),
  useFrame: (frame: typeof harness.frame) => {
    harness.frame = frame
  },
}))
vi.mock('react', () => ({
  useCallback: (callback: unknown) => callback,
  useRef: (value: unknown) => ({ current: value === null ? harness.controls : value }),
  useEffect: (effect: () => (() => void) | void) => {
    const cleanup = effect()
    if (cleanup) harness.cleanup.push(cleanup)
  },
}))

const listeners = new Map<string, (event: KeyboardEvent) => void>()
function press(code: string, type = 'keydown') {
  const event = {
    code,
    key: code,
    target: null,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent
  listeners.get(type)!(event)
  return event
}

beforeEach(async () => {
  listeners.clear()
  const events = {
    addEventListener: (type: string, listener: (event: KeyboardEvent) => void) =>
      listeners.set(type, listener),
    removeEventListener: (type: string) => listeners.delete(type),
  }
  vi.stubGlobal('window', events)
  vi.stubGlobal('document', events)
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() })
  harness.camera = new PerspectiveCamera(45, 16 / 9, 0.1, 512)
  harness.camera.position.set(0, 14, 14)
  const target = new Vector3()
  harness.controls = {
    target,
    enableDamping: true,
    reset: () => {
      target.set(0, 0, 0)
      harness.camera.position.set(0, 14, 14)
    },
    update: () => harness.camera.lookAt(target),
    getAzimuthalAngle: () =>
      Math.atan2(harness.camera.position.x - target.x, harness.camera.position.z - target.z),
  }
  const { useSettingsStore } = await import('../store/settingsStore')
  useSettingsStore.getState().resetBindings()
  const { ExplorationCamera } = await import('./ExplorationCamera')
  ExplorationCamera({ resetToken: 0, onCentreChange: vi.fn() })
})
afterEach(() => {
  while (harness.cleanup.length) harness.cleanup.pop()!()
  vi.unstubAllGlobals()
})

describe('independent exploration controls', () => {
  it('continues panning far beyond the old board and stops on key release or window blur', () => {
    harness.controls.target.set(10000, 0, -10000)
    harness.camera.position.set(10000, 14, -9986)
    const offset = harness.camera.position.clone().sub(harness.controls.target)
    press('ArrowRight')
    harness.frame({}, 1 / 60)
    expect(harness.controls.target.x).toBeGreaterThan(10000)
    expect(
      harness.camera.position.clone().sub(harness.controls.target).distanceTo(offset),
    ).toBeLessThan(1e-8)
    press('ArrowRight', 'keyup')
    const stopped = harness.controls.target.clone()
    harness.frame({}, 1 / 60)
    expect(harness.controls.target).toEqual(stopped)
    press('ArrowDown')
    listeners.get('blur')!({} as KeyboardEvent)
    harness.frame({}, 1 / 60)
    expect(harness.controls.target).toEqual(stopped)
  })
  it('recentres explicitly, supports saved bindings and does not interpret placement as gameplay', async () => {
    const { useSettingsStore } = await import('../store/settingsStore')
    useSettingsStore.getState().bind('moveRight', 1, 'KeyJ')
    press('KeyJ')
    harness.frame({}, 1 / 60)
    expect(harness.controls.target.x).toBeGreaterThan(0)
    press('KeyC')
    expect(harness.controls.target).toEqual(new Vector3())
    harness.frame({}, 1 / 60)
    expect(harness.controls.target).toEqual(new Vector3())
    expect(press('Space').preventDefault).not.toHaveBeenCalled()
  })
})
