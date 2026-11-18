import { execSync } from 'node:child_process'

/**
 * Local Supabase connection for end-to-end tests. Uses E2E_SUPABASE_URL / E2E_SERVICE_ROLE_KEY
 * when set (CI), otherwise reads `supabase status` from the running local stack.
 * Only ever points at a local development stack — never at a hosted project.
 */
function readStatus(): Record<string, string> {
  try {
    const out = execSync('npx supabase status -o env', {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString()
    const entries: [string, string][] = []
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)="?(.*?)"?$/)
      if (m && m[1] && m[2] !== undefined) entries.push([m[1], m[2]])
    }
    return Object.fromEntries(entries)
  } catch {
    return {}
  }
}

let cached: { url: string; serviceKey: string } | null | undefined

export function localBackend(): { url: string; serviceKey: string } | null {
  if (cached !== undefined) return cached
  const envUrl = process.env.E2E_SUPABASE_URL
  const envKey = process.env.E2E_SERVICE_ROLE_KEY
  if (envUrl && envKey) {
    cached = { url: envUrl, serviceKey: envKey }
  } else {
    const status = readStatus()
    cached =
      status.API_URL && status.SERVICE_ROLE_KEY
        ? { url: status.API_URL, serviceKey: status.SERVICE_ROLE_KEY }
        : null
  }
  if (cached && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(cached.url)) {
    throw new Error('E2E tests must only run against a local Supabase stack')
  }
  return cached
}

export interface TestUser {
  id?: string
  email: string
  password: string
  name: string
}

/** Creates a confirmed test account through the local Auth admin API. */
export async function createTestUser(name: string): Promise<TestUser> {
  const backend = localBackend()
  if (!backend) throw new Error('Local Supabase is not running')
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  const user: TestUser = {
    email: `${name.toLowerCase()}-${suffix}@e2e.test`,
    password: `e2e-pass-${suffix}`,
    name,
  }
  const res = await fetch(`${backend.url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: backend.serviceKey,
      Authorization: `Bearer ${backend.serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { display_name: name },
    }),
  })
  if (!res.ok) throw new Error(`Could not create test user: ${res.status} ${await res.text()}`)
  const created = (await res.json()) as { id?: string }
  return { ...user, ...(created.id ? { id: created.id } : {}) }
}

/** PostgREST call with the local service-role key (bypasses RLS; test setup only). */
export async function serviceRest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const backend = localBackend()
  if (!backend) throw new Error('Local Supabase is not running')
  const res = await fetch(`${backend.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: backend.serviceKey,
      Authorization: `Bearer ${backend.serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`REST ${path}: ${res.status} ${await res.text()}`)
  return (await res.json()) as T
}

/** Seeds a finished extraction run for a member, as the Edge Function would (test setup only). */
export async function seedExtractionRun(
  userId: string,
  url: string,
  fields: Record<string, unknown>[],
): Promise<string> {
  const [member] = await serviceRest<{ workspace_id: string }[]>(
    `workspace_members?user_id=eq.${userId}&select=workspace_id`,
  )
  if (!member) throw new Error('User has no workspace')
  const [run] = await serviceRest<{ id: string }[]>('extraction_runs', {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: member.workspace_id,
      requested_by: userId,
      source_url: url,
      final_url: url,
      http_status: 200,
      content_type: 'text/html',
      status: 'succeeded',
      finished_at: new Date().toISOString(),
    }),
  })
  await serviceRest('extraction_fields', {
    method: 'POST',
    body: JSON.stringify(
      fields.map((f) => ({
        run_id: run!.id,
        candidate_no: 1,
        value: null,
        evidence: null,
        rule_id: null,
        reason: null,
        ...f,
      })),
    ),
  })
  return run!.id
}
