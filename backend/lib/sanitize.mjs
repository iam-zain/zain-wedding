import { header } from './http.mjs'

// Matches ASCII control characters (0x00-0x1F and 0x7F). Built from an escaped
// string so the source contains no literal control characters.
const CONTROL_CHARS = new RegExp('[\\x00-\\x1F\\x7F]', 'g')

/** Strip ALL HTML tags + control chars from user input (comments are plain text). */
export function stripHtml(input) {
  return String(input ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(CONTROL_CHARS, '')
    .trim()
}

/**
 * Compare the write API key. If WRITE_API_KEY is empty/unset the check is
 * skipped (open) — set the env var in CDK to enforce.
 */
export function checkWriteKey(event) {
  const expected = process.env.WRITE_API_KEY
  if (!expected) return true
  return header(event, 'x-api-key') === expected
}

/** Admin key is ALWAYS required (no open fallback). */
export function checkAdminKey(event) {
  const expected = process.env.ADMIN_API_KEY
  if (!expected) return false
  return header(event, 'x-admin-key') === expected
}
