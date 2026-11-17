import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { publicEnv } from './env'

export type LunaClient = SupabaseClient<Database>

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
    })
  : null

/** Use inside code that only runs when the backend is configured (guarded by ConfigGate). */
export function requireSupabase(): LunaClient {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}
