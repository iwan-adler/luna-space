/** The first web link in a shared title, text or URL. */
export function sharedLink(params: URLSearchParams): string | null {
  for (const field of ['url', 'text', 'title']) {
    const m = (params.get(field) ?? '').match(/https?:\/\/[^\s<>"']+/i)
    if (m) {
      try {
        const u = new URL(m[0])
        if (u.protocol === 'https:' || u.protocol === 'http:') return u.href
      } catch {
        // not a link
      }
    }
  }
  return null
}
