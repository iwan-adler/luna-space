// dispatch-push — sends claimed notifications as Web Push (Phase 5b, FR-PLAT-08, ADR 0009).
// Called every minute by pg_cron (private.trigger_push_dispatch) with a bearer token; never by
// browsers. Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_DISPATCH_TOKEN.
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { buildPayload, isGone, safeEqual, type ClaimedRow } from '../_shared/push.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TOKEN = Deno.env.get('PUSH_DISPATCH_TOKEN') ?? ''
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? ''

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method' })
  const auth = req.headers.get('Authorization') ?? ''
  if (!TOKEN || !safeEqual(auth, `Bearer ${TOKEN}`)) return json(401, { error: 'unauthorized' })
  if (!VAPID_PUBLIC || !VAPID_PRIVATE || !VAPID_SUBJECT)
    return json(503, { error: 'not configured' })

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const { data, error } = await db.rpc('claim_push_batch', { p_limit: 200 })
  if (error) return json(500, { error: 'claim failed' })

  let sent = 0
  let removed = 0
  for (const row of (data ?? []) as ClaimedRow[]) {
    const payload = JSON.stringify(buildPayload(row))
    for (const sub of row.subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 12 * 3600, urgency: 'normal' },
        )
        sent++
        await db
          .from('push_subscriptions')
          .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
          .eq('id', sub.id)
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        if (isGone(status)) {
          removed++
          await db.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          const { data: current } = await db
            .from('push_subscriptions')
            .select('failure_count')
            .eq('id', sub.id)
            .maybeSingle()
          const failures = (current?.failure_count ?? 0) + 1
          // A device that keeps failing for a day of attempts is dropped.
          if (failures >= 50) await db.from('push_subscriptions').delete().eq('id', sub.id)
          else
            await db.from('push_subscriptions').update({ failure_count: failures }).eq('id', sub.id)
        }
      }
    }
  }
  return json(200, { notifications: data?.length ?? 0, sent, removed })
})
