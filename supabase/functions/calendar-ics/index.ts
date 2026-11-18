// calendar-ics — private calendar subscription link (ADR 0013).
// GET /functions/v1/calendar-ics?token=… → text/calendar for the link's owner. Calendar apps
// (Google Calendar, Apple, Android) fetch it periodically; no login is involved, so the token is
// the secret: only its hash is stored, it can be reset at any time, and an unknown token gets
// an empty 404 that reveals nothing.
import { createClient } from '@supabase/supabase-js'
import { buildCalendar, type IcsRow } from '../_shared/ics.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173').split(',')[0]!.trim()

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response(null, { status: 405 })
  const token = new URL(req.url).searchParams.get('token') ?? ''
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return new Response(null, { status: 404 })

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const { data, error } = await db.rpc('calendar_feed_for_token', { p_token: token })
  // An unknown or reset link: an empty 404 that reveals nothing.
  if (error?.code === 'P0002') return new Response(null, { status: 404 })
  if (error) return new Response(null, { status: 500 })
  const rows = (data ?? []) as IcsRow[]

  return new Response(req.method === 'HEAD' ? null : buildCalendar(rows, SITE_URL), {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="luna-space.ics"',
      'Cache-Control': 'private, max-age=900',
      'X-Robots-Tag': 'noindex',
    },
  })
})
