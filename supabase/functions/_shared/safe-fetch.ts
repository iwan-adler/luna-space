import { checkUrl, isBlockedIp, parseIPv4 } from './net.ts'

export type FetchErrorCode =
  | 'INVALID_URL'
  | 'FETCH_BLOCKED'
  | 'FETCH_TIMEOUT'
  | 'FETCH_FAILED'
  | 'HTTP_ERROR'
  | 'UNSUPPORTED_CONTENT'
  | 'TOO_LARGE'
  | 'TOO_MANY_REDIRECTS'
  | 'ROBOTS_DISALLOWED'

export type SafeFetchResult =
  | {
      ok: true
      finalUrl: string
      status: number
      contentType: string
      body: string
      sha256: string
    }
  | { ok: false; code: FetchErrorCode; reason: string; finalUrl?: string; status?: number }

export interface SafeFetchDeps {
  /** Resolves a host name to its IP addresses (A and AAAA). */
  resolve: (host: string) => Promise<string[]>
  fetch: typeof fetch
  timeoutMs?: number
  maxBytes?: number
  maxRedirects?: number
  accept?: RegExp
  userAgent?: string
}

const DEFAULTS = {
  timeoutMs: 10_000,
  maxBytes: 2 * 1024 * 1024,
  maxRedirects: 3,
  accept: /^(text\/html|application\/xhtml\+xml)\b/i,
  userAgent: 'LunaSpaceFetcher/1.0 (single page fetch on behalf of a user)',
}

async function hostIsSafe(host: string, resolve: SafeFetchDeps['resolve']): Promise<boolean> {
  const literal = host.startsWith('[') ? host.slice(1, -1) : host
  if (parseIPv4(literal) || literal.includes(':')) return !isBlockedIp(literal)
  let addresses: string[]
  try {
    addresses = await resolve(literal)
  } catch {
    return false
  }
  // Every address must be public: a single private record blocks the request (DNS-rebinding guard).
  return addresses.length > 0 && addresses.every((a) => !isBlockedIp(a))
}

async function readCapped(res: Response, maxBytes: number): Promise<Uint8Array | null> {
  const declared = Number(res.headers.get('content-length') ?? '0')
  if (declared > maxBytes) return null
  if (!res.body) return new Uint8Array()
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function decode(bytes: Uint8Array, contentType: string): string {
  const charset = /charset=([\w-]+)/i.exec(contentType)?.[1] ?? 'utf-8'
  try {
    return new TextDecoder(charset).decode(bytes)
  } catch {
    return new TextDecoder('utf-8').decode(bytes)
  }
}

/**
 * GET a public web page with SSRF protections: http(s) on 80/443 only, every redirect hop
 * re-validated, DNS answers checked against private ranges, size and time limits, no cookies.
 */
export async function safeFetch(rawUrl: string, deps: SafeFetchDeps): Promise<SafeFetchResult> {
  const opts = { ...DEFAULTS, ...deps }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs)
  let current = rawUrl
  try {
    for (let hop = 0; hop <= opts.maxRedirects; hop++) {
      const check = checkUrl(current)
      if (!check.ok) return { ok: false, code: check.code, reason: check.reason, finalUrl: current }
      if (!(await hostIsSafe(check.url.hostname, opts.resolve))) {
        return {
          ok: false,
          code: 'FETCH_BLOCKED',
          reason: 'This address cannot be fetched',
          finalUrl: current,
        }
      }
      let res: Response
      try {
        res = await opts.fetch(check.url.toString(), {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          credentials: 'omit',
          headers: {
            Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
            'User-Agent': opts.userAgent,
          },
        })
      } catch (e) {
        if (controller.signal.aborted)
          return { ok: false, code: 'FETCH_TIMEOUT', reason: 'The page took too long to respond' }
        return {
          ok: false,
          code: 'FETCH_FAILED',
          reason: `Could not reach the site (${(e as Error).name})`,
        }
      }
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        await res.body?.cancel()
        if (!location)
          return { ok: false, code: 'FETCH_FAILED', reason: 'Redirect without a location' }
        current = new URL(location, check.url).toString()
        continue
      }
      const finalUrl = check.url.toString()
      if (res.status >= 400) {
        await res.body?.cancel()
        return {
          ok: false,
          code: 'HTTP_ERROR',
          reason: `The site answered with status ${res.status}`,
          status: res.status,
          finalUrl,
        }
      }
      const contentType = res.headers.get('content-type') ?? ''
      if (!opts.accept.test(contentType)) {
        await res.body?.cancel()
        return {
          ok: false,
          code: 'UNSUPPORTED_CONTENT',
          reason: 'The link is not a web page',
          status: res.status,
          finalUrl,
        }
      }
      const bytes = await readCapped(res, opts.maxBytes)
      if (!bytes)
        return {
          ok: false,
          code: 'TOO_LARGE',
          reason: 'The page is larger than 2 MB',
          status: res.status,
          finalUrl,
        }
      return {
        ok: true,
        finalUrl,
        status: res.status,
        contentType,
        body: decode(bytes, contentType),
        sha256: await sha256Hex(bytes),
      }
    }
    return {
      ok: false,
      code: 'TOO_MANY_REDIRECTS',
      reason: 'The link redirects too many times',
      finalUrl: current,
    }
  } catch (e) {
    if (controller.signal.aborted)
      return { ok: false, code: 'FETCH_TIMEOUT', reason: 'The page took too long to respond' }
    return { ok: false, code: 'FETCH_FAILED', reason: (e as Error).message.slice(0, 200) }
  } finally {
    clearTimeout(timer)
  }
}

/** Minimal robots.txt check for our user agent and "*" (TRD §8.3). Unknown or missing → allowed. */
export function robotsAllows(robotsTxt: string, path: string, agent = 'lunaspacefetcher'): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; prefix: string }[] }[] = []
  let current: (typeof groups)[number] | null = null
  let lastWasAgent = false
  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim()
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line)
    if (!m || !m[1]) continue
    const key = m[1].toLowerCase()
    const value = (m[2] ?? '').trim()
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
    } else if ((key === 'disallow' || key === 'allow') && current) {
      lastWasAgent = false
      if (key === 'disallow' && value === '') continue
      current.rules.push({ allow: key === 'allow', prefix: value })
    }
  }
  const pick =
    groups.find((g) => g.agents.some((a) => a !== '*' && agent.startsWith(a))) ??
    groups.find((g) => g.agents.includes('*'))
  if (!pick) return true
  let best: { allow: boolean; prefix: string } | null = null
  for (const r of pick.rules) {
    const prefix = r.prefix.replace(/\*.*$/, '').replace(/\$$/, '')
    if (path.startsWith(prefix) && (!best || prefix.length > best.prefix.length))
      best = { ...r, prefix }
  }
  return best ? best.allow : true
}
