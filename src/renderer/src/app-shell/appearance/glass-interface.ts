import { useEffect } from 'react'
import { useWindowBackdropActive } from './window-backdrop'

/** Lets glass-interface.css tint the chrome; only meaningful while a backdrop shows through. */
export function useGlassInterface(enabled: boolean, reduceEffects: boolean): void {
  const backdropActive = useWindowBackdropActive()
  const active = enabled && backdropActive && !reduceEffects

  useEffect(() => {
    const root = document.documentElement
    if (active) {
      root.dataset.glassInterface = ''
    } else {
      delete root.dataset.glassInterface
    }
  }, [active])
}
