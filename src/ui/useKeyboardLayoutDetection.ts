import { useEffect } from 'react'
import { observeKeyboardLayout } from '../input/keyboardDetection'
import { useSettingsStore } from '../store/settingsStore'

export function useKeyboardLayoutDetection() {
  const manual = useSettingsStore((s) => s.keyboardLayoutManual)
  const setDetectedLayout = useSettingsStore((s) => s.setDetectedKeyboardLayout)
  useEffect(() => {
    if (manual) return
    return observeKeyboardLayout(setDetectedLayout)
  }, [manual, setDetectedLayout])
}
