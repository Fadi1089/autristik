/**
 * Keyboard bindings. Keys are stored as KeyboardEvent.code values (physical key
 * positions), so WASD sits under the same fingers on QWERTY and AZERTY alike.
 */
export const ACTIONS = [
  'moveUp',
  'moveDown',
  'moveLeft',
  'moveRight',
  'place',
  'rotateCw',
  'rotateCcw',
  'pivotLeft',
  'pivotRight',
  'zoomIn',
  'zoomOut',
] as const
export type Action = (typeof ACTIONS)[number]

/** Each action takes up to two keys. */
export type KeySlot = 0 | 1
export type KeySlots = readonly [string | null, string | null]
export type Bindings = Readonly<Record<Action, KeySlots>>

export const DEFAULT_BINDINGS: Bindings = {
  moveUp: ['ArrowUp', 'KeyW'],
  moveDown: ['ArrowDown', 'KeyS'],
  moveLeft: ['ArrowLeft', 'KeyA'],
  moveRight: ['ArrowRight', 'KeyD'],
  place: ['Enter', 'Space'],
  rotateCw: ['KeyR', 'KeyE'],
  rotateCcw: ['KeyQ', null],
  pivotLeft: ['KeyZ', null],
  pivotRight: ['KeyX', null],
  zoomIn: ['Equal', 'NumpadAdd'],
  zoomOut: ['Minus', 'NumpadSubtract'],
}

export const ACTION_LABELS: Readonly<Record<Action, string>> = {
  moveUp: 'Move up',
  moveDown: 'Move down',
  moveLeft: 'Move left',
  moveRight: 'Move right',
  place: 'Place tile',
  rotateCw: 'Rotate clockwise',
  rotateCcw: 'Rotate anticlockwise',
  pivotLeft: 'Pivot left',
  pivotRight: 'Pivot right',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
}

/** Actions that keep firing while their key is held down. */
export const REPEATABLE: ReadonlySet<Action> = new Set<Action>([
  'moveUp',
  'moveDown',
  'moveLeft',
  'moveRight',
  'pivotLeft',
  'pivotRight',
  'zoomIn',
  'zoomOut',
])

/** Escape always opens the menu, so it can't be bound elsewhere and lock the player out. */
export const RESERVED_CODES: ReadonlySet<string> = new Set(['Escape'])

export function actionForCode(bindings: Bindings, code: string): Action | null {
  for (const action of ACTIONS) {
    if (bindings[action].includes(code)) return action
  }
  return null
}

/** Binds `code` to one slot of `action`, taking it away from wherever it was bound before. */
export function withBinding(
  bindings: Bindings,
  action: Action,
  slot: KeySlot,
  code: string,
): Bindings {
  if (RESERVED_CODES.has(code)) return bindings
  const next = { ...bindings }
  for (const a of ACTIONS) {
    const [first, second] = next[a]
    next[a] = [first === code ? null : first, second === code ? null : second]
  }
  const slots: [string | null, string | null] = [...next[action]]
  slots[slot] = code
  next[action] = slots
  return next
}

export function withoutBinding(bindings: Bindings, action: Action, slot: KeySlot): Bindings {
  const slots: [string | null, string | null] = [...bindings[action]]
  slots[slot] = null
  return { ...bindings, [action]: slots }
}

/** Reads bindings back from storage, falling back to defaults for anything missing or malformed. */
export function normalizeBindings(stored: unknown): Bindings {
  const next: Record<Action, KeySlots> = { ...DEFAULT_BINDINGS }
  if (typeof stored !== 'object' || stored === null) return next
  const record = stored as Record<string, unknown>
  for (const action of ACTIONS) {
    const value = record[action]
    if (!Array.isArray(value) || value.length !== 2) continue
    const [a, b] = value as unknown[]
    const valid = (v: unknown) => (typeof v === 'string' && !RESERVED_CODES.has(v)) || v === null
    if (valid(a) && valid(b)) next[action] = [a as string | null, b as string | null]
  }
  return next
}
