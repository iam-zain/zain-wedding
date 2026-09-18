import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { ddb, TABLE } from './lib/dynamo.mjs'
import { badRequest, ok, parseBody, serverError, unauthorized } from './lib/http.mjs'
import { checkAdminKey, checkWriteKey, stripHtml } from './lib/sanitize.mjs'

// Windows live in env so the dates can move without a code change. Inclusive,
// 'YYYY-MM-DD'. Keep in step with RSVP_* in frontend/src/config.js.
const ARRIVAL_FROM = process.env.RSVP_ARRIVAL_FROM || '2026-10-24'
const ARRIVAL_TO = process.env.RSVP_ARRIVAL_TO || '2026-10-30'
const DEPARTURE_FROM = process.env.RSVP_DEPARTURE_FROM || '2026-10-28'
const DEPARTURE_TO = process.env.RSVP_DEPARTURE_TO || '2026-11-03'

const PLACES = new Set(['chittaranjan', 'gaya'])
// Extra people a guest brings. 0 is valid and is the common answer, so this is
// bounded rather than required. Keep in step with RSVP_GUESTS_* in config.js.
const GUESTS_MIN = 0
const GUESTS_MAX = 99
const MAX_NAME = 80
const SCAN_PAGE_LIMIT = 60 // pages to walk before giving up on a very large table

// 'YYYY-MM-DDTHH:mm' — fixed width, so a lexicographic compare is chronological.
const STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
const PHONE = /^[6-9]\d{9}$/

/** Validates a stamp and that its date half falls inside an inclusive window. */
function stampInWindow(value, from, to) {
  if (!STAMP.test(value)) return false
  const day = value.slice(0, 10)
  return day >= from && day <= to
}

// POST /rsvp — upsert this guest's confirmation.
async function submit(event) {
  if (!checkWriteKey(event)) return unauthorized()

  let b
  try {
    b = parseBody(event)
  } catch {
    return badRequest('invalid json body')
  }

  // Re-validated here rather than trusted from the client: this endpoint is
  // reachable directly, and these rows are what the family plans travel around.
  const userId = String(b.userId || '').trim().slice(0, 100)
  const name = stripHtml(b.name).slice(0, MAX_NAME)
  const phone = String(b.phone || '').replace(/\D/g, '')
  const arrivalPlace = String(b.arrivalPlace || '').toLowerCase()
  const departurePlace = String(b.departurePlace || '').toLowerCase()
  const arrival = String(b.arrival || '')
  const departure = String(b.departure || '')
  // Coerced and clamped rather than rejected: a missing field means an older
  // client that predates this question, and that submission is still valid.
  const guestsRaw = Math.round(Number(b.guests))
  const guests = Number.isFinite(guestsRaw)
    ? Math.min(GUESTS_MAX, Math.max(GUESTS_MIN, guestsRaw))
    : GUESTS_MIN

  if (!userId) return badRequest('userId required')
  if (!name) return badRequest('name required')
  if (!PHONE.test(phone)) return badRequest('phone must be 10 digits starting 6-9')
  if (!PLACES.has(arrivalPlace)) return badRequest('invalid arrivalPlace')
  if (!PLACES.has(departurePlace)) return badRequest('invalid departurePlace')
  if (!stampInWindow(arrival, ARRIVAL_FROM, ARRIVAL_TO)) return badRequest('arrival outside allowed window')
  if (!stampInWindow(departure, DEPARTURE_FROM, DEPARTURE_TO)) {
    return badRequest('departure outside allowed window')
  }
  if (departure <= arrival) return badRequest('departure must be after arrival')

  const now = new Date().toISOString()
  try {
    // Keyed on userId so a guest editing their plans overwrites their own row
    // rather than adding a duplicate. Update (not Put) so if_not_exists can
    // keep the original createdAt across every later edit.
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { pk: `RSVP#${userId}`, sk: 'PROFILE' },
        UpdateExpression: [
          'SET #name = :name',
          'phone = :phone',
          'guests = :guests',
          'dialCode = :dial',
          'arrivalPlace = :ap',
          'arrival = :arr',
          'departurePlace = :dp',
          'departure = :dep',
          'userId = :uid',
          'updatedAt = :now',
          'createdAt = if_not_exists(createdAt, :now)',
        ].join(', '),
        ExpressionAttributeNames: { '#name': 'name' }, // reserved word
        ExpressionAttributeValues: {
          ':name': name,
          ':phone': phone,
          ':guests': guests,
          ':dial': String(b.dialCode || '+91').slice(0, 5),
          ':ap': arrivalPlace,
          ':arr': arrival,
          ':dp': departurePlace,
          ':dep': departure,
          ':uid': userId,
          ':now': now,
        },
      }),
    )
    return ok({ ok: true, updatedAt: now })
  } catch (err) {
    console.error('rsvp submit error', err)
    return serverError()
  }
}

// GET /admin/rsvps — every confirmation, most recently updated first.
async function list(event) {
  if (!checkAdminKey(event)) return unauthorized()

  try {
    const items = []
    let startKey
    for (let page = 0; page < SCAN_PAGE_LIMIT; page++) {
      const res = await ddb.send(
        new ScanCommand({
          TableName: TABLE,
          // The table also holds posts, comments and likes — keep RSVP rows only.
          FilterExpression: 'begins_with(pk, :p) AND sk = :s',
          ExpressionAttributeValues: { ':p': 'RSVP#', ':s': 'PROFILE' },
          ExclusiveStartKey: startKey,
        }),
      )
      for (const it of res.Items || []) {
        items.push({
          userId: it.userId,
          name: it.name,
          phone: it.phone,
          guests: typeof it.guests === 'number' ? it.guests : 0,
          dialCode: it.dialCode,
          arrivalPlace: it.arrivalPlace,
          arrival: it.arrival,
          departurePlace: it.departurePlace,
          departure: it.departure,
          createdAt: it.createdAt,
          updatedAt: it.updatedAt,
        })
      }
      startKey = res.LastEvaluatedKey
      if (!startKey) break
    }
    items.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    return ok({ rsvps: items, count: items.length })
  } catch (err) {
    console.error('rsvp list error', err)
    return serverError()
  }
}

export const handler = async (event) => {
  if ((event.routeKey || '').startsWith('GET /admin/rsvps')) return list(event)
  return submit(event)
}
