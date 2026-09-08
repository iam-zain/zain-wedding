import { BatchGetCommand } from '@aws-sdk/lib-dynamodb'
import { ddb, TABLE } from './lib/dynamo.mjs'
import { badRequest, ok, serverError } from './lib/http.mjs'

// DynamoDB caps a BatchGetItem at 100 keys.
const BATCH_SIZE = 100
// Upper bound on ids per request, so a crafted URL can't fan out unbounded reads.
const MAX_IDS = 300
const MAX_RETRIES = 3

/**
 * GET /likes?ids=a,b,c — live like counts for many posts in ONE request.
 *
 * Replaces the per-post fan-out the frontend used to do. That fan-out issued
 * one request per post per poll per device, which blew straight through the
 * stage's global 10 rps / 5 burst throttle as soon as a handful of guests had
 * the site open. The 429s were swallowed as "no update", so every device sat
 * frozen on whatever count it had last seen — the counts never converged.
 *
 * Unauthenticated, like GET /like/{postId}: an API key would force a CORS
 * preflight on every poll for nothing.
 */
export const handler = async (event) => {
  const raw = event.queryStringParameters?.ids || ''
  const ids = [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))]

  if (ids.length === 0) return ok({ counts: {} })
  if (ids.length > MAX_IDS) return badRequest(`too many ids (max ${MAX_IDS})`)

  try {
    const counts = {}
    // Absent items mean nobody has liked that post yet — report 0 rather than
    // omitting it, so the client can tell "zero likes" from "not fetched".
    for (const id of ids) counts[id] = 0

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const chunk = ids.slice(i, i + BATCH_SIZE)
      let keys = chunk.map((id) => ({ pk: `POST#${id}`, sk: 'LIKES' }))

      // BatchGetItem may return UnprocessedKeys under load instead of failing;
      // dropping them would silently under-report counts.
      for (let attempt = 0; keys.length > 0 && attempt < MAX_RETRIES; attempt++) {
        const res = await ddb.send(
          new BatchGetCommand({ RequestItems: { [TABLE]: { Keys: keys } } }),
        )
        for (const item of res.Responses?.[TABLE] || []) {
          const id = String(item.pk || '').slice('POST#'.length)
          if (id) counts[id] = Number(item.count ?? 0)
        }
        keys = res.UnprocessedKeys?.[TABLE]?.Keys || []
      }
    }

    return ok({ counts })
  } catch (err) {
    console.error('get likes error', err)
    return serverError()
  }
}
