import type { GlobalSettings } from '../../../../../shared/settings/global-settings-types'
import {
  selectableWindowMaterials,
  windowMaterialPreference,
  type WindowMaterial
} from '../../../../../shared/app-lifecycle/windows/window-material'
import { SettingsSwitchRow } from '../form-controls/SettingsFormControls'
import { RestartBanner, windowMaterialRestartPending } from './WindowMaterialSetting'
import { useWindowBackdropActive } from '@/app-shell/appearance/window-backdrop'
import { rendererWindowMaterialHost } from '@/app-shell/appearance/window-material-runtime'
import { isWebClientLocation } from '@/app-shell/platform/web-client-location'
import { useTranslate } from '@/i18n/use-translate'

type GlassInterfaceSettingProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

// Why wallpaper first: it shows the user's wallpaper rather than whatever window sits behind, at the lowest cost.
const PREFERRED_MATERIALS: readonly WindowMaterial[] = ['wallpaper', 'blur', 'translucent']
const GLASS_DEFAULT_OPACITY = 0.6

/** Enabling glass also supplies a backdrop when there is none, so the switch works in one step. */
function glassEnableUpdates(settings: GlobalSettings): Partial<GlobalSettings> {
  const updates: Partial<GlobalSettings> = { glassInterface: true }
  if ((settings.terminalBackgroundOpacity ?? 1) >= 1) {
    updates.terminalBackgroundOpacity = GLASS_DEFAULT_OPACITY
  }
  const host = rendererWindowMaterialHost()
  if (!isWebClientLocation() && windowMaterialPreference(settings, host.platform) === 'off') {
    const selectable = selectableWindowMaterials(host)
    const material = PREFERRED_MATERIALS.find((option) => selectable.includes(option))
    if (material) {
      updates.windowMaterial = material
    }
  }
  return updates
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
          'Sidebars, tab bars, the status bar and the editor become tinted glass. Their tint follows Background opacity.'
        )

  return (
    <>
      <SettingsSwitchRow
        label={label}
        description={description}
        checked={enabled}
        onChange={() =>
          updateSettings(enabled ? { glassInterface: false } : glassEnableUpdates(settings))
        }
      />
      {enabled && !isWebClientLocation() && windowMaterialRestartPending(settings) ? (
        <RestartBanner />
      ) : null}
    </>
  )
}
