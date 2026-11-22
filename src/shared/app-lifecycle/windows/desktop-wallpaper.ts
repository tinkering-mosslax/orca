/** How Windows lays the wallpaper over a display (Personalization > Background > fit). */
export type DesktopWallpaperFit = 'cover' | 'contain' | 'stretch' | 'center' | 'tile'

export type DesktopWallpaper = {
  /** JPEG, downscaled to the largest display so the renderer never decodes more than it paints. */
  bytes: Uint8Array
  fit: DesktopWallpaperFit
  /** Changes whenever Windows rewrites the wallpaper. */
  version: string
}

/** Window content and its display, in DIPs, so the renderer can line the wallpaper up with the desktop. */
export type WindowPlacement = {
  contentX: number
  contentY: number
  displayX: number
  displayY: number
  displayWidth: number
  displayHeight: number
}

/** `reg query "HKCU\Control Panel\Desktop"` output to the fit Windows paints with. */
export function parseDesktopWallpaperFit(regOutput: string): DesktopWallpaperFit {
  const value = (name: string): string | undefined =>
    regOutput.match(new RegExp(`^\\s*${name}\\s+REG_SZ\\s+(\\d+)`, 'mi'))?.[1]
  // WallpaperStyle: 10 Fill, 6 Fit, 2 Stretch, 22 Span, 0 Center (Tile when TileWallpaper is 1).
  switch (value('WallpaperStyle')) {
    case '0':
      return value('TileWallpaper') === '1' ? 'tile' : 'center'
    case '6':
      return 'contain'
    case '2':
      return 'stretch'
    default:
      return 'cover'
  }
}
