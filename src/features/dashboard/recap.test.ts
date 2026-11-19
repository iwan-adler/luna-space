import { describe, expect, it } from 'vitest'
import { mondayOf, weekStartInstant, weekStreak } from './recap'

describe('weekly recap', () => {
  it('finds the Monday of a week', () => {
    expect(mondayOf('2026-11-19')).toBe('2026-11-16') // Thursday
    expect(mondayOf('2026-11-16')).toBe('2026-11-16')
    expect(mondayOf('2026-11-22')).toBe('2026-11-16') // Sunday
  })

  it('starts the week at local midnight on Monday', () => {
    expect(weekStartInstant('Asia/Kolkata', new Date('2026-11-19T10:00:00Z')).toISOString()).toBe(
      '2026-11-15T18:30:00.000Z',
    )
  })

  it('counts consecutive weeks with completed tasks', () => {
    const now = new Date('2026-11-19T10:00:00Z')
    const done = [
      '2026-11-18T09:00:00Z',
      '2026-11-10T09:00:00Z',
      '2026-11-03T09:00:00Z',
      '2026-10-01T09:00:00Z',
    ]
    expect(weekStreak(done, 'UTC', now)).toBe(3)
    // Nothing yet this week: the streak still counts from last week.
    expect(weekStreak(['2026-11-10T09:00:00Z', '2026-11-03T09:00:00Z'], 'UTC', now)).toBe(2)
    expect(weekStreak([], 'UTC', now)).toBe(0)
  })
})
