import { FRENCH } from './messages'
import type { Message } from './messages'
import type { Language } from './language'

export type Parameters = Readonly<Record<string, string | number>>

/** Replace named parameters after selecting the language, preserving keyboard labels. */
export function translate(
  language: Language,
  message: Message,
  parameters: Parameters = {},
): string {
  const template = language === 'fr' ? FRENCH[message] : message
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    parameters[name] === undefined ? placeholder : String(parameters[name]),
  )
}
