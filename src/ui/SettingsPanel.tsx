import { useTranslation } from '../i18n/useTranslation'
import { useSettingsStore } from '../store/settingsStore'
import { Customization } from './Customization'
import { KeySettings } from './KeySettings'
import { MenuSection } from './MenuSection'

export function SettingsPanel() {
  const { t } = useTranslation()
  const clearCapture = useSettingsStore((state) => state.setCapturing)
  return (
    <div className="space-y-5">
      <MenuSection title={t('Customization')}>
        <Customization />
      </MenuSection>
      <MenuSection title={t('General')} onClose={() => clearCapture(null)}>
        <KeySettings />
      </MenuSection>
    </div>
  )
}
