import { describe, expect, it } from 'vitest'
import {
  daysBetween,
  deadlineInfo,
  formatDateOnly,
  formatDated,
  isDateOnly,
  todayIn,
  utcIsoToZonedLocal,
  zonedLocalToUtcIso,
} from './dates'

describe('date-only values (AC-18)', () => {
  it('formats the same calendar date regardless of the runtime time zone', () => {
    expect(formatDateOnly('2026-12-15')).toBe('15 Dec 2026')
    expect(formatDateOnly('2027-01-01')).toBe('1 Jan 2027')
  })

  it('validates real calendar dates', () => {
    expect(isDateOnly('2026-02-28')).toBe(true)
    expect(isDateOnly('2026-02-30')).toBe(false)
    expect(isDateOnly('2026-2-3')).toBe(false)
  })

  it('counts whole days', () => {
    expect(daysBetween('2026-11-17', '2026-12-15')).toBe(28)
    expect(daysBetween('2026-12-15', '2026-12-14')).toBe(-1)
  })

  it('computes "today" per viewer zone', () => {
    const instant = new Date('2026-11-17T20:00:00Z') // 01:30 on 18 Nov in India
    expect(todayIn('Asia/Kolkata', instant)).toBe('2026-11-18')
    expect(todayIn('America/Los_Angeles', instant)).toBe('2026-11-17')
  })
})

describe('instants and zones', () => {
  it('converts IST wall-clock time to UTC', () => {
    expect(zonedLocalToUtcIso('2026-12-20T23:59', 'Asia/Kolkata')).toBe('2026-12-20T18:29:00.000Z')
  })

  it('handles daylight saving time zones', () => {
    // New York: UTC-4 in summer, UTC-5 in winter
    expect(zonedLocalToUtcIso('2026-07-01T09:00', 'America/New_York')).toBe(
      '2026-07-01T13:00:00.000Z',
    )
    expect(zonedLocalToUtcIso('2026-12-01T09:00', 'America/New_York')).toBe(
      '2026-12-01T14:00:00.000Z',
    )
  })

  it('round-trips wall-clock values', () => {
    const iso = zonedLocalToUtcIso('2026-03-29T10:15', 'Europe/Berlin')
    expect(utcIsoToZonedLocal(iso, 'Europe/Berlin')).toBe('2026-03-29T10:15')
  })

  it('formats timed values in the source zone', () => {
    expect(
      formatDated({
        all_day: false,
        on_date: null,
        at_time: '2026-12-20T18:29:00Z',
        source_timezone: 'Asia/Kolkata',
      }),
    ).toMatch(/20 Dec 2026, 23:59/)
  })
})

describe('deadlineInfo', () => {
  const now = new Date('2026-11-17T06:00:00Z')
  const dateOnly = (d: string) => ({
    all_day: true,
    on_date: d,
    at_time: null,
    source_timezone: null,
  })

  it('labels relative days', () => {
    expect(deadlineInfo(dateOnly('2026-11-17'), 'Asia/Kolkata', now)).toMatchObject({
      urgency: 'today',
      relative: 'today',
    })
    expect(deadlineInfo(dateOnly('2026-11-18'), 'Asia/Kolkata', now)).toMatchObject({
      urgency: 'soon',
      relative: 'tomorrow',
    })
    expect(deadlineInfo(dateOnly('2026-11-22'), 'Asia/Kolkata', now).urgency).toBe('week')
    expect(deadlineInfo(dateOnly('2026-12-30'), 'Asia/Kolkata', now).urgency).toBe('later')
    expect(deadlineInfo(dateOnly('2026-11-15'), 'Asia/Kolkata', now)).toMatchObject({
      urgency: 'passed',
      relative: '2 days ago',
    })
  })

  it('treats a timed deadline earlier today as passed', () => {
    const v = {
      all_day: false,
      on_date: null,
      at_time: '2026-11-17T05:00:00Z',
      source_timezone: 'UTC',
    }
    expect(deadlineInfo(v, 'UTC', now).urgency).toBe('passed')
  })
})
