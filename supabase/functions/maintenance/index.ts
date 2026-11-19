// maintenance — nightly purge of items deleted more than 30 days ago (FR-PLAT-10, ADR 0016).
// Called by pg_cron (private.trigger_maintenance) with a bearer token; never by browsers.
// Storage objects are removed through the Storage API first; only then are their rows deleted,
// so a failure leaves rows to retry tomorrow rather than objects nobody can find.
// Secrets: MAINTENANCE_TOKEN.
import { createClient } from '@supabase/supabase-js'
import { safeEqual } from '../_shared/push.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TOKEN = Deno.env.get('MAINTENANCE_TOKEN') ?? ''
const BATCH = 500
const ROUNDS = 10

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method' })
  const auth = req.headers.get('Authorization') ?? ''
  if (!TOKEN || !safeEqual(auth, `Bearer ${TOKEN}`)) return json(401, { error: 'unauthorized' })

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const totals: Record<string, number> = {}
  let failed = 0

  for (let round = 0; round < ROUNDS; round++) {
    const { data, error } = await db.rpc('purge_prepare', { p_limit: BATCH })
    if (error) return json(500, { error: 'prepare failed' })
    const files = (data ?? []) as { id: string; storage_path: string }[]

    const removed: string[] = []
    for (let i = 0; i < files.length; i += 100) {
      const chunk = files.slice(i, i + 100)
      const { error: rmError } = await db.storage
        .from('workspace-files')
        .remove(chunk.map((f) => f.storage_path))
      if (rmError) failed += chunk.length
      else removed.push(...chunk.map((f) => f.id))
    }

    const { data: counts, error: finishError } = await db.rpc('purge_finish', { p_files: removed })
    if (finishError) return json(500, { error: 'finish failed' })
    for (const [k, v] of Object.entries((counts ?? {}) as Record<string, number>))
      totals[k] = (totals[k] ?? 0) + v
    if (files.length < BATCH || removed.length === 0) break
  }

  return json(200, { purged: totals, storageFailures: failed })
})
