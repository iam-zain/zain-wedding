import { siteConfig } from '../config'
import { formatEventDate } from '../lib/time'
import { ExternalLinkIcon } from '../components/icons'

const DRESSCODE_PLACEHOLDER = '/assets/dresscode/placeholder.svg'

const byDateAsc = (a, b) => Date.parse(a.date) - Date.parse(b.date)

function EventCard({ ev, last }) {
  return (
    <div data-testid={`event-card-${ev.id}`} className="relative flex gap-4">
      {/* Timeline rail */}
      <div className="flex flex-col items-center">
        <div className="z-10 flex h-11 w-11 items-center justify-center rounded-full bg-ig-card text-xl ring-2 ring-ig-border">
          <span aria-hidden="true">{ev.emoji || '💫'}</span>
        </div>
        {!last && <div className="mt-1 w-px flex-1 bg-ig-border" />}
      </div>

      {/* Card */}
      <div className="mb-5 flex-1 rounded-xl border border-ig-border bg-ig-elevated p-4">
        <h3 data-testid={`event-name-${ev.id}`} className="text-base font-semibold">{ev.name}</h3>
        <p className="mt-0.5 text-sm text-ig-muted">{formatEventDate(ev.date)}</p>

        <a
          href={ev.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`event-map-link-${ev.id}`}
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-[#e0f1ff]"
        >
          <span aria-hidden="true">📍</span>
          <span className="underline-offset-2 hover:underline">{ev.venue}</span>
          <ExternalLinkIcon size={14} className="text-ig-muted" />
        </a>

        {ev.dresscode && (
          <div data-testid={`event-dresscode-${ev.id}`} className="mt-3">
            <p className="mb-1.5 text-xs text-ig-muted">👗 Dress code</p>
            <div className="overflow-hidden rounded-lg border border-ig-border bg-ig-card">
              <img
                src={ev.dresscodeImage || DRESSCODE_PLACEHOLDER}
                alt={`Dress code for ${ev.name}: ${ev.dresscode}`}
                data-testid={`event-dresscode-image-${ev.id}`}
                className="aspect-square w-full object-contain"
                loading="lazy"
                onError={(e) => {
                  if (e.currentTarget.src !== window.location.origin + DRESSCODE_PLACEHOLDER) {
                    e.currentTarget.src = DRESSCODE_PLACEHOLDER
                  }
                }}
              />
            </div>
            <p className="mt-1.5 text-xs text-ig-text">{ev.dresscode}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function EventsPage() {
  const events = [...(siteConfig.events || [])].sort(byDateAsc)

  return (
    <div data-testid="events-page">
      <header className="sticky top-0 z-20 border-b border-ig-border bg-ig-black/90 backdrop-blur">
        <div className="flex h-12 items-center justify-center px-4">
          <span className="font-logo text-2xl leading-none">Events</span>
        </div>
      </header>

      <div className="px-4 pt-5">
        <h2 className="text-lg font-semibold">Saare Functions 🎊</h2>
        <p className="mt-0.5 text-sm text-ig-muted">
          Har rasm ka schedule — RSVP zaroor karna!
        </p>
      </div>

      <div className="px-4 pt-5">
        {events.length === 0 ? (
          <p data-testid="events-empty" className="py-16 text-center text-ig-muted">Events jald hi add honge.</p>
        ) : (
          <div data-testid="events-list">
            {events.map((ev, i) => (
              <EventCard key={ev.id || i} ev={ev} last={i === events.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
