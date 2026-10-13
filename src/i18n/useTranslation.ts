import { useSettingsStore } from '../store/settingsStore'
import { translate } from './translate'
import type { Parameters } from './translate'
import type { Message } from './messages'

/** Subscribe every translated surface to the same saved language preference. */
export function useTranslation() {
  const language = useSettingsStore((s) => s.language)
  return {
    language,
    t: (message: Message, parameters?: Parameters) => translate(language, message, parameters),
  }
}
