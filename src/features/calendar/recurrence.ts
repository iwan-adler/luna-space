import type { DateOnly } from '@/lib/dates'

/**
 * Repeating events (FR-CAL-06; ADR 0012): the same RRULE subset and rules as
 * private.occurrence_dates() in SQL, so the calendar and reminders agree.
 */
export type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY'
export const WEEKDAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const
export type WeekdayCode = (typeof WEEKDAY_CODES)[number]

export interface Rule {
  freq: Freq
  interval: number
  byDay: WeekdayCode[]
  until: DateOnly | null
  count: number | null
}

const ms = (d: DateOnly) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))
const fromMs = (t: number): DateOnly => new Date(t).toISOString().slice(0, 10)
const DAY = 86_400_000
const isoDow = (d: DateOnly) => ((new Date(ms(d)).getUTCDay() + 6) % 7) + 1
const mondayOf = (d: DateOnly) => ms(d) - (isoDow(d) - 1) * DAY

export function parseRule(rrule: string | null | undefined): Rule | null {
  if (!rrule) return null
  const parts = Object.fromEntries(rrule.split(';').map((p) => p.split('=') as [string, string]))
  const freq = parts.FREQ as Freq | undefined
  if (freq !== 'DAILY' && freq !== 'WEEKLY' && freq !== 'MONTHLY') return null
  const until = parts.UNTIL
    ? `${parts.UNTIL.slice(0, 4)}-${parts.UNTIL.slice(4, 6)}-${parts.UNTIL.slice(6, 8)}`
    : null
  return {
    freq,
    interval: parts.INTERVAL ? Number(parts.INTERVAL) : 1,
    byDay: parts.BYDAY
      ? (parts.BYDAY.split(',').filter((c) =>
          (WEEKDAY_CODES as readonly string[]).includes(c),
        ) as WeekdayCode[])
      : [],
    until,
    count: parts.COUNT ? Number(parts.COUNT) : null,
  }
}

/** Writes a rule in the fixed order the database accepts. */
export function buildRule(rule: Rule): string {
  let s = `FREQ=${rule.freq}`
  if (rule.interval > 1) s += `;INTERVAL=${rule.interval}`
  if (rule.freq === 'WEEKLY' && rule.byDay.length) {
    const ordered = WEEKDAY_CODES.filter((c) => rule.byDay.includes(c))
    s += `;BYDAY=${ordered.join(',')}`
  }
  if (rule.until) s += `;UNTIL=${rule.until.replace(/-/g, '')}`
  else if (rule.count) s += `;COUNT=${rule.count}`
  return s
}

/** Local dates of a series between `from` and `to` inclusive; `anchor` is the first date. */
export function occurrenceDates(
  anchor: DateOnly,
  rrule: string | null | undefined,
  exdates: DateOnly[],
  from: DateOnly,
  to: DateOnly,
): DateOnly[] {
  const rule = parseRule(rrule)
  if (!rule) return anchor >= from && anchor <= to ? [anchor] : []
  const days = rule.byDay.length ? rule.byDay : [WEEKDAY_CODES[isoDow(anchor) - 1]!]
  const limit = Math.min(ms(to), rule.until ? ms(rule.until) : Infinity, ms(anchor) + 3660 * DAY)
  const skip = new Set(exdates)
  const a = new Date(ms(anchor))
  const out: DateOnly[] = []
  let n = 0
  for (let t = ms(anchor); t <= limit; t += DAY) {
    const d = fromMs(t)
    const date = new Date(t)
    const hit =
      rule.freq === 'DAILY'
        ? Math.round((t - ms(anchor)) / DAY) % rule.interval === 0
        : rule.freq === 'WEEKLY'
          ? Math.round((mondayOf(d) - mondayOf(anchor)) / (7 * DAY)) % rule.interval === 0 &&
            days.includes(WEEKDAY_CODES[isoDow(d) - 1]!)
          : date.getUTCDate() === a.getUTCDate() &&
            ((date.getUTCFullYear() - a.getUTCFullYear()) * 12 +
              date.getUTCMonth() -
              a.getUTCMonth()) %
              rule.interval ===
              0
    if (!hit) continue
    n++
    if (rule.count && n > rule.count) break
    if (d >= from && !skip.has(d)) out.push(d)
  }
  return out
}

const DAY_NAMES: Record<WeekdayCode, string> = {
  MO: 'Mon',
  TU: 'Tue',
  WE: 'Wed',
  TH: 'Thu',
  FR: 'Fri',
  SA: 'Sat',
  SU: 'Sun',
}

/** "Every week on Mon, Wed", "Every 2 days until 9 Nov 2026" … */
export function describeRule(rrule: string | null | undefined): string | null {
  const r = parseRule(rrule)
  if (!r) return null
  const unit = r.freq === 'DAILY' ? 'day' : r.freq === 'WEEKLY' ? 'week' : 'month'
  let s = r.interval > 1 ? `Every ${r.interval} ${unit}s` : `Every ${unit}`
  if (r.freq === 'WEEKLY' && r.byDay.length)
    s += ` on ${r.byDay.map((c) => DAY_NAMES[c]).join(', ')}`
  if (r.until) s += ` until ${r.until}`
  else if (r.count) s += `, ${r.count} times`
  return s
}
