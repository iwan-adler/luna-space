/**
 * Public (browser-safe) configuration. Only VITE_* variables reach the bundle,
 * and only the Supabase URL and publishable/anon key may ever be listed here.
 * Secrets such as the service-role key live in Edge Function secrets only (TRD §17).
 */
export interface PublicEnv {
  supabaseUrl: string
  supabaseAnonKey: string
}

export type EnvResult = { ok: true; env: PublicEnv } | { ok: false; problems: string[] }

type RawEnv = Record<string, string | boolean | undefined>

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

function isAllowedUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol === 'https:') return true
    return url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname)
  } catch {
    return false
  }
}

export function readPublicEnv(raw: RawEnv): EnvResult {
  const url = typeof raw.VITE_SUPABASE_URL === 'string' ? raw.VITE_SUPABASE_URL.trim() : ''
  const key =
    typeof raw.VITE_SUPABASE_ANON_KEY === 'string' ? raw.VITE_SUPABASE_ANON_KEY.trim() : ''
  const problems: string[] = []

  if (!url) problems.push('VITE_SUPABASE_URL is not set')
  else if (!isAllowedUrl(url))
    problems.push('VITE_SUPABASE_URL must be https (or http on localhost)')

  if (!key) problems.push('VITE_SUPABASE_ANON_KEY is not set')
  else if (key.startsWith('sb_secret_'))
    problems.push('VITE_SUPABASE_ANON_KEY holds a secret key — use the publishable/anon key')

  return problems.length
    ? { ok: false, problems }
    : { ok: true, env: { supabaseUrl: url, supabaseAnonKey: key } }
}

export const publicEnv: EnvResult = readPublicEnv(import.meta.env)
