const NAMED: Readonly<Record<string, string>> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Space: 'Space',
  Enter: 'Enter',
  NumpadEnter: 'Num Enter',
  Equal: '=',
  Minus: '-',
  NumpadAdd: 'Num +',
  NumpadSubtract: 'Num −',
  NumpadMultiply: 'Num *',
  NumpadDivide: 'Num /',
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Backquote: '`',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  ShiftLeft: 'Shift',
  ShiftRight: 'Right Shift',
  ControlLeft: 'Ctrl',
  ControlRight: 'Right Ctrl',
  AltLeft: 'Alt',
  AltRight: 'Right Alt',
  CapsLock: 'Caps Lock',
  PageUp: 'Page Up',
  PageDown: 'Page Down',
  Home: 'Home',
  End: 'End',
  Insert: 'Insert',
}

/** Physical-key code → printed key, from the browser's Keyboard API when it has one. */
export type LayoutMap = Readonly<Record<string, string>>

/**
 * Human label for a KeyboardEvent.code. With a layout map (Chromium) letter keys show
 * what is printed on the player's keyboard, e.g. "Z" for KeyW on AZERTY.
 */
export function keyLabel(code: string, layout: LayoutMap | null = null): string {
  const printed = layout?.[code]
  if (printed && printed.trim() && /^(Key|Digit)/.test(code)) return printed.toUpperCase()
  const named = NAMED[code]
  if (named) return named
  const letter = /^Key([A-Z])$/.exec(code)
  if (letter?.[1]) return letter[1]
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(code)
  if (digit?.[1]) return code.startsWith('Numpad') ? `Num ${digit[1]}` : digit[1]
  const fn = /^F(\d{1,2})$/.exec(code)
  if (fn) return code
  return code
}

/** Loads the keyboard layout map where the Keyboard API exists; resolves null elsewhere. */
export async function loadLayoutMap(): Promise<LayoutMap | null> {
  const keyboard = (
    navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }
  ).keyboard
  if (!keyboard?.getLayoutMap) return null
  try {
    return Object.fromEntries(await keyboard.getLayoutMap())
  } catch {
    return null
  }
}
