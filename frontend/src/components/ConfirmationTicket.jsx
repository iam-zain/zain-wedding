import { siteConfig, RSVP_DIAL_CODE, RSVP_LOCATIONS, RSVP_RELATIONS } from '../config'

// Ticket colours — warm paper against the app's dark ground, so it reads as a
// physical object rather than another card in the feed.
const INK = '#2b2118'
const PAPER = '#f6ecd9'
const PAPER_EDGE = '#e6d7bb'
const ACCENT = '#a8323b'

function locationName(id) {
  return RSVP_LOCATIONS.find((l) => l.id === id)?.name || '—'
}

function relation(id) {
  return RSVP_RELATIONS.find((r) => r.id === id) || null
}

/**
 * A stable, ticket-looking reference from the device id — same guest, same
 * number, every visit. Not an identifier anyone checks; it's there because a
 * ticket without a number doesn't look like a ticket.
 */
function ticketNo(userId) {
  const raw = String(userId || '').replace(/[^a-z0-9]/gi, '').toUpperCase()
  const tail = raw.slice(-6).padStart(6, '0')
  return `ZU-${tail.slice(0, 3)}-${tail.slice(3)}`
}

/** '26 Oct 2026' + '2:30 PM' from a 'YYYY-MM-DDTHH:mm' stamp. */
function parts(stamp) {
  const ymd = String(stamp || '').slice(0, 10)
  const hm = String(stamp || '').slice(11, 16)
  if (!ymd) return { date: '—', time: '', weekday: '' }
  const d = new Date(`${ymd}T00:00:00Z`)
  const date = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const weekday = d.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' })
  let time = ''
  if (/^\d{2}:\d{2}$/.test(hm)) {
    const [h, m] = hm.split(':').map(Number)
    const suffix = h < 12 ? 'AM' : 'PM'
    time = `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`
  }
  return { date, time, weekday }
}

function Leg({ caption, place, stamp, testId }) {
  const { date, time, weekday } = parts(stamp)
  return (
    <div data-testid={testId} className="min-w-0 flex-1">
      <p className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: `${INK}99` }}>
        {caption}
      </p>
      <p className="mt-1 truncate text-[15px] font-extrabold leading-tight" style={{ color: INK }}>
        {locationName(place)}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold" style={{ color: `${INK}cc` }}>
        {date}
      </p>
      <p className="text-[10px]" style={{ color: `${INK}99` }}>
        {weekday}{time ? ` · ${time}` : ''}
      </p>
    </div>
  )
}

/**
 * The confirmation, shown as a keepsake pass rather than a summary card.
 *
 * Deliberately generic — no airline, railway or airport language anywhere. It
 * borrows only the *shape* of a ticket (stub, perforation, reference number),
 * because a guest is not actually travelling on it and a fake boarding pass
 * that names a carrier invites someone to read it as real.
 */
export default function ConfirmationTicket({ entry, guests }) {
  const rel = relation(entry.relation)
  const total = guests + 1

  return (
    <div data-testid="confirmation-ticket" className="overflow-hidden rounded-2xl shadow-2xl">
      {/* Header band */}
      <div className="px-4 py-3" style={{ backgroundColor: ACCENT }}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-logo text-xl leading-none text-white">
            {siteConfig.profile?.displayName || 'Zain & Uzma'}
          </span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white">
            Confirmed
          </span>
        </div>
        <p className="mt-0.5 text-[10px] tracking-[0.18em] text-white/80">
          {siteConfig.wedding?.hashtag || ''}
        </p>
      </div>

      {/* Body */}
      <div className="px-4 pb-3 pt-4" style={{ backgroundColor: PAPER }}>
        <p className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: `${INK}99` }}>
          Guest
        </p>
        <p
          data-testid="ticket-name"
          className="truncate text-[19px] font-extrabold leading-tight"
          style={{ color: INK }}
        >
          {entry.name}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]" style={{ color: `${INK}cc` }}>
          <span data-testid="ticket-party">
            👥 {total} {total === 1 ? 'person' : 'people'}
          </span>
          {entry.phone && <span>💬 {entry.dialCode || RSVP_DIAL_CODE} {entry.phone}</span>}
        </div>

        {rel && (
          <span
            data-testid="ticket-relation"
            className="mt-2 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{ backgroundColor: `${ACCENT}1f`, color: ACCENT }}
          >
            {rel.emoji} {rel.label}
          </span>
        )}

        <div className="my-3 h-px" style={{ backgroundColor: PAPER_EDGE }} />

        <div className="flex items-start gap-3">
          <Leg caption="Aana" place={entry.arrivalPlace} stamp={entry.arrival} testId="ticket-arrival" />
          <div className="flex flex-col items-center pt-3">
            <span aria-hidden="true" style={{ color: `${INK}66` }}>→</span>
          </div>
          <Leg caption="Jaana" place={entry.departurePlace} stamp={entry.departure} testId="ticket-departure" />
        </div>
      </div>

      {/* Perforation — notches on both sides of a dashed rule */}
      <div className="relative" style={{ backgroundColor: PAPER }}>
        <div
          aria-hidden="true"
          className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: 'var(--color-ig-black)' }}
        />
        <div
          aria-hidden="true"
          className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: 'var(--color-ig-black)' }}
        />
        <div
          aria-hidden="true"
          className="mx-4 border-t-2 border-dashed"
          style={{ borderColor: PAPER_EDGE }}
        />
      </div>

      {/* Stub */}
      <div className="flex items-center gap-3 px-4 pb-4 pt-3" style={{ backgroundColor: PAPER }}>
        <div className="shrink-0 rounded-lg bg-white p-1.5">
          <img
            src="/assets/wedding-qr.svg"
            alt="QR code linking to the wedding website"
            data-testid="ticket-qr"
            className="size-[62px]"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: `${INK}99` }}>
            Ticket no.
          </p>
          <p
            data-testid="ticket-number"
            className="font-mono text-[13px] font-bold tabular-nums"
            style={{ color: INK }}
          >
            {ticketNo(entry.userId)}
          </p>
          <p className="mt-1 text-[10px] leading-snug" style={{ color: `${INK}aa` }}>
            Shukriya! Aapki jagah pakki hai — bas aa jaiye 🤍
          </p>
        </div>
      </div>
    </div>
  )
}
