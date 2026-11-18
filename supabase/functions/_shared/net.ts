/**
 * URL and IP checks for server-side fetching (TRD §8.4, NFR-SEC-09).
 * Runtime-agnostic: used by the Edge Function (Deno) and unit-tested in Node.
 */

export type UrlCheck =
  { ok: true; url: URL } | { ok: false; code: 'INVALID_URL' | 'FETCH_BLOCKED'; reason: string }

const BLOCKED_HOST_SUFFIXES = [
  'localhost',
  '.localhost',
  '.local',
  '.internal',
  '.home.arpa',
  '.lan',
]

/** Parses a canonical dotted IPv4 string (the WHATWG URL parser normalises 0x7f.1, 2130706433, …). */
export function parseIPv4(host: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!m) return null
  const parts = m.slice(1).map(Number)
  return parts.every((p) => p >= 0 && p <= 255) ? parts : null
}

export function isBlockedIPv4(ip: number[]): boolean {
  const [a = 0, b = 0, c = 0] = ip
  return (
    a === 0 || // 0.0.0.0/8
    a === 10 || // private
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    a === 127 || // loopback
    (a === 169 && b === 254) || // link-local + cloud metadata
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 0 && c === 0) || // IETF protocol assignments
    (a === 192 && b === 0 && c === 2) || // TEST-NET-1
    (a === 192 && b === 168) || // private
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    (a === 198 && b === 51 && c === 100) || // TEST-NET-2
    (a === 203 && b === 0 && c === 113) || // TEST-NET-3
    a >= 224 // multicast + reserved + broadcast
  )
}

/** Expands an IPv6 literal (without brackets) to 8 hextets, or null. */
export function parseIPv6(host: string): number[] | null {
  let h = host.toLowerCase()
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1)
  if (!h.includes(':')) return null
  // Embedded IPv4 tail, e.g. ::ffff:127.0.0.1
  const v4 = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(h)
  if (v4?.[1]) {
    const p = parseIPv4(v4[1])
    if (!p) return null
    h =
      h.slice(0, -v4[1].length) +
      `${((p[0]! << 8) | p[1]!).toString(16)}:${((p[2]! << 8) | p[3]!).toString(16)}`
  }
  const halves = h.split('::')
  if (halves.length > 2) return null
  const left = halves[0] ? halves[0].split(':') : []
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  const missing = 8 - left.length - right.length
  if (halves.length === 1 && left.length !== 8) return null
  if (halves.length === 2 && missing < 1) return null
  const groups = [...left, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...right]
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null
  return groups.map((g) => parseInt(g, 16))
}

export function isBlockedIPv6(g: number[]): boolean {
  const [g0 = 0, g1 = 0, g2 = 0, g3 = 0, g4 = 0, g5 = 0, g6 = 0, g7 = 0] = g
  const allZeroPrefix = g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0
  if (allZeroPrefix && g5 === 0 && g6 === 0 && (g7 === 0 || g7 === 1)) return true // :: and ::1
  if (allZeroPrefix && g5 === 0xffff) {
    // IPv4-mapped: check the embedded IPv4 address
    return isBlockedIPv4([g6 >> 8, g6 & 0xff, g7 >> 8, g7 & 0xff])
  }
  if (allZeroPrefix && g5 === 0) return true // deprecated IPv4-compatible
  if ((g0 & 0xfe00) === 0xfc00) return true // fc00::/7 unique local
  if ((g0 & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
  if ((g0 & 0xff00) === 0xff00) return true // multicast
  if (g0 === 0x64 && g1 === 0xff9b) return true // NAT64 can reach internal IPv4
  if (g0 === 0x2001 && g1 === 0xdb8) return true // documentation
  return false
}

/** True when an IP literal (v4 or v6) must not be contacted. Unparseable input is blocked. */
export function isBlockedIp(ip: string): boolean {
  const v4 = parseIPv4(ip)
  if (v4) return isBlockedIPv4(v4)
  const v6 = parseIPv6(ip)
  if (v6) return isBlockedIPv6(v6)
  return true
}

/** Validates a URL before any network activity. */
export function checkUrl(raw: string): UrlCheck {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return { ok: false, code: 'INVALID_URL', reason: 'Not a valid web address' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, code: 'INVALID_URL', reason: 'Only http and https links can be fetched' }
  }
  if (url.username || url.password) {
    return {
      ok: false,
      code: 'FETCH_BLOCKED',
      reason: 'Links with embedded credentials are not fetched',
    }
  }
  if (url.port && url.port !== '80' && url.port !== '443') {
    return { ok: false, code: 'FETCH_BLOCKED', reason: 'Only standard web ports are allowed' }
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (
    !host ||
    BLOCKED_HOST_SUFFIXES.some((s) => host === s.replace(/^\./, '') || host.endsWith(s))
  ) {
    return { ok: false, code: 'FETCH_BLOCKED', reason: 'This address cannot be fetched' }
  }
  const literal = host.startsWith('[') ? host.slice(1, -1) : host
  if ((parseIPv4(literal) || literal.includes(':')) && isBlockedIp(literal)) {
    return { ok: false, code: 'FETCH_BLOCKED', reason: 'This address cannot be fetched' }
  }
  if (!literal.includes('.') && !literal.includes(':')) {
    return { ok: false, code: 'FETCH_BLOCKED', reason: 'Single-label host names are not fetched' }
  }
  url.hash = ''
  return { ok: true, url }
}
