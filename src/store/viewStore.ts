import { create } from 'zustand'

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
  readonly zoomRequest: number

  setView(view: { azimuth: number; polar: number; focusX: number; focusZ: number }): void
  /** Positive pivots the camera to the right around the board. */
  requestPivot(radians: number): void
  /** Positive zooms in; each unit is a factor of e in distance. */
  requestZoom(amount: number): void
}

/** Main camera state shared with the HUD and keyboard controls. */
export const useViewStore = create<ViewStore>()((set) => ({
  azimuth: 0,
  polar: 0.8,
  focusX: 0,
  focusZ: 0,
  pivotRequest: 0,
  zoomRequest: 0,

  setView: (view) => set(view),
  requestPivot: (radians) => set((s) => ({ pivotRequest: s.pivotRequest + radians })),
  requestZoom: (amount) => set((s) => ({ zoomRequest: s.zoomRequest + amount })),
}))
