import { useEffect, useRef } from 'react'
import { OFFLINE_MESSAGE, ONLINE_MESSAGE } from '../config'
import { haptic } from '../lib/haptics'
import { useToast } from './toast-context'

/**
 * Global, mount once in Layout. Announces the connection dropping, and the
 * recovery only if we actually saw it drop first (so a guest who opens the app
 * online is never told the network "came back").
 */
export default function OfflineEasterEgg() {
  const toast = useToast()
  const wasOfflineRef = useRef(false)

  useEffect(() => {
    const onOffline = () => {
      if (wasOfflineRef.current) return
      wasOfflineRef.current = true
      haptic('warn')
      toast(OFFLINE_MESSAGE, { duration: 5000 })
    }
    const onOnline = () => {
      if (!wasOfflineRef.current) return
      wasOfflineRef.current = false
      toast(ONLINE_MESSAGE, { duration: 3500 })
    }

    // navigator.onLine is only trustworthy as "definitely offline", a true
    // value can still mean a captive portal. Good enough for a greeting.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) onOffline()

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [toast])

  return null
}
