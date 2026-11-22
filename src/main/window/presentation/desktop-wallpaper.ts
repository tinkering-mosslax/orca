import { app, nativeImage, screen, type BrowserWindow, type NativeImage } from 'electron'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { runProcess } from '@orca/process-host'
import { windowsSystem32Binary } from '@orca/process-host/windows-system-binary'
import {
  parseDesktopWallpaperFit,
  type DesktopWallpaper,
  type DesktopWallpaperFit,
  type WindowPlacement
} from '../../../shared/app-lifecycle/windows/desktop-wallpaper'

const REG_QUERY_TIMEOUT_MS = 5_000
const JPEG_QUALITY = 88

// Windows keeps the active wallpaper here as a decoded copy, whatever the source file or format.
function transcodedWallpaperPath(): string {
  return join(app.getPath('appData'), 'Microsoft', 'Windows', 'Themes', 'TranscodedWallpaper')
}

async function readWallpaperFit(): Promise<DesktopWallpaperFit> {
  try {
    const result = await runProcess({
      program: windowsSystem32Binary('reg.exe'),
      args: ['query', 'HKCU\\Control Panel\\Desktop'],
      timeoutMs: REG_QUERY_TIMEOUT_MS
    })
    return result.code === 0 ? parseDesktopWallpaperFit(result.stdout) : 'cover'
  } catch {
    return 'cover'
  }
}

/** Shrinks to the largest display in physical pixels; a 6K photo would otherwise sit decoded in GPU memory. */
function fitToDisplays(image: NativeImage): NativeImage {
  const { width, height } = image.getSize()
  let maxWidth = 0
  let maxHeight = 0
  for (const display of screen.getAllDisplays()) {
    maxWidth = Math.max(maxWidth, Math.round(display.bounds.width * display.scaleFactor))
    maxHeight = Math.max(maxHeight, Math.round(display.bounds.height * display.scaleFactor))
  }
  // Cover-scale so Fill never upsamples a downscaled copy.
  const scale = Math.max(maxWidth / width, maxHeight / height)
  if (!(scale > 0) || scale >= 1) {
    return image
  }
  return image.resize({
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    quality: 'good'
  })
}

let cached: { mtimeMs: number; wallpaper: DesktopWallpaper } | null = null
let inFlight: Promise<DesktopWallpaper | null> | null = null

async function loadDesktopWallpaper(): Promise<DesktopWallpaper | null> {
  const path = transcodedWallpaperPath()
  let mtimeMs: number
  try {
    mtimeMs = (await stat(path)).mtimeMs
  } catch {
    return null
  }
  if (cached?.mtimeMs === mtimeMs) {
    return cached.wallpaper
  }
  const [bytes, fit] = await Promise.all([readFile(path), readWallpaperFit()])
  const image = nativeImage.createFromBuffer(bytes)
  if (image.isEmpty()) {
    return null
  }
  const jpeg = fitToDisplays(image).toJPEG(JPEG_QUALITY)
  const wallpaper: DesktopWallpaper = {
    bytes: new Uint8Array(jpeg.buffer, jpeg.byteOffset, jpeg.byteLength),
    fit,
    version: String(mtimeMs)
  }
  cached = { mtimeMs, wallpaper }
  return wallpaper
}

/** Windows only; the cached copy is reused until Windows rewrites the wallpaper. */
export function readDesktopWallpaper(): Promise<DesktopWallpaper | null> {
  if (process.platform !== 'win32') {
    return Promise.resolve(null)
  }
  inFlight ??= loadDesktopWallpaper()
    .catch(() => null)
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

export function readWindowPlacement(window: BrowserWindow): WindowPlacement {
  const content = window.getContentBounds()
  const display = screen.getDisplayMatching(content).bounds
  return {
    contentX: content.x,
    contentY: content.y,
    displayX: display.x,
    displayY: display.y,
    displayWidth: display.width,
    displayHeight: display.height
  }
}

const PLACEMENT_EVENTS = [
  'move',
  'resize',
  'maximize',
  'unmaximize',
  'restore',
  'enter-full-screen',
  'leave-full-screen'
] as const

/** Pushes placement changes, coalesced to one send per turn so a drag cannot flood IPC. */
export function installWindowPlacementRelay(window: BrowserWindow): void {
  let scheduled = false
  const send = (): void => {
    scheduled = false
    if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
      window.webContents.send('app:windowPlacementChanged', readWindowPlacement(window))
    }
  }
  const schedule = (): void => {
    if (!scheduled) {
      scheduled = true
      setImmediate(send)
    }
  }
  for (const event of PLACEMENT_EVENTS) {
    window.on(event as 'move', schedule)
  }
  screen.on('display-metrics-changed', schedule)
  screen.on('display-added', schedule)
  screen.on('display-removed', schedule)
  window.once('closed', () => {
    screen.off('display-metrics-changed', schedule)
    screen.off('display-added', schedule)
    screen.off('display-removed', schedule)
  })
}
