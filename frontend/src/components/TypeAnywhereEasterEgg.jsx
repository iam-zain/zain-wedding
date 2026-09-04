import { useEffect, useState } from 'react'
import { TYPE_ANYWHERE_WORDS, TYPE_ANYWHERE_MESSAGES } from '../config'
import { playChime } from '../lib/sound'
import EasterEggModal from './EasterEggModal'

const BUFFER_MAX = 24

function isTypingIntoField() {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

/**
 * Global — mount once in Layout. Typing one of TYPE_ANYWHERE_WORDS anywhere
 * on the page (not inside a form field, so it never fights with the comment
 * box or name input) reveals a message.
 */
export default function TypeAnywhereEasterEgg() {
  const [egg, setEgg] = useState(false)

  useEffect(() => {
    let buffer = ''

    function onKeydown(e) {
      if (isTypingIntoField()) { buffer = ''; return }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Backspace') {
        buffer = buffer.slice(0, -1)
        return
      }
      if (e.key.length !== 1) return

      buffer = (buffer + e.key.toLowerCase()).slice(-BUFFER_MAX)
      const hit = TYPE_ANYWHERE_WORDS.some((w) => buffer.endsWith(w))
      if (hit) {
        buffer = ''
        setEgg(true)
        playChime()
      }
    }

    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [])

  if (!egg) return null
  return (
    <EasterEggModal
      message={TYPE_ANYWHERE_MESSAGES[Math.floor(Math.random() * TYPE_ANYWHERE_MESSAGES.length)]}
      icon="🤍"
      onClose={() => setEgg(false)}
      testId="type-anywhere-egg"
    />
  )
}
