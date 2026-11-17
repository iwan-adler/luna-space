import { describe, expect, it } from 'vitest'
import { newPasswordSchema, signUpSchema } from './schemas'

describe('auth schemas', () => {
  it('requires passwords of at least 10 characters (TRD §6.1)', () => {
    const short = signUpSchema.safeParse({ displayName: 'A', email: 'a@x.io', password: 'short' })
    expect(short.success).toBe(false)
    const ok = signUpSchema.safeParse({
      displayName: 'Asha',
      email: 'a@x.io',
      password: 'long-enough-1',
    })
    expect(ok.success).toBe(true)
  })

  it('rejects invalid emails and blank names', () => {
    expect(
      signUpSchema.safeParse({ displayName: ' ', email: 'x', password: 'long-enough-1' }).success,
    ).toBe(false)
  })

  it('requires matching new passwords', () => {
    const r = newPasswordSchema.safeParse({ password: 'long-enough-1', confirm: 'different-1' })
    expect(r.success).toBe(false)
  })
})
