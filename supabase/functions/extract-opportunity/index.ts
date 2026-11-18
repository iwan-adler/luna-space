// Edge Function: extract-opportunity (TRD §8, FR-OPP-06–13).
// POST { url } with the member's JWT → { ok, runId, thin } or { ok: false, code, reason, runId? }.
// The page is fetched through safeFetch (SSRF guards); results are stored with the service role so
// clients cannot forge "extracted" values. Expected failures return HTTP 200 with ok:false.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'
import { EXTRACTOR_VERSION, extractFromHtml } from '../_shared/extract/extract.ts'
import { robotsAllows, safeFetch } from '../_shared/safe-fetch.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ALLOWED_ORIGINS = (
  Deno.env.get('ALLOWED_ORIGINS') ??
  'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const DEFAULT_TZ = Deno.env.get('EXTRACT_DEFAULT_TIMEZONE') ?? 'Asia/Kolkata'

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] ?? '')
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

/** A + AAAA lookup; falls back to DNS-over-HTTPS when the runtime has no resolver (TRD §8.4). */
async function resolve(host: string): Promise<string[]> {
  try {
    const [a, aaaa] = await Promise.allSettled([
      Deno.resolveDns(host, 'A'),
      Deno.resolveDns(host, 'AAAA'),
    ])
    const out = [
      ...(a.status === 'fulfilled' ? a.value : []),
      ...(aaaa.status === 'fulfilled' ? aaaa.value : []),
    ]
    if (
      out.length ||
      (a.status === 'rejected' && !/not supported|permission/i.test(String(a.reason)))
    )
      return out
  } catch {
    // fall through to DoH
  }
  const doh = async (type: string) => {
    const r = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`,
      {
        headers: { accept: 'application/dns-json' },
      },
    )
    const body = (await r.json()) as { Answer?: { type: number; data: string }[] }
    return (body.Answer ?? []).filter((x) => x.type === 1 || x.type === 28).map((x) => x.data)
  }
  return [...(await doh('A')), ...(await doh('AAAA'))]
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405, origin)

  const errorId = crypto.randomUUID()
  const started = Date.now()
  const authorization = req.headers.get('authorization')
  if (!authorization) return json({ ok: false, code: 'NOT_SIGNED_IN' }, 401, origin)

  let url: unknown
  try {
    const body = await req.json()
    url = body?.url
  } catch {
    return json(
      { ok: false, code: 'INVALID_URL', reason: 'Send { "url": "https://…" }' },
      400,
      origin,
    )
  }
  if (typeof url !== 'string' || url.length > 2048) {
    return json(
      { ok: false, code: 'INVALID_URL', reason: 'Send { "url": "https://…" }' },
      400,
      origin,
    )
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
  })
  const startRes = await userClient.rpc('start_extraction_run', { p_url: url.trim() })
  if (startRes.error) {
    console.log(
      JSON.stringify({
        fn: 'extract-opportunity',
        errorId,
        outcome: 'start_error',
        code: startRes.error.code,
      }),
    )
    return json({ ok: false, code: 'SERVER_ERROR', errorId }, 500, origin)
  }
  const start = startRes.data as { ok: boolean; code?: string; run_id?: string }
  if (!start.ok || !start.run_id)
    return json({ ok: false, code: start.code ?? 'SERVER_ERROR' }, 200, origin)
  const runId = start.run_id

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const complete = (p: Record<string, unknown>) =>
    admin.rpc('complete_extraction_run', {
      p_run: runId,
      p_status: 'failed',
      p_final_url: null,
      p_http_status: null,
      p_content_type: null,
      p_content_hash_hex: null,
      p_error_code: null,
      p_thin: false,
      p_fields: [],
      ...p,
    })

  try {
    // robots.txt for the path (TRD §8.3); unreachable robots.txt counts as "allowed".
    const target = new URL(url.trim())
    const robots = await safeFetch(`${target.origin}/robots.txt`, {
      resolve,
      fetch,
      timeoutMs: 3000,
      maxBytes: 256 * 1024,
      accept: /^text\/plain\b/i,
    })
    if (robots.ok && !robotsAllows(robots.body, target.pathname)) {
      await complete({ p_error_code: 'ROBOTS_DISALLOWED' })
      return json(
        {
          ok: false,
          runId,
          code: 'ROBOTS_DISALLOWED',
          reason: 'This site asks automated tools not to read this page',
        },
        200,
        origin,
      )
    }

    const page = await safeFetch(url.trim(), { resolve, fetch })
    if (!page.ok) {
      await complete({
        p_final_url: page.finalUrl ?? null,
        p_http_status: page.status ?? null,
        p_error_code: page.code,
      })
      console.log(
        JSON.stringify({
          fn: 'extract-opportunity',
          errorId,
          runId,
          outcome: page.code,
          ms: Date.now() - started,
        }),
      )
      return json({ ok: false, runId, code: page.code, reason: page.reason }, 200, origin)
    }

    const result = extractFromHtml(page.body, {
      pageUrl: page.finalUrl,
      now: new Date(),
      defaultTimeZone: DEFAULT_TZ,
    })
    const done = await complete({
      p_status: 'succeeded',
      p_final_url: page.finalUrl,
      p_http_status: page.status,
      p_content_type: page.contentType,
      p_content_hash_hex: page.sha256,
      p_thin: result.thin,
      p_fields: result.fields,
    })
    if (done.error) throw new Error(done.error.message)
    console.log(
      JSON.stringify({
        fn: 'extract-opportunity',
        errorId,
        runId,
        outcome: 'ok',
        thin: result.thin,
        version: EXTRACTOR_VERSION,
        ms: Date.now() - started,
      }),
    )
    return json({ ok: true, runId, thin: result.thin }, 200, origin)
  } catch (e) {
    await complete({ p_error_code: 'SERVER_ERROR' }).catch(() => undefined)
    console.log(
      JSON.stringify({
        fn: 'extract-opportunity',
        errorId,
        runId,
        outcome: 'exception',
        message: String(e).slice(0, 200),
      }),
    )
    return json({ ok: false, runId, code: 'SERVER_ERROR', errorId }, 500, origin)
  }
})
