import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { publicEnv } from './env'

/**
 * The single browser Supabase client. It is `null` when the app is built without
 * configuration (e.g. CI or a fresh clone) so the shell can still render and explain
 * what is missing instead of crashing.
 *
 * Generated database types (src/types/database.ts, `npm run db:types`) are added
 * as the generic parameter once the first tables exist in Phase 1.
 */
export const supabase: SupabaseClient | null = publicEnv.ok
  ? createClient(publicEnv.env.supabaseUrl, publicEnv.env.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
