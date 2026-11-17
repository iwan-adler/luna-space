import { describe, expect, it } from 'vitest'
import { listTimeZones, normalizeTimeZone, timeZoneOptions } from './timezones'

describe('time zones', () => {
  it('uses current IANA names', () => {
    expect(normalizeTimeZone('Asia/Calcutta')).toBe('Asia/Kolkata')
    expect(listTimeZones()).toContain('Asia/Kolkata')
    expect(listTimeZones()).not.toContain('Asia/Calcutta')
  })

  it('always includes the stored value in options', () => {
    expect(timeZoneOptions('Etc/GMT+3').some((o) => o.value === 'Etc/GMT+3')).toBe(true)
  })
})
