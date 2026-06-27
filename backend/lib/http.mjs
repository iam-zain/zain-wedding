// Response + request helpers shared by all handlers.
// CORS headers are added by API Gateway (HTTP API CORS config), not here.

export const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

export const ok = (body) => json(200, body)
export const badRequest = (message) => json(400, { error: message })
export const unauthorized = (message = 'unauthorized') => json(401, { error: message })
export const notFound = (message = 'not found') => json(404, { error: message })
export const conflict = (message) => json(409, { error: message })
export const serverError = (message = 'server error') => json(500, { error: message })

/** Case-insensitive header read (HTTP API lowercases keys, but be safe). */
export function header(event, name) {
  const h = event.headers || {}
  const lower = name.toLowerCase()
  for (const k of Object.keys(h)) if (k.toLowerCase() === lower) return h[k]
  return undefined
}

export function parseBody(event) {
  if (!event.body) return {}
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body
  return JSON.parse(raw)
}
