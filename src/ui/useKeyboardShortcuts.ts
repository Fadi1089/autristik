import { useEffect } from 'react'
import { currentAnchors, isGameOver } from '../game/game'
import { nearest, nearestCandidate } from '../game/matching'
import { actionForCode, REPEATABLE } from '../input/bindings'
import type { Action } from '../input/bindings'
import { keyCodeForLayout } from '../input/keyLabels'
import { screenToWorldDirection } from '../input/movement'
import type { ScreenDirection } from '../input/movement'
import { worldToCoord } from '../scene/layout'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'
import { CAMERA_PIVOT_STEP, useViewStore } from '../store/viewStore'

const MOVES: Partial<Record<Action, ScreenDirection>> = {
  moveUp: 'up',
  moveDown: 'down',
  moveLeft: 'left',
  moveRight: 'right',
}

const ZOOM_STEP = 0.14

/**
 * Global keyboard controls. Esc always toggles the menu; everything else goes
 * through the player's bindings and only applies during play.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return
      const settings = useSettingsStore.getState()
      if (settings.capturing) return // the settings panel is listening for a new key

      const game = useGameStore.getState()
      if (e.key === 'Escape') {
        e.preventDefault()
        if (!e.repeat) game.toggleMenu()
        return
      }
      // Leave Enter, Space and friends to the menu buttons.
      if (game.menuOpen || isGameOver()) return

      const action = actionForCode(settings.bindings, keyCodeForLayout(e, settings.layout))
      if (!action) return
      e.preventDefault()
      if (e.repeat && !REPEATABLE.has(action)) return

      const move = MOVES[action]
      if (move) {
        const view = useViewStore.getState()
        if (!game.cursor) {
          // Take over from wherever the mouse left the ghost and move it at once; with no
          // ghost yet, the first press drops it where the piece fits nearest the view's centre.
          if (game.hover) game.setCursor(game.hover)
          else {
            const centre = worldToCoord(view.focusX, view.focusZ)
            const start =
              nearest(currentAnchors(game), centre) ?? nearestCandidate(game.board, centre)
            if (start) game.setCursor(start)
            return
          }
        }
        game.moveCursor(screenToWorldDirection(move, view.azimuth))
        return
      }

      const view = useViewStore.getState()
      switch (action) {
        case 'place':
          game.placeAtHover()
          break
        case 'rotateCw':
          game.rotate(1)
          break
        case 'rotateCcw':
          game.rotate(-1)
          break
        case 'pivotLeft':
          view.requestPivot(-CAMERA_PIVOT_STEP)
          break
        case 'pivotRight':
          view.requestPivot(CAMERA_PIVOT_STEP)
          break
        case 'zoomIn':
          view.requestZoom(ZOOM_STEP)
          break
        case 'zoomOut':
          view.requestZoom(-ZOOM_STEP)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
