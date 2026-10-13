import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KeyboardEvent } from 'react'
import { DEFAULT_BINDINGS } from '../input/bindings'
import { navigateMenu } from './menuNavigation'

const page = { activeElement: null as NodeLike | null }
class NodeLike {
  readonly tag: string
  dataset: Record<string, string> = {}
  children: NodeLike[] = []
  parent: NodeLike | null = null
  pressed = false
  constructor(tag = 'div') {
    this.tag = tag
  }
  add(child: NodeLike) {
    child.parent = this
    this.children.push(child)
    return child
  }
  focus() {
    page.activeElement = this
  }
  getAttribute(name: string) {
    return name === 'aria-pressed' ? String(this.pressed) : null
  }
  matches(selector: string): boolean {
    return selector.split(',').some((value) => {
      const part = value.trim()
      const attribute = part.match(/^\[data-menu-(item|secondary|panel)(?:="([^"]+)")?\]$/)
      if (attribute) {
        const key = `menu${attribute[1]![0]!.toUpperCase()}${attribute[1]!.slice(1)}`
        return (
          this.dataset[key] !== undefined && (!attribute[2] || this.dataset[key] === attribute[2])
        )
      }
      return part.replace(':not(:disabled)', '') === this.tag
    })
  }
  closest(selector: string): NodeLike | null {
    return this.matches(selector) ? this : (this.parent?.closest(selector) ?? null)
  }
  querySelectorAll(selector: string): NodeLike[] {
    return this.children.flatMap((child) => [
      ...(child.matches(selector) ? [child] : []),
      ...child.querySelectorAll(selector),
    ])
  }
  querySelector(selector: string): NodeLike | null {
    return this.querySelectorAll(selector)[0] ?? null
  }
}
class Select extends NodeLike {
  constructor() {
    super('select')
  }
}
class Input extends NodeLike {
  constructor() {
    super('input')
  }
}

function menu() {
  const root = new NodeLike()
  const start = root.add(new NodeLike('button'))
  start.dataset.menuItem = 'start'
  const secondary = root.add(new NodeLike())
  secondary.dataset.menuSecondary = 'start'
  const difficulty = secondary.add(new Select())
  const options = ['mode', 'how', 'customization', 'settings'].map((id) => {
    const node = root.add(new NodeLike('button'))
    node.dataset.menuItem = id
    return node
  })
  return { root, start, difficulty, options }
}

function press(root: NodeLike, code: string) {
  const event = {
    code,
    currentTarget: root,
    target: page.activeElement,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  }
  navigateMenu(event as unknown as KeyboardEvent<HTMLDivElement>, DEFAULT_BINDINGS)
  return event
}
beforeEach(() => {
  page.activeElement = null
  vi.stubGlobal('document', page)
  vi.stubGlobal('HTMLSelectElement', Select)
  vi.stubGlobal('HTMLInputElement', Input)
})
afterEach(() => vi.unstubAllGlobals())

describe('two-axis menu navigation', () => {
  it.each(['ArrowDown', 'KeyS'])(
    'skips difficulty with %s and wraps only through the large menu entries',
    (code) => {
      const { root, start, options } = menu()
      start.focus()
      for (const option of options) {
        press(root, code)
        expect(page.activeElement).toBe(option)
      }
      press(root, code)
      expect(page.activeElement).toBe(start)
      press(root, 'ArrowUp')
      expect(page.activeElement).toBe(options.at(-1))
    },
  )
  it.each([
    ['ArrowRight', 'ArrowLeft'],
    ['KeyD', 'KeyA'],
  ])('enters difficulty with %s and exits with %s', (right, left) => {
    const { root, start, difficulty } = menu()
    start.focus()
    expect(press(root, right).preventDefault).toHaveBeenCalled()
    expect(page.activeElement).toBe(difficulty)
    expect(press(root, 'ArrowDown').preventDefault).not.toHaveBeenCalled()
    expect(page.activeElement).toBe(difficulty)
    press(root, left)
    expect(page.activeElement).toBe(start)
  })
  it('enters an open panel to the right and returns to its main entry with left', () => {
    const { root, options } = menu()
    const how = options[1]!
    how.pressed = true
    const panel = root.add(new NodeLike())
    panel.dataset.menuPanel = 'how'
    const rules = panel.add(new NodeLike('summary'))
    const controls = panel.add(new NodeLike('summary'))
    how.focus()
    press(root, 'ArrowRight')
    expect(page.activeElement).toBe(rules)
    press(root, 'ArrowDown')
    expect(page.activeElement).toBe(controls)
    press(root, 'ArrowLeft')
    expect(page.activeElement).toBe(how)
  })
  it('lets audio sliders handle their own arrow keys', () => {
    const { root } = menu()
    root.add(new Input()).focus()
    expect(press(root, 'ArrowLeft').preventDefault).not.toHaveBeenCalled()
  })
})
