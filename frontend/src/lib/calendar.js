// ─────────────────────────────────────────────────────────────────────────────
// .ics (RFC 5545) generation, entirely client-side, so "Add to calendar"
// works offline and needs no backend.
//
// Times in site.json carry an explicit +05:30 offset, so they're converted to
// UTC ("...Z") stamps. That is the one format every calendar app agrees on,
// and it means a guest travelling in another timezone still gets the right
// local time rather than 19:00 wherever they happen to be standing.
// ─────────────────────────────────────────────────────────────────────────────

/** Default length of a function, used because site.json has no end times. */
const DEFAULT_DURATION_HOURS = 3

/** Date -> '20261028T133000Z'. */
function toUtcStamp(date) {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
}

/**
 * Escapes a value for an ics text field. The backslash rule must run FIRST,
 * otherwise the backslashes introduced by the later replacements get escaped
 * a second time and the guest sees a stray one in their calendar entry.
 */
function escapeText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Folds a content line to 75 octets, per spec. Measured in UTF-8 BYTES, not
 * characters: venue and dress-code strings contain emoji, and splitting on
 * character count can cut through the middle of a multi-byte sequence and
 * corrupt the file.
 */
function foldLine(line) {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line

  const out = []
  let start = 0
  let limit = 75 // continuations lose one octet to their leading space
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length)
    // Never split inside a UTF-8 sequence: continuation bytes are 10xxxxxx.
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--
    out.push(new TextDecoder().decode(bytes.slice(start, end)))
    start = end
    limit = 74
  }
  return out.join('\r\n ')
}

function buildEvent(ev, { hashtag, siteUrl }) {
  const start = new Date(ev.date)
  const end = new Date(start.getTime() + DEFAULT_DURATION_HOURS * 3600 * 1000)

  const description = [
    ev.dresscode ? `Dress code: ${ev.dresscode}` : null,
    ev.mapUrl ? `Directions: ${ev.mapUrl}` : null,
    hashtag || null,
    siteUrl || null,
  ]
    .filter(Boolean)
    .join('\n')

  return [
    'BEGIN:VEVENT',
    // Stable per event, so re-importing updates the existing entry instead of
    // creating a duplicate alongside it.
    `UID:${ev.id}-zain-uzma@zain-wedding`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(start)}`,
    `DTEND:${toUtcStamp(end)}`,
    `SUMMARY:${escapeText(`${ev.emoji || ''} ${ev.name}`.trim())}`,
    ev.venue ? `LOCATION:${escapeText(ev.venue)}` : null,
    description ? `DESCRIPTION:${escapeText(description)}` : null,
    'BEGIN:VALARM',
    'TRIGGER:-P1D', // nudge the day before
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(`Kal ${ev.name} hai!`)}`,
    'END:VALARM',
    'END:VEVENT',
  ].filter(Boolean)
}

/** A complete calendar containing one or many events. */
export function buildIcs(events, meta = {}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//zain-wedding//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events.flatMap((ev) => buildEvent(ev, meta)),
    'END:VCALENDAR',
  ]
  // Spec requires CRLF, and Outlook genuinely refuses files that use bare LF.
  return lines.map(foldLine).join('\r\n')
}

/**
 * Hands the guest an .ics file.
 *
 * iOS Safari ignores the `download` attribute, so rather than silently doing
 * nothing there we open the blob in a new tab, iOS recognises the calendar
 * MIME type and offers to add the events from its own viewer.
 */
export function downloadIcs(filename, content) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const supportsDownload = 'download' in a

  if (supportsDownload) {
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  } else {
    window.open(url, '_blank')
  }

  // Give the browser a moment to start reading the blob before revoking it.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
