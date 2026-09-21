import { siteConfig } from '../config'
import { formatEventDate } from '../lib/time'
import { buildIcs, downloadIcs } from '../lib/calendar'
import { haptic } from '../lib/haptics'
import { useToast } from '../components/toast-context'
import { CalendarIcon, ExternalLinkIcon } from '../components/icons'
import EventTimeline from '../components/EventTimeline'

const DRESSCODE_PLACEHOLDER = '/assets/dresscode/placeholder.svg'

const byDateAsc = (a, b) => Date.parse(a.date) - Date.parse(b.date)

/**
 * Each function's own colours, keyed by event id — drawn from the dress code
 * it already carries, so the page looks like the outfits guests are being
 * asked to wear. Falls back to the neutral card if an id isn't listed, so a
 * new event in site.json renders fine before anyone picks colours for it.
 */
const EVENT_COLORS = {
  haldi: { accent: '#f7c948', swatches: ['#F7C948', '#D69E2E'] },
  mehendi: { accent: '#79b473', swatches: ['#79B473', '#3F7D4F'] },
  nikah: { accent: '#e8b4a0', swatches: ['#EADBC8', '#E8B4A0'] },
  walima: { accent: '#a1547f', swatches: ['#7B3F61', '#2F6F6B'] },
}

function EventCard({ ev, last }) {
  const theme = EVENT_COLORS[ev.id]
  const accent = theme?.accent

  return (
    <div data-testid={`event-card-${ev.id}`} className="relative flex gap-4">
      {/* Timeline rail */}
      <div className="flex flex-col items-center">
        <div
          className="z-10 flex h-11 w-11 items-center justify-center rounded-full text-xl ring-2"
          style={{
            backgroundColor: accent ? `${accent}26` : 'var(--color-ig-card)',
            '--tw-ring-color': accent || 'var(--color-ig-border)',
          }}
        >
          <span aria-hidden="true">{ev.emoji || '💫'}</span>
        </div>
        {!last && <div className="mt-1 w-px flex-1 bg-ig-border" />}
      </div>

      {/* Card */}
      <div
        className="mb-5 flex-1 rounded-xl border p-4"
        style={{
          borderColor: accent ? `${accent}59` : 'var(--color-ig-border)',
          background: accent
            ? `linear-gradient(135deg, ${accent}1a, ${accent}07)`
            : 'var(--color-ig-elevated)',
        }}
      >
        <h3
          data-testid={`event-name-${ev.id}`}
          className="text-base font-semibold"
          style={{ color: accent }}
        >
          {ev.name}
        </h3>
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
            {theme?.swatches?.length > 0 && (
              <div
                data-testid={`event-swatches-${ev.id}`}
                className="mt-2 flex items-center gap-1.5"
              >
                {theme.swatches.map((hex) => (
                  <span
                    key={hex}
                    title={hex}
                    aria-label={`Colour ${hex}`}
                    className="size-5 rounded-full ring-1 ring-white/25"
                    style={{ backgroundColor: hex }}
                  />
                ))}
                <span className="ml-1 text-[10px] uppercase tracking-wide text-ig-faint">
                  colour guide
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function EventsPage() {
  const toast = useToast()
  const events = [...(siteConfig.events || [])].sort(byDateAsc)

  function addAllToCalendar() {
    if (events.length === 0) return
    haptic('success')
    downloadIcs(
      'zain-uzma-wedding.ics',
      buildIcs(events, {
        hashtag: siteConfig.wedding?.hashtag,
        siteUrl: siteConfig.profile?.link,
      }),
    )
    toast('📅 Calendar file ban gayi — apne calendar mein add kar lijiye!', { duration: 4500 })
  }

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
          Har function ka din, jagah aur dress code — sab kuch yahan 🤍
        </p>

        <EventTimeline />

        <button
          type="button"
          onClick={addAllToCalendar}
          data-testid="events-add-all-calendar"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-ig-border bg-ig-elevated py-2.5 text-sm font-semibold active:opacity-80"
        >
          <CalendarIcon size={18} />
          Saare events calendar mein daaliye
        </button>
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
