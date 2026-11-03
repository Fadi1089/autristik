import { events } from '@react-three/fiber'
import { devicePointer } from './layout'

/**
 * React Three Fiber's pointer events, with the pointer measured from the canvas's place on
 * screen. The default measures from whatever element the event landed on, so any label over
 * the canvas that catches the pointer would aim the ray at the wrong square.
 */
export function canvasEvents(store: Parameters<typeof events>[0]): ReturnType<typeof events> {
  return {
    ...events(store),
    compute(event, state) {
      const rect = state.gl.domElement.getBoundingClientRect()
      state.pointer.set(...devicePointer(event.clientX, event.clientY, rect))
      state.raycaster.setFromCamera(state.pointer, state.camera)
    },
  }
}
