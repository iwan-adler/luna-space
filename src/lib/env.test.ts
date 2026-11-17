import { describe, expect, it } from 'vitest'
import { readPublicEnv } from './env'

describe('readPublicEnv', () => {
  it('accepts an https Supabase URL with a publishable key', () => {
    const result = readPublicEnv({
      VITE_SUPABASE_URL: 'https://abc.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_123',
    })
    expect(result).toEqual({
      ok: true,
      env: { supabaseUrl: 'https://abc.supabase.co', supabaseAnonKey: 'sb_publishable_123' },
    })
  })

  it('allows plain http only for the local Supabase stack', () => {
    expect(
      readPublicEnv({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: 'k' })
        .ok,
    ).toBe(true)
    expect(
      readPublicEnv({ VITE_SUPABASE_URL: 'http://example.com', VITE_SUPABASE_ANON_KEY: 'k' }).ok,
    ).toBe(false)
  })

  it('reports every missing variable', () => {
    const result = readPublicEnv({})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems).toHaveLength(2)
  })

  it('rejects a secret key placed in the public variable', () => {
    const result = readPublicEnv({
      VITE_SUPABASE_URL: 'https://abc.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_secret_abc',
    })
    expect(result.ok).toBe(false)
  })
})
