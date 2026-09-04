import { useRef, useState } from 'react'
import { getUserId } from '../lib/storage'
import { formatEventDate } from '../lib/time'
import { useToast } from '../components/toast-context'

const RSVP_KEY = 'rsvp_submission'

function readSubmission() {
  try {
    return JSON.parse(localStorage.getItem(RSVP_KEY) || 'null')
  } catch {
    return null
  }
}

export default function RSVPPage() {
  const toast = useToast()
  const [submitted, setSubmitted] = useState(readSubmission)
  const [name, setName] = useState(submitted?.name || '')
  const [arrival, setArrival] = useState(submitted?.arrival || '')
  const [departure, setDeparture] = useState(submitted?.departure || '')
  const arrivalInputRef = useRef(null)
  const departureInputRef = useRef(null)

  function onSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      toast('Naam toh likho 🙂')
      return
    }
    if (!arrival || !departure) {
      toast('Arrival aur departure dono bharo')
      return
    }

    const entry = {
      name: name.trim(),
      arrival,
      departure,
      userId: getUserId(),
      submittedAt: new Date().toISOString(),
    }
    try {
      localStorage.setItem(RSVP_KEY, JSON.stringify(entry))
    } catch {
      // quota / private mode — the in-memory state below still confirms it for this visit
    }
    setSubmitted(entry)
    toast('🎉 Shukriya! Confirmation mil gaya.')
  }

  function onEdit() {
    setSubmitted(null)
  }

  return (
    <div data-testid="rsvp-page">
      <header className="sticky top-0 z-20 border-b border-ig-border bg-ig-black/90 backdrop-blur">
        <div className="flex h-12 items-center justify-center px-4">
          <span className="font-logo text-2xl leading-none">Confirmation</span>
        </div>
      </header>

      <div className="px-4 pt-5">
        <h2 className="text-lg font-semibold">Aana confirm karo 🎊</h2>
        <p className="mt-0.5 text-sm text-ig-muted">
          Apna naam aur aane-jaane ka andaza time bata do, taaki hum taiyari kar sakein.
        </p>
      </div>

      {submitted ? (
        <div className="px-4 pt-5">
          <div data-testid="rsvp-confirmed" className="rounded-xl border border-ig-border bg-ig-elevated p-4">
            <p className="text-sm text-ig-muted">Confirmed as</p>
            <p data-testid="rsvp-confirmed-name" className="mt-1 text-base font-semibold">{submitted.name}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-ig-muted">Arrival</p>
                <p className="font-medium">{formatEventDate(submitted.arrival)}</p>
              </div>
              <div>
                <p className="text-ig-muted">Departure</p>
                <p className="font-medium">{formatEventDate(submitted.departure)}</p>
              </div>
            </div>
            <button
              type="button"
              data-testid="rsvp-edit"
              onClick={onEdit}
              className="mt-4 w-full rounded-lg bg-ig-card py-2 text-sm font-semibold active:opacity-90"
            >
              Edit
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4 px-4 pt-5">
          <div>
            <label htmlFor="rsvp-name" className="mb-1 block text-xs text-ig-muted">Naam</label>
            <input
              id="rsvp-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              data-testid="rsvp-name-input"
              className="w-full rounded-xl border border-ig-border bg-ig-card px-3 py-2.5 text-sm text-ig-text placeholder:text-ig-faint outline-none focus:border-ig-muted"
            />
          </div>
          <div>
            <label htmlFor="rsvp-arrival" className="mb-1 block text-xs text-ig-muted">Arrival date &amp; time (24hr)</label>
            <div className="flex gap-2">
              <input
                ref={arrivalInputRef}
                id="rsvp-arrival"
                type="datetime-local"
                value={arrival}
                onChange={(e) => setArrival(e.target.value)}
                data-testid="rsvp-arrival-input"
                className="w-full min-w-0 flex-1 rounded-xl border border-ig-border bg-ig-card px-3 py-2.5 text-sm text-ig-text outline-none focus:border-ig-muted [color-scheme:dark]"
              />
              <button
                type="button"
                data-testid="rsvp-arrival-done"
                onClick={() => arrivalInputRef.current?.blur()}
                className="shrink-0 rounded-xl bg-ig-card px-3 py-2.5 text-sm font-semibold text-ig-blue active:opacity-90"
              >
                OK
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="rsvp-departure" className="mb-1 block text-xs text-ig-muted">Departure date &amp; time (24hr)</label>
            <div className="flex gap-2">
              <input
                ref={departureInputRef}
                id="rsvp-departure"
                type="datetime-local"
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
                data-testid="rsvp-departure-input"
                className="w-full min-w-0 flex-1 rounded-xl border border-ig-border bg-ig-card px-3 py-2.5 text-sm text-ig-text outline-none focus:border-ig-muted [color-scheme:dark]"
              />
              <button
                type="button"
                data-testid="rsvp-departure-done"
                onClick={() => departureInputRef.current?.blur()}
                className="shrink-0 rounded-xl bg-ig-card px-3 py-2.5 text-sm font-semibold text-ig-blue active:opacity-90"
              >
                OK
              </button>
            </div>
          </div>
          <button
            type="submit"
            data-testid="rsvp-submit"
            className="w-full rounded-lg bg-ig-blue py-2.5 text-sm font-semibold text-white active:opacity-90"
          >
            Confirm
          </button>
        </form>
      )}
    </div>
  )
}
