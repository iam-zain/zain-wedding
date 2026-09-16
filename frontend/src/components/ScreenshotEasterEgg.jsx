import { useEffect, useRef } from 'react'
import { SCREENSHOT_MESSAGE } from '../config'
import { useToast } from './toast-context'

/**
 * Global — mount once in Layout. Fires once per session when the guest takes
 * a screenshot with a keyboard shortcut.
 *
 * IMPORTANT, so nobody later "fixes" this into something it can't be: browsers
 * expose NO screenshot event, on any platform. Phone screenshots (iOS side+
 * volume, Android power+volume) are handled entirely by the OS and are
 * completely invisible to a web page — there is no hack that reliably catches
 * them, and the visibilitychange tricks floating around fire on notifications,
 * app switches and the share sheet, which would nag guests constantly.
 *
 * So this covers only what is genuinely observable: desktop screenshot
 * shortcuts. Mobile guests simply never see this egg, which is the correct
 * trade against false positives.
 */
export default function ScreenshotEasterEgg() {
  const toast = useToast()
  const firedRef = useRef(false)

  useEffect(() => {
    const fire = () => {
      if (firedRef.current) return
      firedRef.current = true
      toast(SCREENSHOT_MESSAGE, { duration: 5000 })
    }

    // Windows sends PrintScreen on keyup only (keydown is swallowed by the OS).
    const onKeyUp = (e) => {
      if (e.key === 'PrintScreen') fire()
    }

    const onKeyDown = (e) => {
      // macOS: Cmd+Shift+3 (full), +4 (region), +5 (capture bar).
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) fire()
      // Windows: Win+Shift+S (Snip & Sketch). The OS usually grabs this first,
      // so treat it as a bonus rather than something to rely on.
      if (e.metaKey && e.shiftKey && (e.key === 'S' || e.key === 's')) fire()
    }

    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [toast])

  return null
}
