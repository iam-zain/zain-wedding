// Web Share API with clipboard fallback.
// Returns one of: 'shared' | 'cancelled' | 'copied' | 'failed'
export async function shareUrl({ url, title, text }) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ url, title, text })
      return 'shared'
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled'
      // fall through to clipboard
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
