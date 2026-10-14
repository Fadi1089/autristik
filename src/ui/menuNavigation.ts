import type { KeyboardEvent } from 'react'
import { actionForCode } from '../input/bindings'
import type { Bindings } from '../input/bindings'

function panelOptions(panel: HTMLElement): HTMLElement[] {
  return Array.from(
    panel.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), summary'),
  ).filter((option) => {
    for (
      let parent = option.parentElement;
      parent && parent !== panel;
      parent = parent.parentElement
    ) {
      if (
        parent.matches('details:not([open])') &&
        parent.querySelector(':scope > summary') !== option
      )
        return false
    }
    return true
  })
}

/** Main entries form a vertical list; secondary controls and panels sit to their right. */
export function navigateMenu(event: KeyboardEvent<HTMLDivElement>, bindings: Bindings): void {
  const action = actionForCode(bindings, event.code)
  const up = event.code === 'ArrowUp' || action === 'moveUp'
  const down = event.code === 'ArrowDown' || action === 'moveDown'
  const left = event.code === 'ArrowLeft' || action === 'moveLeft'
  const right = event.code === 'ArrowRight' || action === 'moveRight'
  if (!up && !down && !left && !right) return
  if (event.target instanceof HTMLInputElement) return
  const root = event.currentTarget
  const focused = document.activeElement as HTMLElement | null
  let destination: HTMLElement | null | undefined

  if (event.target instanceof HTMLSelectElement) {
    const secondary = event.target.closest<HTMLElement>('[data-menu-secondary]')
    const panel = event.target.closest<HTMLElement>('[data-menu-panel]')
    if (!left || (!secondary && !panel)) return // Up/down adjust explicitly focused controls.
    const owner = secondary?.dataset.menuSecondary ?? panel?.dataset.menuPanel
    destination = root.querySelector<HTMLElement>(`[data-menu-item="${owner}"]`)
  } else {
    const main = focused?.closest<HTMLElement>('[data-menu-item]')
    const panel = focused?.closest<HTMLElement>('[data-menu-panel]')
    if (main || !panel) {
      const entries = Array.from(root.querySelectorAll<HTMLElement>('[data-menu-item]'))
      if (up || down) {
        if (!entries.length) return
        const index = main ? entries.indexOf(main) : -1
        const next =
          index < 0
            ? up
              ? entries.length - 1
              : 0
            : (index + (up ? -1 : 1) + entries.length) % entries.length
        destination = entries[next]
      } else if (right && main) {
        const secondary =
          root.querySelector<HTMLElement>(`[data-menu-secondary="${main.dataset.menuItem}"]`) ??
          (main.dataset.menuItem === 'start'
            ? root.querySelector<HTMLElement>('[data-menu-secondary]')
            : null)
        destination = secondary?.querySelector<HTMLElement>('select:not(:disabled)')
        if (!destination && main.getAttribute('aria-pressed') === 'true') {
          const activePanel = root.querySelector<HTMLElement>('[data-menu-panel]')
          destination = activePanel ? panelOptions(activePanel)[0] : null
        }
      }
    } else if (left) {
      destination = root.querySelector<HTMLElement>(`[data-menu-item="${panel.dataset.menuPanel}"]`)
    } else if (up || down) {
      const options = panelOptions(panel)
      const index = focused ? options.indexOf(focused) : -1
      if (options.length)
        destination = options[(index + (up ? -1 : 1) + options.length) % options.length]
    }
  }
  if (!destination) return
  destination.focus()
  event.preventDefault()
  event.stopPropagation()
}
