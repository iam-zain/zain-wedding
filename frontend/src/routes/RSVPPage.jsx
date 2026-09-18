import { useEffect, useMemo, useState } from 'react'
import {
  RSVP_ARRIVAL_WINDOW,
  RSVP_DEPARTURE_WINDOW,
  RSVP_DEFAULT_TIME,
  describeWindow,
  RSVP_DIAL_CODE,
  RSVP_GUESTS_MAX,
  RSVP_GUESTS_MIN,
  RSVP_LOCATIONS,
  RSVP_PHONE_DIGITS,
  RSVP_RELATIONS,
  isValidPhone,
} from '../config'
import { submitRsvp } from '../lib/api'
import { getUserId, KEYS } from '../lib/storage'
import { useToast } from '../components/toast-context'
import BackHeader from '../components/BackHeader'
import ConfirmationTicket from '../components/ConfirmationTicket'
import { moreLinkById } from '../lib/tabs'
import { haptic } from '../lib/haptics'

// Same gradient the Confirmation tile on the hub wears.
const { from: RSVP_FROM, via: RSVP_VIA } = moreLinkById('rsvp')

const RSVP_KEY = KEYS.rsvpSubmission

function saveSubmission(entry) {
  try {
    localStorage.setItem(RSVP_KEY, JSON.stringify(entry))
  } catch {
    // quota / private mode — the in-memory state still confirms it for this visit
  }
}

// ── Date helpers ─────────────────────────────────────────────────────────────
// Everything is handled as a plain 'YYYY-MM-DD' day + 'HH:mm' time, stitched
// into 'YYYY-MM-DDTHH:mm' only on submit. Keeping the day as a string (rather
// than a Date) means no timezone can quietly shift someone's 23 Oct to 22 Oct.

/** Inclusive list of 'YYYY-MM-DD' days between two 'YYYY-MM-DD' bounds. */
function daysInWindow({ start, end }) {
  const out = []
  const last = Date.parse(`${end}T00:00:00Z`)
  for (let t = Date.parse(`${start}T00:00:00Z`); t <= last; t += 86400000) {
    out.push(new Date(t).toISOString().slice(0, 10))
  }
  return out
}

/** { weekday: 'Fri', day: '23', month: 'Oct' } for a day chip. */
function dayParts(ymd) {
  const d = new Date(`${ymd}T00:00:00Z`)
  return {
    weekday: d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' }),
    day: d.toLocaleDateString('en-IN', { day: 'numeric', timeZone: 'UTC' }),
    month: d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' }),
  }
}



// ── Storage ──────────────────────────────────────────────────────────────────
function readSubmission() {
  try {
    return JSON.parse(localStorage.getItem(RSVP_KEY) || 'null')
  } catch {
    return null
  }
}

/** Only reuse a stored day if it's still inside the window we now offer. */
function dayWithin(value, days) {
  const ymd = (value || '').slice(0, 10)
  return days.includes(ymd) ? ymd : ''
}

/**
 * Reduces anything a guest might type or paste to the bare national number.
 * Contacts apps hand out '+91 98765 43210' and older address books keep the
 * STD-style leading 0 — both must land on the same ten digits, and neither
 * may be truncated from the wrong end.
 */
function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '')
  if (digits.length === RSVP_PHONE_DIGITS + 2 && digits.startsWith(RSVP_DIAL_CODE.slice(1))) {
    digits = digits.slice(2) // pasted with the +91 country code
  } else if (digits.length === RSVP_PHONE_DIGITS + 1 && digits.startsWith('0')) {
    digits = digits.slice(1) // pasted with a trunk 0
  }
  return digits.slice(0, RSVP_PHONE_DIGITS)
}

/**
 * Keeps the party size inside its bounds and integral. Guards a stored value
 * too: an older submission (or a hand-edited localStorage) must not put the
 * slider somewhere its track can't reach.
 */
function clampGuests(value) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return RSVP_GUESTS_MIN
  return Math.min(RSVP_GUESTS_MAX, Math.max(RSVP_GUESTS_MIN, n))
}

function timeFrom(value) {
  const hm = (value || '').slice(11, 16)
  return /^\d{2}:\d{2}$/.test(hm) ? hm : RSVP_DEFAULT_TIME
}

// ── Pieces ───────────────────────────────────────────────────────────────────
function SectionCard({ title, emoji, subtitle, children, testId, accent }) {
  return (
    <section
      data-testid={testId}
      className="rounded-2xl border p-4"
      style={{
        borderColor: accent ? `${accent}59` : 'var(--color-ig-border)',
        background: accent
          ? `linear-gradient(135deg, ${accent}1a, ${accent}07)`
          : 'var(--color-ig-elevated)',
      }}
    >
      <div className="flex items-baseline gap-2">
        <span aria-hidden="true" className="text-lg leading-none">{emoji}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="mt-0.5 text-xs text-ig-muted">{subtitle}</p>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  )
}

function FieldLabel({ children, done }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5 text-xs text-ig-muted">
      <span>{children}</span>
      {done && <span aria-hidden="true" className="text-wa">✓</span>}
    </div>
  )
}

function LocationChips({ value, onChange, name }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {RSVP_LOCATIONS.map((loc) => {
        const active = value === loc.id
        return (
          <button
            key={loc.id}
            type="button"
            aria-pressed={active}
            data-testid={`rsvp-${name}-place-${loc.id}`}
            onClick={() => onChange(loc.id)}
            className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
              active
                ? 'border-ig-blue bg-ig-blue/15 text-ig-text'
                : 'border-ig-border bg-ig-card text-ig-muted active:opacity-80'
            }`}
          >
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <span aria-hidden="true">{loc.emoji}</span>
              <span className="truncate">{loc.name}</span>
            </div>
            <div className="mt-0.5 truncate text-[10px] text-ig-faint">{loc.hint}</div>
          </button>
        )
      })}
    </div>
  )
}

function DayStrip({ days, value, onChange, name, minDay }) {
  return (
    // Owns the horizontal axis here: pan-x lets the strip scroll by touch, and
    // data-swipe-exempt stops that scroll from also flipping to another tab.
    <div
      data-swipe-exempt="true"
      style={{ touchAction: 'pan-x' }}
      className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      {days.map((ymd) => {
        const { weekday, day, month } = dayParts(ymd)
        const active = value === ymd
        const disabled = !!minDay && ymd < minDay
        return (
          <button
            key={ymd}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            data-testid={`rsvp-${name}-day-${ymd}`}
            onClick={() => onChange(ymd)}
            className={`w-14 shrink-0 rounded-xl border py-2 text-center transition-colors ${
              disabled
                ? 'cursor-not-allowed border-ig-border/50 bg-ig-card/40 text-ig-faint/40'
                : active
                  ? 'border-ig-blue bg-ig-blue/15 text-ig-text'
                  : 'border-ig-border bg-ig-card text-ig-muted active:opacity-80'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wide">{weekday}</div>
            <div className="text-lg font-semibold leading-tight">{day}</div>
            <div className="text-[10px] uppercase tracking-wide">{month}</div>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Party-size slider. A range input rather than a number field: on a phone it's
 * one thumb-drag instead of summoning a keyboard, and it can't be left holding
 * a half-typed or out-of-range value.
 *
 * The accent is painted through the filled part of the track with a gradient
 * background, since range tracks can't be styled per-browser reliably.
 */
function GuestSlider({ value, onChange, accentFrom, accentTo }) {
  const pct = ((value - RSVP_GUESTS_MIN) / (RSVP_GUESTS_MAX - RSVP_GUESTS_MIN)) * 100
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor="rsvp-guests" className="text-xs text-ig-muted">
          Aapke saath aur kitne log aa rahe hain?
        </label>
        <span
          data-testid="rsvp-guests-value"
          className="rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums text-white"
          style={{ background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})` }}
        >
          {value}
        </span>
      </div>

      {/* pan-x + swipe-exempt so dragging the thumb never flips the tab. */}
      <input
        id="rsvp-guests"
        type="range"
        min={RSVP_GUESTS_MIN}
        max={RSVP_GUESTS_MAX}
        step={1}
        value={value}
        onChange={(e) => onChange(clampGuests(e.target.value))}
        data-testid="rsvp-guests-slider"
        data-swipe-exempt="true"
        aria-label="Number of extra guests"
        aria-valuetext={`${value} log`}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full outline-none"
        style={{
          touchAction: 'pan-x',
          background: `linear-gradient(90deg, ${accentFrom} 0%, ${accentTo} ${pct}%, var(--color-ig-card) ${pct}%, var(--color-ig-card) 100%)`,
        }}
      />

      <div className="mt-1 flex justify-between text-[10px] text-ig-faint">
        <span>Sirf main ({RSVP_GUESTS_MIN})</span>
        <span>{RSVP_GUESTS_MAX}</span>
      </div>

      <p className="mt-1.5 text-[11px] text-ig-faint">
        {value === 0
          ? 'Akele aa rahe ho — koi baat nahi, hum hain na 🤍'
          : `Aap + ${value} ${value === 1 ? 'aur' : 'aur log'} = ${value + 1} log`}
      </p>
    </div>
  )
}

function TimeField({ id, value, onChange, testId }) {
  return (
    <input
      id={id}
      type="time"
      value={value}
      step={300}
      onChange={(e) => onChange(e.target.value)}
      data-testid={testId}
      className="w-full rounded-xl border border-ig-border bg-ig-card px-3 py-2.5 text-sm text-ig-text outline-none focus:border-ig-muted [color-scheme:dark]"
    />
  )
}


// ── Page ─────────────────────────────────────────────────────────────────────
export default function RSVPPage() {
  const toast = useToast()
  const arrivalDays = useMemo(() => daysInWindow(RSVP_ARRIVAL_WINDOW), [])
  const departureDays = useMemo(() => daysInWindow(RSVP_DEPARTURE_WINDOW), [])

  // Read once. `stored` pre-fills the form; `submitted` decides whether the
  // guest has actually confirmed.
  const stored = useMemo(readSubmission, [])

  // A confirmation saved under an older, wider window would now be rejected by
  // the server (400) on every retry, leaving the guest staring at "network aate
  // hi pahunch jayega" forever. Such an entry counts as not-yet-confirmed, so
  // the form comes back — but every field it holds is still used below, so the
  // guest only re-picks the dates that fell outside, not their whole answer.
  const [submitted, setSubmitted] = useState(() => {
    if (!stored) return null
    const inWindow = (stamp, { start, end }) => {
      const day = String(stamp || '').slice(0, 10)
      return day >= start && day <= end
    }
    if (!inWindow(stored.arrival, RSVP_ARRIVAL_WINDOW)) return null
    if (!inWindow(stored.departure, RSVP_DEPARTURE_WINDOW)) return null
    return stored
  })
  const [name, setName] = useState(stored?.name || '')
  const [phone, setPhone] = useState(() => normalizePhone(stored?.phone))
  const [guests, setGuests] = useState(() => clampGuests(stored?.guests ?? RSVP_GUESTS_MIN))
  const [relation, setRelation] = useState(stored?.relation || '')
  const [arrivalPlace, setArrivalPlace] = useState(stored?.arrivalPlace || '')
  const [arrivalDay, setArrivalDay] = useState(() => dayWithin(stored?.arrival, arrivalDays))
  const [arrivalTime, setArrivalTime] = useState(() => timeFrom(stored?.arrival))
  const [departurePlace, setDeparturePlace] = useState(stored?.departurePlace || '')
  const [departureDay, setDepartureDay] = useState(() => dayWithin(stored?.departure, departureDays))
  const [departureTime, setDepartureTime] = useState(() => timeFrom(stored?.departure))

  const phoneOk = isValidPhone(phone)
  const filled = [name.trim(), phoneOk, relation, arrivalPlace, arrivalDay, departurePlace, departureDay].filter(Boolean).length
  const total = 7

  // The ONLY place a confirmation is sent — first submit and later retries
  // alike. Driving it off state rather than the submit handler means a save
  // made while offline is re-sent on the next visit, and there is no window
  // where both paths fire for the same entry.
  useEffect(() => {
    if (!submitted || submitted.synced) return
    let cancelled = false
    submitRsvp(submitted)
      // Resolves true once stored, or false in LOCAL_MODE where there is no
      // backend to reach. Both mean "nothing left to send".
      .then(() => {
        if (cancelled) return
        const synced = { ...submitted, synced: true }
        saveSubmission(synced)
        setSubmitted(synced)
      })
      .catch(() => {}) // still unreachable — retried on the next visit
    return () => { cancelled = true }
  }, [submitted])

  function onSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return toast('Naam toh likho 🙂')
    if (!phone) return toast('WhatsApp number daal do 📱')
    if (!phoneOk) return toast(`${RSVP_PHONE_DIGITS} digit ka sahi mobile number daalo 📱`)
    if (!relation) return toast('Zain se aapka rishta chun lo 🤝')
    if (!arrivalPlace) return toast('Kahan pahunch rahe ho? Chittaranjan ya Gaya 🚉')
    if (!arrivalDay) return toast('Aane ka din chun lo 📅')
    if (!departurePlace) return toast('Wapsi kahan se hogi? 🛫')
    if (!departureDay) return toast('Jaane ka din chun lo 📅')

    const arrival = `${arrivalDay}T${arrivalTime || RSVP_DEFAULT_TIME}`
    const departure = `${departureDay}T${departureTime || RSVP_DEFAULT_TIME}`
    // Both are fixed-width 'YYYY-MM-DDTHH:mm', so a string compare is a chronological one.
    if (departure <= arrival) return toast('Jaane ka waqt aane ke baad hona chahiye 😅')

    const entry = {
      name: name.trim(),
      phone,
      dialCode: RSVP_DIAL_CODE,
      guests,
      relation,
      arrivalPlace,
      arrival,
      departurePlace,
      departure,
      userId: getUserId(),
      submittedAt: new Date().toISOString(),
      synced: false,
    }
    // Saved and confirmed locally first — the guest is done either way; the
    // effect above takes it from here.
    saveSubmission(entry)
    setSubmitted(entry)
    haptic('success')
    toast('🎉 Shukriya! Confirmation mil gaya.')
  }

  return (
    <div data-testid="rsvp-page">
      <BackHeader title="Confirmation" linkId="rsvp" />

      <div className="px-4 pt-5">
        <h2
          className="text-lg font-semibold text-transparent"
          style={{
            backgroundImage: `linear-gradient(90deg, ${RSVP_FROM}, ${RSVP_VIA})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
          }}
        >
          Aana confirm karo 🎊
        </h2>
        <p className="mt-0.5 text-sm text-ig-muted">
          Bas ye batao ki kahan aur kab pahunch rahe ho — baaki intezaam hamara. 🤍
        </p>
      </div>

      {submitted ? (
        <div className="px-4 pt-5">
          <ConfirmationTicket entry={submitted} guests={clampGuests(submitted.guests)} />

          <div
            data-testid="rsvp-confirmed"
            className="mt-4 rounded-2xl border p-4 text-center"
            style={{
              borderColor: `${RSVP_FROM}66`,
              background: `linear-gradient(135deg, ${RSVP_FROM}1f, ${RSVP_VIA}0a)`,
            }}
          >
            <p className="text-2xl leading-none">🤍</p>
            <p data-testid="rsvp-thankyou" className="mt-2 text-sm font-semibold">
              Shukriya, {String(submitted.name || '').split(' ')[0]}!
            </p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-ig-muted">
              Aapne aana confirm kar diya — humare liye isse badi khushi kuch nahi.
              Baaki ka intezaam hamara, bas aap waqt pe pahunch jaana 🎊
            </p>
          </div>

          <button
            type="button"
            data-testid="rsvp-edit"
            onClick={() => setSubmitted(null)}
            className="mt-3 w-full rounded-xl bg-ig-card py-2.5 text-sm font-semibold active:opacity-90"
          >
            Edit details
          </button>

          <p className="mt-3 text-center text-xs text-ig-faint">
            {submitted.synced === false
              ? 'Save ho gaya — network aate hi hum tak pahunch jayega 📶'
              : 'Plan badal gaya? Bas Edit dabao — kabhi bhi update kar sakte ho.'}
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4 px-4 pt-5">
          <div>
            <label htmlFor="rsvp-name" className="mb-1.5 block text-xs text-ig-muted">Naam</label>
            <input
              id="rsvp-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              data-testid="rsvp-name-input"
              className="w-full rounded-xl border border-ig-border bg-ig-card px-3 py-2.5 text-sm text-ig-text placeholder:text-ig-faint outline-none focus:border-ig-muted"
            />
          </div>

          <div>
            <label htmlFor="rsvp-phone" className="mb-1.5 flex items-center gap-1.5 text-xs text-ig-muted">
              <span>WhatsApp number</span>
              {phoneOk && <span aria-hidden="true" className="text-wa">✓</span>}
            </label>
            <div
              className={`flex items-stretch overflow-hidden rounded-xl border bg-ig-card transition-colors ${
                phone && !phoneOk ? 'border-ig-red' : 'border-ig-border focus-within:border-ig-muted'
              }`}
            >
              <span className="flex select-none items-center border-r border-ig-border px-3 text-sm text-ig-muted">
                {RSVP_DIAL_CODE}
              </span>
              <input
                id="rsvp-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={phone}
                // Normalised on the way in, so a pasted '+91 98765 43210' or
                // '098765-43210' still lands as ten clean digits.
                onChange={(e) => setPhone(normalizePhone(e.target.value))}
                placeholder="98765 43210"
                data-testid="rsvp-phone-input"
                className="w-full min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm tracking-wide text-ig-text placeholder:text-ig-faint outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-ig-faint">
              {phone && !phoneOk
                ? `${RSVP_PHONE_DIGITS} digit ka mobile number daalo`
                : 'WhatsApp wala number behtar hai — updates wahin bhejenge 💬'}
            </p>
          </div>

          <div className="rounded-2xl border border-ig-border bg-ig-elevated p-4">
            <GuestSlider
              value={guests}
              onChange={setGuests}
              accentFrom={RSVP_FROM}
              accentTo={RSVP_VIA}
            />
          </div>

          <div className="rounded-2xl border border-ig-border bg-ig-elevated p-4">
            <p className="flex items-center gap-1.5 text-xs text-ig-muted"><span>Zain se aapka rishta?</span>{relation && <span aria-hidden="true" className="text-wa">✓</span>}</p>
            <div className="mt-2 space-y-2">
              {RSVP_RELATIONS.map((r) => {
                const active = relation === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={active}
                    data-testid={`rsvp-relation-${r.id}`}
                    onClick={() => { haptic('tap'); setRelation(r.id) }}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      active ? 'text-ig-text' : 'border-ig-border bg-ig-card text-ig-muted active:opacity-80'
                    }`}
                    style={active ? { borderColor: RSVP_FROM, backgroundColor: `${RSVP_FROM}1f` } : undefined}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <span aria-hidden="true">{r.emoji}</span>
                      <span className="truncate">{r.label}</span>
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-ig-faint">{r.line}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <SectionCard
            testId="rsvp-arrival-section"
            emoji="🛬"
            accent={RSVP_FROM}
            title="Aana — arrival"
            subtitle={describeWindow(RSVP_ARRIVAL_WINDOW)}
          >
            <div>
              <FieldLabel done={!!arrivalPlace}>Kahan pahunch rahe ho?</FieldLabel>
              <LocationChips name="arrival" value={arrivalPlace} onChange={setArrivalPlace} />
            </div>
            <div>
              <FieldLabel done={!!arrivalDay}>Kis din?</FieldLabel>
              <DayStrip name="arrival" days={arrivalDays} value={arrivalDay} onChange={setArrivalDay} />
            </div>
            <div>
              <label htmlFor="rsvp-arrival-time" className="mb-1.5 block text-xs text-ig-muted">
                Approx time (24hr)
              </label>
              <TimeField
                id="rsvp-arrival-time"
                value={arrivalTime}
                onChange={setArrivalTime}
                testId="rsvp-arrival-time-input"
              />
            </div>
          </SectionCard>

          <SectionCard
            testId="rsvp-departure-section"
            emoji="🛫"
            accent={RSVP_VIA}
            title="Jaana — departure"
            subtitle={describeWindow(RSVP_DEPARTURE_WINDOW)}
          >
            <div>
              <FieldLabel done={!!departurePlace}>Wapsi kahan se?</FieldLabel>
              <LocationChips name="departure" value={departurePlace} onChange={setDeparturePlace} />
            </div>
            <div>
              <FieldLabel done={!!departureDay}>Kis din?</FieldLabel>
              <DayStrip
                name="departure"
                days={departureDays}
                value={departureDay}
                onChange={setDepartureDay}
                minDay={arrivalDay}
              />
            </div>
            <div>
              <label htmlFor="rsvp-departure-time" className="mb-1.5 block text-xs text-ig-muted">
                Approx time (24hr)
              </label>
              <TimeField
                id="rsvp-departure-time"
                value={departureTime}
                onChange={setDepartureTime}
                testId="rsvp-departure-time-input"
              />
            </div>
          </SectionCard>

          <div>
            <div
              aria-hidden="true"
              data-testid="rsvp-progress"
              className="mb-2 h-1 overflow-hidden rounded-full bg-ig-card"
            >
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${(filled / total) * 100}%`,
                  background: `linear-gradient(90deg, ${RSVP_FROM}, ${RSVP_VIA})`,
                }}
              />
            </div>
            <button
              type="submit"
              data-testid="rsvp-submit"
              className="w-full rounded-xl py-3 text-sm font-semibold text-white active:opacity-90"
              style={{ background: `linear-gradient(135deg, ${RSVP_FROM}, ${RSVP_VIA})` }}
            >
              {filled === total ? 'Confirm 🎉' : `Confirm (${filled}/${total})`}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
