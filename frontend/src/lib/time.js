// ─────────────────────────────────────────────────────────────────────────────
// Time formatting helpers.
// ─────────────────────────────────────────────────────────────────────────────

/** Instagram-style relative time, e.g. "3 days ago", "5m ago", "just now". */
export function relativeTime(input, now = Date.now()) {
  const then = typeof input === 'number' ? input : Date.parse(input)
  if (!Number.isFinite(then)) return ''
  const diff = Math.max(0, now - then)
  const sec = Math.floor(diff / 1000)
  if (sec < 45) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day === 1) return '1 day ago'
  if (day < 7) return `${day} days ago`
  const wk = Math.floor(day / 7)
  if (wk < 5) return wk === 1 ? '1 week ago' : `${wk} weeks ago`
  const mo = Math.floor(day / 30)
  if (mo < 12) return mo === 1 ? '1 month ago' : `${mo} months ago`
  const yr = Math.floor(day / 365)
  return yr === 1 ? '1 year ago' : `${yr} years ago`
}

/** Breakdown of ms remaining until a target into d/h/m/s. */
export function countdownParts(targetMs, now = Date.now()) {
  let rem = Math.max(0, targetMs - now)
  const day = Math.floor(rem / 86400000); rem -= day * 86400000
  const hour = Math.floor(rem / 3600000); rem -= hour * 3600000
  const min = Math.floor(rem / 60000); rem -= min * 60000
  const sec = Math.floor(rem / 1000)
  return { day, hour, min, sec, done: targetMs - now <= 0 }
}

/** "Sat, 12 Dec 2026 · 7:00 PM" */
export function formatEventDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const date = d.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${date} · ${time}`
}
