import { describe, expect, it } from 'vitest'
import { AppError, messageForCode, toAppError } from './errors'

describe('errors', () => {
  it('maps invitation codes to plain language', () => {
    expect(toAppError({ code: 'INVITE_INVALID' }).message).toMatch(/no longer valid/)
    expect(toAppError({ code: 'WORKSPACE_FULL' }).code).toBe('WORKSPACE_FULL')
  })

  it('prefers the hint code raised by SQL functions', () => {
    const e = toAppError({ code: 'P0001', hint: 'ALREADY_IN_WORKSPACE', message: 'raw' })
    expect(e.code).toBe('ALREADY_IN_WORKSPACE')
    expect(e.message).toMatch(/already belong/)
  })

  it('maps Postgres permission errors', () => {
    expect(toAppError({ code: '42501', message: 'new row violates rls' }).message).toMatch(
      /permission/,
    )
  })

  it('falls back to the original message for unknown codes', () => {
    expect(toAppError({ code: 'XX000', message: 'boom' }).message).toBe('boom')
    expect(messageForCode(undefined)).toBe('Something went wrong.')
  })

  it('passes AppError through unchanged', () => {
    const e = new AppError('x', 'y')
    expect(toAppError(e)).toBe(e)
  })
})
