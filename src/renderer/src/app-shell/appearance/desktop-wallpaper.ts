import type {
  DesktopWallpaperFit,
  WindowPlacement
} from '../../../../shared/app-lifecycle/windows/desktop-wallpaper'
import { activeWindowMaterial } from './window-material-runtime'

const FIT_SIZE: Record<DesktopWallpaperFit, string> = {
  cover: 'cover',
  contain: 'contain',
  stretch: '100% 100%',
  center: 'auto',
  tile: 'auto'
}

/** Paints the Windows wallpaper behind the window, aligned to where the desktop would show through. */
export function installDesktopWallpaper(): void {
  if (activeWindowMaterial() !== 'wallpaper') {
    return
  }
  const app = window.api.app
  const root = document.documentElement
  let objectUrl: string | null = null
  let version: string | null = null
  let placement: WindowPlacement | null = null
  let frame = 0

  // Why translate, not background-position: moving the window then only recomposites the layer.
  const paintPlacement = (): void => {
    frame = 0
    if (!placement) {
      return
    }
    const zoom = Number.parseFloat(getComputedStyle(root).getPropertyValue('--ui-zoom-factor')) || 1
    const style = root.style
    style.setProperty('--orca-wallpaper-x', `${(placement.displayX - placement.contentX) / zoom}px`)
    style.setProperty('--orca-wallpaper-y', `${(placement.displayY - placement.contentY) / zoom}px`)
    style.setProperty('--orca-wallpaper-width', `${placement.displayWidth / zoom}px`)
    style.setProperty('--orca-wallpaper-height', `${placement.displayHeight / zoom}px`)
  }
  const schedulePlacement = (): void => {
    frame ||= requestAnimationFrame(paintPlacement)
  }
  const setPlacement = (next: WindowPlacement | null): void => {
    if (next) {
      placement = next
      schedulePlacement()
    }
  }

  const refreshWallpaper = async (): Promise<void> => {
    const wallpaper = await app.getDesktopWallpaper().catch(() => null)
    if (!wallpaper || wallpaper.version === version) {
      return
    }
    version = wallpaper.version
    const previousUrl = objectUrl
    objectUrl = URL.createObjectURL(new Blob([wallpaper.bytes.slice()], { type: 'image/jpeg' }))
    root.style.setProperty('--orca-wallpaper-image', `url("${objectUrl}")`)
    root.style.setProperty('--orca-wallpaper-size', FIT_SIZE[wallpaper.fit])
    root.style.setProperty(
      '--orca-wallpaper-repeat',
      wallpaper.fit === 'tile' ? 'repeat' : 'no-repeat'
    )
    root.dataset.desktopWallpaper = ''
    if (previousUrl) {
      URL.revokeObjectURL(previousUrl)
    }
  }

  app.onWindowPlacementChanged(setPlacement)
  void app.getWindowPlacement().then(setPlacement, () => undefined)
  void refreshWallpaper()
  // Zoom changes CSS pixels per DIP; focus is when a wallpaper changed in Settings would be noticed.
  window.addEventListener('resize', schedulePlacement)
  window.addEventListener('focus', () => void refreshWallpaper())
}
