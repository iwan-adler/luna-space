import { describe, expect, it } from 'vitest'
import { buildRule, describeRule, occurrenceDates, parseRule } from './recurrence'

// The same cases as the SQL function private.occurrence_dates (migration 0016).
describe('occurrenceDates (FR-CAL-06)', () => {
  it('weekly on chosen days, skipping an excluded date', () => {
    expect(
      occurrenceDates(
        '2026-11-02',
        'FREQ=WEEKLY;BYDAY=MO,WE',
        ['2026-11-09'],
        '2026-11-01',
        '2026-11-20',
      ),
    ).toEqual(['2026-11-02', '2026-11-04', '2026-11-11', '2026-11-16', '2026-11-18'])
  })
  it('monthly with a count skips months without that day', () => {
    expect(
      occurrenceDates('2026-01-31', 'FREQ=MONTHLY;COUNT=3', [], '2026-01-01', '2026-12-31'),
    ).toEqual(['2026-01-31', '2026-03-31', '2026-05-31'])
  })
  it('every other day until a date', () => {
    expect(
      occurrenceDates(
        '2026-11-01',
        'FREQ=DAILY;INTERVAL=2;UNTIL=20261109',
        [],
        '2026-11-01',
        '2026-12-31',
      ),
    ).toEqual(['2026-11-01', '2026-11-03', '2026-11-05', '2026-11-07', '2026-11-09'])
  })
  it('weekly without BYDAY repeats on the first date’s weekday, every 2 weeks', () => {
    expect(
      occurrenceDates('2026-11-04', 'FREQ=WEEKLY;INTERVAL=2', [], '2026-11-01', '2026-12-10'),
    ).toEqual(['2026-11-04', '2026-11-18', '2026-12-02'])
  })
  it('counts occurrences from the start even when the window starts later', () => {
    expect(
      occurrenceDates('2026-11-01', 'FREQ=DAILY;COUNT=5', [], '2026-11-04', '2026-11-30'),
    ).toEqual(['2026-11-04', '2026-11-05'])
  })
  it('treats a missing rule as a single date', () => {
    expect(occurrenceDates('2026-11-05', null, [], '2026-11-01', '2026-11-30')).toEqual([
      '2026-11-05',
    ])
    expect(occurrenceDates('2026-12-05', null, [], '2026-11-01', '2026-11-30')).toEqual([])
  })
})

describe('rule text', () => {
  it('round-trips in the order the database accepts', () => {
    const rule = {
      freq: 'WEEKLY' as const,
      interval: 2,
      byDay: ['WE' as const, 'MO' as const],
      until: '2027-01-31',
      count: null,
    }
    expect(buildRule(rule)).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;UNTIL=20270131')
    expect(parseRule(buildRule(rule))).toEqual({ ...rule, byDay: ['MO', 'WE'] })
    expect(buildRule({ freq: 'DAILY', interval: 1, byDay: [], until: null, count: 10 })).toBe(
      'FREQ=DAILY;COUNT=10',
    )
  })
  it('describes rules in plain words', () => {
    expect(describeRule('FREQ=WEEKLY;BYDAY=MO,WE')).toBe('Every week on Mon, Wed')
    expect(describeRule('FREQ=DAILY;INTERVAL=2;UNTIL=20261109')).toBe(
      'Every 2 days until 2026-11-09',
    )
    expect(describeRule(null)).toBeNull()
  })
})
