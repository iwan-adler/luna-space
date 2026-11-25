/**
 * Date helpers for Luna Space (TRD §4.2, Schema §16.1).
 *
 * Two kinds of values exist and are never mixed:
 * - **Date-only** values ("2026-12-15") are calendar dates. They are never converted through a
 *   `Date` at local midnight, so they cannot shift to the previous/next day in any time zone.
 * - **Instants** are ISO timestamps; they are displayed in a chosen IANA time zone.
 */

export type DateOnly = string

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

export function isDateOnly(value: string): value is DateOnly {
  const m = DATE_ONLY.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const probe = new Date(Date.UTC(y, mo - 1, d))
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d
}

function dateOnlyToUtcMs(value: DateOnly): number {
  const m = DATE_ONLY.exec(value)
  if (!m) throw new Error(`Not a date-only value: ${value}`)
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** "15 Dec 2026" — identical in every viewer time zone. */
export function formatDateOnly(value: DateOnly, options: { weekday?: boolean } = {}): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    weekday: options.weekday ? 'short' : undefined,
    timeZone: 'UTC',
  }).format(dateOnlyToUtcMs(value))
}

/** Converts "22:13" or "2026-11-21T22:13:00Z" to 12-hour format "10:13 PM". */
export function format12HourTime(timeOrIso: string): string {
  if (!timeOrIso) return ''
  const m = /(\d{1,2}):(\d{2})/.exec(timeOrIso)
  if (!m || !m[1] || !m[2]) return timeOrIso
  const h = parseInt(m[1], 10)
  const min = m[2]
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${min} ${period}`
}

function partsIn(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

/** Today's calendar date in a time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): DateOnly {
  const p = partsIn(now, timeZone)
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: DateOnly, to: DateOnly): number {
  return Math.round((dateOnlyToUtcMs(to) - dateOnlyToUtcMs(from)) / 86_400_000)
}

/** Offset of a time zone from UTC at a given instant, in milliseconds. */
export function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const p = partsIn(instant, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000
}

/**
 * Converts a wall-clock time in a time zone ("2026-12-20T23:59" in Asia/Kolkata) to an ISO instant.
 * Handles daylight-saving zones by re-checking the offset at the candidate instant.
 */
export function zonedLocalToUtcIso(local: string, timeZone: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local)
  if (!m) throw new Error(`Not a local date-time: ${local}`)
  const wall = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]))
  let guess = wall - timeZoneOffsetMs(new Date(wall), timeZone)
  const corrected = wall - timeZoneOffsetMs(new Date(guess), timeZone)
  if (corrected !== guess) guess = corrected
  return new Date(guess).toISOString()
}

/** ISO instant → wall-clock "YYYY-MM-DDTHH:mm" in a time zone (for edit forms). */
export function utcIsoToZonedLocal(iso: string, timeZone: string): string {
  const p = partsIn(new Date(iso), timeZone)
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

/** "20 Dec 2026, 23:59 IST" in the given zone. */
export function formatInstant(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
    timeZoneName: 'short',
  }).format(new Date(iso))
}

/** A deadline-like value: either a date-only date or an instant with its source zone. */
export interface DatedValue {
  all_day: boolean
  on_date: string | null
  at_time: string | null
  source_timezone: string | null
}

export type Urgency = 'passed' | 'today' | 'soon' | 'week' | 'later'

export interface DeadlineInfo {
  daysLeft: number
  urgency: Urgency
  relative: string
}

/** Days remaining from the viewer's "today" (FR-DASH-02, UI spec DeadlineBadge). */
export function deadlineInfo(
  value: DatedValue,
  viewerTz: string,
  now: Date = new Date(),
): DeadlineInfo {
  const target: DateOnly =
    value.all_day && value.on_date
      ? value.on_date
      : todayIn(viewerTz, new Date(value.at_time ?? now))
  const daysLeft = daysBetween(todayIn(viewerTz, now), target)
  const passed =
    daysLeft < 0 || (!value.all_day && value.at_time !== null && new Date(value.at_time) < now)
  const urgency: Urgency = passed
    ? 'passed'
    : daysLeft === 0
      ? 'today'
      : daysLeft <= 1
        ? 'soon'
        : daysLeft <= 7
          ? 'week'
          : 'later'
  const relative = passed
    ? daysLeft === 0
      ? 'passed today'
      : `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} ago`
    : daysLeft === 0
      ? 'today'
      : daysLeft === 1
        ? 'tomorrow'
        : `in ${daysLeft} days`
  return { daysLeft, urgency, relative }
}

/** Human display of a dated value, in the source zone for timed values. */
export function formatDated(value: DatedValue): string {
  if (value.all_day && value.on_date) return formatDateOnly(value.on_date)
  if (value.at_time) return formatInstant(value.at_time, value.source_timezone ?? 'UTC')
  return '—'
}

/** Adds hours to a wall-clock "YYYY-MM-DDTHH:mm" value without any time-zone conversion. */
export function addHoursLocal(local: string, hours: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local)
  if (!m) return local
  const t = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]! + hours, +m[5]!)
  return new Date(t).toISOString().slice(0, 16)
}
