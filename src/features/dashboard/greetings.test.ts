import { describe, expect, it } from 'vitest'
import {
  formatGreeting,
  getGreeting,
  getLocalHour,
  getTimeBucket,
  pickGreeting,
  type TimeBucket,
} from './greetings'

describe('greetings system', () => {
  it('correctly maps hours to time buckets', () => {
    // Late night (12am - 4am)
    expect(getTimeBucket(0)).toBe('late_night')
    expect(getTimeBucket(1)).toBe('late_night')
    expect(getTimeBucket(3)).toBe('late_night')

    // Early morning (4am - 7am)
    expect(getTimeBucket(4)).toBe('early_morning')
    expect(getTimeBucket(5)).toBe('early_morning')
    expect(getTimeBucket(6)).toBe('early_morning')

    // Morning (7am - 12pm)
    expect(getTimeBucket(7)).toBe('morning')
    expect(getTimeBucket(9)).toBe('morning')
    expect(getTimeBucket(11)).toBe('morning')

    // Afternoon (12pm - 5pm)
    expect(getTimeBucket(12)).toBe('afternoon')
    expect(getTimeBucket(14)).toBe('afternoon')
    expect(getTimeBucket(16)).toBe('afternoon')

    // Evening (5pm - 9pm)
    expect(getTimeBucket(17)).toBe('evening')
    expect(getTimeBucket(19)).toBe('evening')
    expect(getTimeBucket(20)).toBe('evening')

    // Night (9pm - 12am)
    expect(getTimeBucket(21)).toBe('night')
    expect(getTimeBucket(22)).toBe('night')
    expect(getTimeBucket(23)).toBe('night')
  })

  it('formats greetings with first name', () => {
    expect(formatGreeting('Good morning, {name}', 'Alex')).toBe('Good morning, Alex')
    expect(formatGreeting('Burning the midnight oil, {name}?', 'Alex Smith')).toBe(
      'Burning the midnight oil, Alex?',
    )
    expect(formatGreeting("Still up, {name}? Let's make it count", 'IRON')).toBe(
      "Still up, IRON? Let's make it count",
    )
  })

  it('formats greetings naturally without name', () => {
    expect(formatGreeting('Good morning, {name}')).toBe('Good morning')
    expect(formatGreeting('Burning the midnight oil, {name}?')).toBe('Burning the midnight oil?')
    expect(formatGreeting('Rise and ship, {name}')).toBe('Rise and ship')
    expect(formatGreeting('Night owl mode: on, {name}')).toBe('Night owl mode: on')
  })

  it('calculates local hour correctly for timezones', () => {
    // 2026-11-22T04:00:00Z (UTC hour 4)
    const date = new Date('2026-11-22T04:00:00Z')
    // In UTC, hour is 4
    expect(getLocalHour(date, 'UTC')).toBe(4)
    // In Asia/Kolkata (+5:30), hour is 9:30 => 9
    expect(getLocalHour(date, 'Asia/Kolkata')).toBe(9)
    // In America/New_York (-5:00), hour is 23 (previous day)
    expect(getLocalHour(date, 'America/New_York')).toBe(23)
  })

  it('generates valid greetings for every time bucket', () => {
    const buckets: { hour: number; expectedBucket: TimeBucket }[] = [
      { hour: 2, expectedBucket: 'late_night' },
      { hour: 5, expectedBucket: 'early_morning' },
      { hour: 9, expectedBucket: 'morning' },
      { hour: 14, expectedBucket: 'afternoon' },
      { hour: 18, expectedBucket: 'evening' },
      { hour: 22, expectedBucket: 'night' },
    ]

    for (const { hour, expectedBucket } of buckets) {
      const d = new Date()
      d.setHours(hour, 0, 0, 0)
      const res = pickGreeting({ date: d, name: 'Luna', random: () => 0.5 })
      expect(res.bucket).toBe(expectedBucket)
      expect(res.greeting.length).toBeGreaterThan(0)
      expect(res.greeting).toContain('Luna')
      expect(res.subtitle.length).toBeGreaterThan(0)
    }
  })

  it('never returns the last greeting if alternatives are available', () => {
    const d = new Date()
    d.setHours(10, 0, 0, 0) // Morning
    const first = pickGreeting({ date: d, name: 'Alex', random: () => 0 })
    const second = pickGreeting({
      date: d,
      name: 'Alex',
      lastGreeting: first.greeting,
      random: () => 0,
    })
    expect(second.greeting).not.toBe(first.greeting)
  })

  it('supports context-aware greetings (days gap, deadlines)', () => {
    // Long gap: daysSinceLastVisit >= 2
    const welcomeRes = pickGreeting({
      date: new Date(),
      name: 'Dev',
      daysSinceLastVisit: 5,
      random: () => 0.05, // triggers context branch
    })
    expect(welcomeRes.greeting).toMatch(/Welcome back, Dev|Great to see you again, Dev/)

    // Demo day deadline
    const deadlineRes = pickGreeting({
      date: new Date(),
      name: 'Dev',
      deadlineDays: 1,
      random: () => 0.05, // triggers context branch
    })
    expect(deadlineRes.greeting).toBe('Demo day is tomorrow, Dev!')
  })

  it('works as a simple shorthand via getGreeting(date, name, last)', () => {
    const d = new Date()
    d.setHours(8, 0, 0, 0)
    const greeting = getGreeting(d, 'Sarah')
    expect(typeof greeting).toBe('string')
    expect(greeting).toContain('Sarah')
  })
})
