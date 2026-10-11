import { create } from 'zustand'
import { nextCameraSide } from '../input/camera'

interface ViewStore {
  /**
   * Camera heading around the board in radians. 0 means the camera sits south of its
   * target looking north; the angle grows as it circles towards the east.
   */
  readonly azimuth: number
  /** Angle between straight down and the camera's line of sight, in radians. */
  readonly polar: number
  /** World point the camera is looking at, on the ground plane. */
  readonly focusX: number
  readonly focusZ: number
  /** Camera moves requested from the keyboard, consumed by the camera rig each frame. */
  readonly pivotRequest: number
  /** Final grid-aligned heading, retained while the camera animates to it. */
  readonly pivotTarget: number | null
  readonly zoomRequest: number
  readonly recenterRequest: number

  setView(view: { azimuth: number; polar: number; focusX: number; focusZ: number }): void
  /** Positive pivots the camera to the right around the board. */
  requestPivot(radians: number): void
  requestSidePivot(turns: -1 | 1): void
  /** Positive zooms in; each unit is a factor of e in distance. */
  requestZoom(amount: number): void
  requestRecenter(): void
}

/** Main camera state shared with the HUD and keyboard controls. */
export const useViewStore = create<ViewStore>()((set) => ({
  azimuth: 0,
  polar: 0.8,
  focusX: 0,
  focusZ: 0,
  pivotRequest: 0,
  pivotTarget: null,
  zoomRequest: 0,
  recenterRequest: 0,

  setView: (view) => set(view),
  requestPivot: (radians) =>
    set((s) => ({ pivotRequest: s.pivotRequest + radians, pivotTarget: null })),
  requestSidePivot: (turns) =>
    set((s) => {
      const from = s.pivotTarget ?? s.azimuth
      const pivotTarget = nextCameraSide(from, turns)
      return { pivotTarget, pivotRequest: s.pivotRequest + pivotTarget - from }
    }),
  requestZoom: (amount) => set((s) => ({ zoomRequest: s.zoomRequest + amount })),
  requestRecenter: () => set((s) => ({ recenterRequest: s.recenterRequest + 1 })),
}))
