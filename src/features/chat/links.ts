/** The first web link in a message, if any (for the link card). */
export function firstLink(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>()"']+[^\s<>()"'.,;:!?]/i)
  if (!m) return null
  try {
    const u = new URL(m[0])
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}

/** Host without "www." and a short path, for display. */
export function describeLink(url: string): { host: string; path: string } {
  const u = new URL(url)
  const path = decodeURIComponent(u.pathname + u.search).replace(/\/$/, '')
  return {
    host: u.hostname.replace(/^www\./, ''),
    path: path.length > 48 ? `${path.slice(0, 47)}…` : path,
  }
}
