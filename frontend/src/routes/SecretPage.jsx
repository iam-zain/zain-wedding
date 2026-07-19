import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { playChime } from '../lib/sound'

/** Hidden route — no link in the app points here. Find it, and it's yours. */
export default function SecretPage() {
  useEffect(() => {
    playChime()
  }, [])

  return (
    <div data-testid="secret-page" className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-4xl">🕵️‍♀️</p>
      <p className="mt-3 text-base font-semibold">Psst… you found the secret corner!</p>
      <p className="mt-1 text-sm text-ig-muted">Nobody comes here. Just us and this message 🤍</p>
      <Link to="/" data-testid="secret-page-back" className="mt-6 text-sm font-semibold text-ig-blue">
        ← Back to the feed
      </Link>
    </div>
  )
}
