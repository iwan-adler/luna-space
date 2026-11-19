import { todayIn, zonedLocalToUtcIso, type DateOnly } from '@/lib/dates'

const DAY = 86_400_000
const ms = (d: DateOnly) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))

/** Monday of the week containing `day` (ISO weeks). */
export function mondayOf(day: DateOnly): DateOnly {
  const t = ms(day)
  const weekday = (new Date(t).getUTCDay() + 6) % 7 // 0 = Monday
  return new Date(t - weekday * DAY).toISOString().slice(0, 10)
}

/** The instant this week started (Monday 00:00 in the viewer's zone). */
export function weekStartInstant(viewerTz: string, now = new Date()): Date {
  return new Date(zonedLocalToUtcIso(`${mondayOf(todayIn(viewerTz, now))}T00:00`, viewerTz))
}

/**
 * Consecutive weeks, up to this one, in which at least one task was completed. The current
 * week counts if it already has one; otherwise the streak may still continue from last week.
 */
export function weekStreak(completedAt: string[], viewerTz: string, now = new Date()): number {
  const weeks = new Set(completedAt.map((iso) => mondayOf(todayIn(viewerTz, new Date(iso)))))
  let week = mondayOf(todayIn(viewerTz, now))
  if (!weeks.has(week)) week = new Date(ms(week) - 7 * DAY).toISOString().slice(0, 10)
  let n = 0
  while (weeks.has(week)) {
    n++
    week = new Date(ms(week) - 7 * DAY).toISOString().slice(0, 10)
  }
  return n
}
