import type { GlobalSettings } from '../../../../../shared/settings/global-settings-types'
import { SettingsSwitchRow } from '../form-controls/SettingsFormControls'
import { useWindowBackdropActive } from '@/app-shell/appearance/window-backdrop'
import { useTranslate } from '@/i18n/use-translate'

type GlassInterfaceSettingProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

export function GlassInterfaceSetting({
  settings,
  updateSettings
}: GlassInterfaceSettingProps): React.JSX.Element {
  const t = useTranslate()
  const backdropActive = useWindowBackdropActive()
  const enabled = settings.glassInterface === true
  const label = t('settings.windowMaterial.glassInterface', 'Glass interface')
  const description =
    enabled && !backdropActive
      ? t(
          'settings.windowMaterial.glassInterfaceNeedsBackdrop',
          'Shows once a window material or theme image is active and Background opacity is below 1.'
        )
      : t(
          'settings.windowMaterial.glassInterfaceDescription',
          'Sidebars, tab bars and the status bar become tinted glass. Their tint follows Background opacity.'
        )

  return (
    <SettingsSwitchRow
      label={label}
      description={description}
      checked={enabled}
      onChange={() => updateSettings({ glassInterface: !enabled })}
    />
  )
}
