import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { publicEnv } from './env'

export type LunaClient = SupabaseClient<Database>

let workspaceHeader: string | null = null

/**
 * Which workspace this tab is looking at (ADR 0018). Sent as `x-workspace-id` on database API
 * calls; the database uses it only when the caller is a member of that workspace.
 */
export function setWorkspaceHeader(id: string | null) {
  workspaceHeader = id
}
export function getWorkspaceHeader(): string | null {
  return workspaceHeader
}

const fetchWithWorkspace: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (!workspaceHeader || !url.includes('/rest/v1/')) return fetch(input, init)
  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined),
  )
  headers.set('x-workspace-id', workspaceHeader)
  return fetch(input, { ...init, headers })
}

/**
 * The single browser Supabase client. It is `null` when the app is built without
 * configuration (e.g. a fresh clone) so the shell can explain what is missing instead of crashing.
 */
export const supabase: LunaClient | null = publicEnv.ok
  ? createClient<Database>(publicEnv.env.supabaseUrl, publicEnv.env.supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: { fetch: fetchWithWorkspace },
    })
  : null

/** Use inside code that only runs when the backend is configured (guarded by ConfigGate). */
export function requireSupabase(): LunaClient {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}
