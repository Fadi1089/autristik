import { useEffect } from 'react'
import { oppositeDirection } from '../game/coords'
import { isGameOver } from '../game/game'
import { actionForCode, REPEATABLE } from '../input/bindings'
import type { Action } from '../input/bindings'
import { screenToWorldDirection } from '../input/movement'
import type { ScreenDirection } from '../input/movement'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'
import { useViewStore } from '../store/viewStore'

const ZOOM_STEP = 0.14
const MOVES: Partial<Record<Action, ScreenDirection>> = {
  moveUp: 'up',
  moveRight: 'right',
  moveDown: 'down',
  moveLeft: 'left',
}

/**
 * Global keyboard controls. Esc always toggles the menu; everything else goes
 * through the player's bindings and only applies during play.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const settings = useSettingsStore.getState()
      if (settings.capturing) return // the settings panel is listening for a new key

      const game = useGameStore.getState()
      if (e.key === 'Escape') {
        e.preventDefault()
        if (!e.repeat) game.toggleMenu()
        return
      }
      // Leave Enter, Space and friends to the menu and game-over buttons.
      if (game.menuOpen || isGameOver(game)) return

      // Match ! by its character: unshifted on AZERTY, Shift + 1 on QWERTY.
      if (e.code === 'KeyC' || e.key === '!') {
        e.preventDefault()
        if (!e.repeat) useViewStore.getState().requestRecenter()
        return
      }

      const action = actionForCode(settings.bindings, e.code)
      if (!action) return
      e.preventDefault()
      if (e.repeat && !REPEATABLE.has(action)) return

      const move = MOVES[action]
      if (move) {
        const direction = screenToWorldDirection(move, useViewStore.getState().azimuth)
        if (e.shiftKey) {
          if (!e.repeat) game.setFallDirection(oppositeDirection(direction))
        } else {
          game.move(direction)
        }
        return
      }

      const view = useViewStore.getState()
      switch (action) {
        case 'place':
          game.drop()
          break
        case 'rotateCw':
          game.rotate(1)
          break
        case 'rotateCcw':
          game.rotate(-1)
          break
        case 'pivotLeft':
          view.requestSidePivot(-1)
          break
        case 'pivotRight':
          view.requestSidePivot(1)
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
