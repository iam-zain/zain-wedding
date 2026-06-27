import { useCallback, useRef, useState } from 'react'
import Toast from './Toast'
import { ToastContext } from './toast-context'

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null)
  const timer = useRef(null)

  const toast = useCallback((message, { duration = 2600 } = {}) => {
    setMsg(message)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), duration)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {msg && <Toast>{msg}</Toast>}
    </ToastContext.Provider>
  )
}
