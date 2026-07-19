import { useEffect, useState } from 'react'
import Confetti from './Confetti'

/** Shared reveal modal for easter eggs — confetti burst + message, tap-to-dismiss after a short settle period. */
export default function EasterEggModal({ message, icon = '🤍', caption, settleMs = 1200, onClose, testId = 'easter-egg-modal' }) {
  const [visible, setVisible] = useState(false)
  const [closeable, setCloseable] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const settle = setTimeout(() => setCloseable(true), settleMs)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(settle)
      document.body.style.overflow = prevOverflow
    }
  }, [settleMs])

  function close() {
    if (!closeable) return
    setVisible(false)
    setTimeout(onClose, 300)
  }

  return (
    <>
      <Confetti />
      <div
        data-testid={testId}
        className={`fixed inset-0 z-[80] flex items-center justify-center transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
        onClick={(e) => { e.stopPropagation(); close() }}
      >
        <div
          className={`relative mx-6 rounded-2xl bg-ig-elevated border border-ig-border px-6 py-8 text-center shadow-2xl transition-all duration-300 ${
            visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            data-testid={`${testId}-close`}
            onClick={close}
            className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full text-ig-muted hover:text-ig-text hover:bg-ig-border transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
          <div className="mb-3 text-4xl">{icon}</div>
          <p data-testid={`${testId}-message`} className="text-sm leading-relaxed text-ig-text">
            {message}
          </p>
          {caption && (
            <p className="mt-4 text-[10px] uppercase tracking-widest text-ig-muted">{caption}</p>
          )}
        </div>
      </div>
    </>
  )
}
