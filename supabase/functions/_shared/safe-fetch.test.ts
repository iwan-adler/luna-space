import { describe, expect, it, vi } from 'vitest'
import { checkUrl, isBlockedIp, parseIPv6 } from './net.ts'
import { robotsAllows, safeFetch } from './safe-fetch.ts'

describe('checkUrl (SSRF, TRD §8.4)', () => {
  const blocked = [
    'http://localhost/',
    'http://LOCALHOST./x',
    'http://api.localhost/',
    'http://printer.local/',
    'http://127.0.0.1/',
    'http://2130706433/', // decimal 127.0.0.1
    'http://0x7f.1/', // hex/short
    'http://0177.0.0.1/', // octal
    'http://10.1.2.3/',
    'http://172.16.0.1/',
    'http://192.168.1.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://100.64.0.1/',
    'http://0.0.0.0/',
    'http://[::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://[::ffff:7f00:1]/',
    'http://[fd00::1]/',
    'http://[fe80::1]/',
    'http://example.com:8080/',
    'http://user:pass@example.com/',
    'http://intranet/',
  ]
  it.each(blocked)('blocks %s', (url) => {
    expect(checkUrl(url).ok).toBe(false)
  })

  it.each(['ftp://example.com/', 'file:///etc/passwd', 'javascript:alert(1)', 'not a url'])(
    'rejects non-web scheme %s',
    (url) => {
      const r = checkUrl(url)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.code).toBe('INVALID_URL')
    },
  )

  it('allows ordinary public pages and drops the fragment', () => {
    const r = checkUrl('https://moonlabs.example/hack?x=1#top')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.url.toString()).toBe('https://moonlabs.example/hack?x=1')
    expect(checkUrl('https://8.8.8.8/').ok).toBe(true)
    expect(checkUrl('https://example.com:443/').ok).toBe(true)
  })

  it('classifies IPs', () => {
    expect(isBlockedIp('8.8.8.8')).toBe(false)
    expect(isBlockedIp('2606:4700:4700::1111')).toBe(false)
    expect(isBlockedIp('64:ff9b::7f00:1')).toBe(true)
    expect(isBlockedIp('garbage')).toBe(true)
    expect(parseIPv6('::')).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
  })
})

function htmlResponse(body: string, init: ResponseInit = {}) {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
    ...init,
  })
}

describe('safeFetch', () => {
  const publicDns = async () => ['93.184.216.34']

  it('fetches a public page and hashes the body', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      htmlResponse('<h1>Hi</h1>'),
    )
    const r = await safeFetch('https://moonlabs.example/', {
      resolve: publicDns,
      fetch: fetchMock as unknown as typeof fetch,
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.body).toBe('<h1>Hi</h1>')
      expect(r.sha256).toHaveLength(64)
    }
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual', credentials: 'omit' })
  })

  it('blocks host names that resolve to private addresses (any record)', async () => {
    const fetchMock = vi.fn()
    const r = await safeFetch('https://evil.example/', {
      resolve: async () => ['93.184.216.34', '10.0.0.5'],
      fetch: fetchMock as unknown as typeof fetch,
    })
    expect(r).toMatchObject({ ok: false, code: 'FETCH_BLOCKED' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('re-validates every redirect hop', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: 'http://169.254.169.254/latest/meta-data/' },
        }),
    )
    const r = await safeFetch('https://short.example/abc', {
      resolve: publicDns,
      fetch: fetchMock as typeof fetch,
    })
    expect(r).toMatchObject({ ok: false, code: 'FETCH_BLOCKED' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('stops after three redirects', async () => {
    let n = 0
    const fetchMock = vi.fn(
      async () => new Response(null, { status: 301, headers: { location: `/r${++n}` } }),
    )
    const r = await safeFetch('https://loop.example/', {
      resolve: publicDns,
      fetch: fetchMock as typeof fetch,
    })
    expect(r).toMatchObject({ ok: false, code: 'TOO_MANY_REDIRECTS' })
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('rejects non-HTML content and oversized bodies', async () => {
    const pdf = vi.fn(
      async () => new Response('%PDF', { headers: { 'content-type': 'application/pdf' } }),
    )
    expect(
      await safeFetch('https://a.example/rules.pdf', {
        resolve: publicDns,
        fetch: pdf as typeof fetch,
      }),
    ).toMatchObject({
      ok: false,
      code: 'UNSUPPORTED_CONTENT',
    })
    const big = vi.fn(async () => htmlResponse('x'.repeat(2000)))
    expect(
      await safeFetch('https://a.example/', {
        resolve: publicDns,
        fetch: big as typeof fetch,
        maxBytes: 1000,
      }),
    ).toMatchObject({ ok: false, code: 'TOO_LARGE' })
  })

  it('reports HTTP errors and timeouts', async () => {
    const notFound = vi.fn(async () => htmlResponse('nope', { status: 404 }))
    expect(
      await safeFetch('https://a.example/', {
        resolve: publicDns,
        fetch: notFound as typeof fetch,
      }),
    ).toMatchObject({
      ok: false,
      code: 'HTTP_ERROR',
      status: 404,
    })
    const slow = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
        ),
    )
    expect(
      await safeFetch('https://a.example/', {
        resolve: publicDns,
        fetch: slow as unknown as typeof fetch,
        timeoutMs: 20,
      }),
    ).toMatchObject({ ok: false, code: 'FETCH_TIMEOUT' })
  })
})

describe('robotsAllows', () => {
  const txt = `
User-agent: *
Disallow: /private
Allow: /private/public

User-agent: LunaSpaceFetcher
Disallow: /events/drafts
`
  it('uses the most specific group and longest matching rule', () => {
    expect(robotsAllows(txt, '/events/drafts/1')).toBe(false)
    expect(robotsAllows(txt, '/private/x')).toBe(true) // our own group has no /private rule
    expect(robotsAllows(txt, '/private/x', 'otherbot')).toBe(false)
    expect(robotsAllows(txt, '/private/public/x', 'otherbot')).toBe(true)
    expect(robotsAllows('', '/anything')).toBe(true)
  })
})
