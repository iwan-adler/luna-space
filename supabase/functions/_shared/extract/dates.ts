import type { DateValue } from './types.ts'

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}
const MONTH =
  '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'

/** Common zone abbreviations on Indian and international event pages. */
export const ZONE_ABBREVIATIONS: Record<string, string> = {
  IST: 'Asia/Kolkata',
  UTC: 'UTC',
  GMT: 'UTC',
  PST: 'America/Los_Angeles',
  PDT: 'America/Los_Angeles',
  PT: 'America/Los_Angeles',
  EST: 'America/New_York',
  EDT: 'America/New_York',
  ET: 'America/New_York',
  CET: 'Europe/Berlin',
  CEST: 'Europe/Berlin',
  BST: 'Europe/London',
  SGT: 'Asia/Singapore',
  JST: 'Asia/Tokyo',
  AEST: 'Australia/Sydney',
  AEDT: 'Australia/Sydney',
}
const ZONE = `(${Object.keys(ZONE_ABBREVIATIONS).join('|')})`

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

function validDate(y: number, m: number, d: number): boolean {
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
}

function offsetMs(instant: Date, timeZone: string): number {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value)
  return (
    Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) -
    Math.floor(instant.getTime() / 1000) * 1000
  )
}

/** Wall-clock time in an IANA zone → ISO instant (DST-safe). */
export function zonedToIso(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  tz: string,
): string {
  const wall = Date.UTC(y, mo - 1, d, h, mi)
  let guess = wall - offsetMs(new Date(wall), tz)
  const second = wall - offsetMs(new Date(guess), tz)
  if (second !== guess) guess = second
  return new Date(guess).toISOString()
}

export interface FoundDate {
  value: DateValue
  /** Present when any part was assumed (year, day/month order, zone). */
  inferred: string | null
  raw: string
  index: number
  /** Second date of a range ("5–6 Dec 2026"). */
  rangeEnd?: { value: DateValue; inferred: string | null }
}

interface Ctx {
  now: Date
  defaultTimeZone: string
}

function resolveYear(
  y: string | undefined,
  m: number,
  d: number,
  ctx: Ctx,
): { year: number; inferred: string | null } {
  if (y) return { year: Number(y), inferred: null }
  const nowY = ctx.now.getUTCFullYear()
  const todayKey = ctx.now.getUTCMonth() * 100 + ctx.now.getUTCDate()
  const year = (m - 1) * 100 + d >= todayKey - 0 ? nowY : nowY + 1
  return { year, inferred: `year not stated; assumed ${year} (next occurrence)` }
}

function timeAfter(
  text: string,
  from: number,
): { h: number; mi: number; zone: string | null; length: number } | null {
  const rest = text.slice(from, from + 40)
  const m = new RegExp(
    `^\\s*(?:,|at|@|by|-|–|\\|)?\\s*(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm|a\\.m\\.|p\\.m\\.)?\\s*(?:\\(?\\s*${ZONE}\\s*\\)?)?`,
    'i',
  ).exec(rest)
  if (!m || !m[1]) return null
  const hasMinutes = m[2] !== undefined
  const meridiem = m[3]?.toLowerCase().replace(/\./g, '')
  if (!hasMinutes && !meridiem) return null
  let h = Number(m[1])
  const mi = hasMinutes ? Number(m[2]) : 0
  if (meridiem === 'pm' && h < 12) h += 12
  if (meridiem === 'am' && h === 12) h = 0
  if (h > 23 || mi > 59) return null
  return { h, mi, zone: m[4] ? m[4].toUpperCase() : null, length: m[0].length }
}

function build(
  y: number,
  m: number,
  d: number,
  time: ReturnType<typeof timeAfter>,
  ctx: Ctx,
  notes: string[],
): DateValue {
  if (!time)
    return {
      all_day: true,
      on_date: `${pad(y, 4)}-${pad(m)}-${pad(d)}`,
      at_time: null,
      source_timezone: null,
    }
  let tz = time.zone ? ZONE_ABBREVIATIONS[time.zone] : undefined
  if (!tz) {
    tz = ctx.defaultTimeZone
    notes.push(`time zone not stated; assumed ${tz}`)
  }
  return {
    all_day: false,
    on_date: null,
    at_time: zonedToIso(y, m, d, time.h, time.mi, tz),
    source_timezone: tz,
  }
}

/** Finds dates (and simple ranges) in free text. Never invents a time for a date-only mention. */
export function findDates(text: string, ctx: Ctx): FoundDate[] {
  const found: FoundDate[] = []
  const taken: [number, number][] = []
  const overlaps = (a: number, b: number) => taken.some(([x, y]) => a < y && b > x)
  const push = (f: FoundDate, len: number) => {
    if (overlaps(f.index, f.index + len)) return
    taken.push([f.index, f.index + len])
    found.push(f)
  }

  // Ranges first: "5–6 December 2026", "December 5-7, 2026", "Dec 5 – Dec 7 2026"
  const rangeA = new RegExp(
    `\\b(\\d{1,2})(?!\\d)(?:st|nd|rd|th)?\\s*(?:–|—|-|to)\\s*(\\d{1,2})(?!\\d)(?:st|nd|rd|th)?\\s+${MONTH}\\.?,?\\s*(\\d{4})?`,
    'gi',
  )
  for (const m of text.matchAll(rangeA)) {
    const mo = MONTHS[m[3]!.toLowerCase()]!
    const d1 = Number(m[1]),
      d2 = Number(m[2])
    const notes: string[] = []
    const { year, inferred } = resolveYear(m[4], mo, d1, ctx)
    if (inferred) notes.push(inferred)
    if (!validDate(year, mo, d1) || !validDate(year, mo, d2) || d2 < d1) continue
    const note = notes.join('; ') || null
    push(
      {
        value: build(year, mo, d1, null, ctx, []),
        inferred: note,
        raw: m[0],
        index: m.index!,
        rangeEnd: { value: build(year, mo, d2, null, ctx, []), inferred: note },
      },
      m[0].length,
    )
  }
  const rangeB = new RegExp(
    `\\b${MONTH}\\.?\\s+(\\d{1,2})(?!\\d)(?:st|nd|rd|th)?\\s*(?:–|—|-|to)\\s*(?:${MONTH}\\.?\\s+)?(\\d{1,2})(?!\\d)(?:st|nd|rd|th)?,?\\s*(\\d{4})?`,
    'gi',
  )
  for (const m of text.matchAll(rangeB)) {
    const mo1 = MONTHS[m[1]!.toLowerCase()]!
    const mo2 = m[3] ? MONTHS[m[3].toLowerCase()]! : mo1
    const d1 = Number(m[2]),
      d2 = Number(m[4])
    const notes: string[] = []
    const { year, inferred } = resolveYear(m[5], mo1, d1, ctx)
    if (inferred) notes.push(inferred)
    const y2 = mo2 < mo1 ? year + 1 : year
    if (!validDate(year, mo1, d1) || !validDate(y2, mo2, d2)) continue
    const note = notes.join('; ') || null
    push(
      {
        value: build(year, mo1, d1, null, ctx, []),
        inferred: note,
        raw: m[0],
        index: m.index!,
        rangeEnd: { value: build(y2, mo2, d2, null, ctx, []), inferred: note },
      },
      m[0].length,
    )
  }

  const singles: {
    re: RegExp
    read: (m: RegExpMatchArray) => { y?: string; mo: number; d: number; order?: string }
  }[] = [
    {
      re: /\b(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/g,
      read: (m) => ({ y: m[1], mo: Number(m[2]), d: Number(m[3]) }),
    },
    {
      re: new RegExp(
        `\\b(\\d{1,2})(?!\\d)(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH}\\.?,?\\s*(\\d{4})?`,
        'gi',
      ),
      read: (m) => ({ y: m[3], mo: MONTHS[m[2]!.toLowerCase()]!, d: Number(m[1]) }),
    },
    {
      re: new RegExp(
        `\\b${MONTH}\\.?\\s+(\\d{1,2})(?!\\d)(?:st|nd|rd|th)?(?:,\\s*|\\s+)?(\\d{4})?`,
        'gi',
      ),
      read: (m) => ({ y: m[3], mo: MONTHS[m[1]!.toLowerCase()]!, d: Number(m[2]) }),
    },
    {
      re: /\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/g,
      read: (m) => ({
        y: m[3],
        mo: Number(m[2]),
        d: Number(m[1]),
        order: 'day/month order assumed (dd/mm/yyyy)',
      }),
    },
  ]
  for (const { re, read } of singles) {
    for (const m of text.matchAll(re)) {
      const { y, mo, d, order } = read(m)
      const notes: string[] = []
      if (order) notes.push(order)
      const { year, inferred } = resolveYear(y, mo, d, ctx)
      if (inferred) notes.push(inferred)
      if (!validDate(year, mo, d)) continue
      // ISO with time inline
      let time = null as ReturnType<typeof timeAfter>
      if (m[4] !== undefined && m[5] !== undefined) {
        time = { h: Number(m[4]), mi: Number(m[5]), zone: null, length: 0 }
      } else {
        time = timeAfter(text, m.index! + m[0].length)
      }
      const value = build(year, mo, d, time, ctx, notes)
      push(
        { value, inferred: notes.join('; ') || null, raw: m[0], index: m.index! },
        m[0].length + (time?.length ?? 0),
      )
    }
  }
  return found.sort((a, b) => a.index - b.index)
}

/** Parses a schema.org date ("2026-12-15" or "2026-12-15T09:00:00+05:30"). */
export function parseIsoish(value: string): { value: DateValue; inferred: string | null } | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (dateOnly) {
    const [y, m, d] = [Number(dateOnly[1]), Number(dateOnly[2]), Number(dateOnly[3])]
    if (!validDate(y, m, d)) return null
    return {
      value: { all_day: true, on_date: value.trim(), at_time: null, source_timezone: null },
      inferred: null,
    }
  }
  const timed =
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/.exec(
      value.trim(),
    )
  if (!timed) return null
  const instant = new Date(value.trim())
  if (Number.isNaN(instant.getTime())) return null
  const offset = timed[4]
  if (!offset) return null
  const zone =
    offset === 'Z' || /^[+-]00:?00$/.test(offset)
      ? 'UTC'
      : /^\+05:?30$/.test(offset)
        ? 'Asia/Kolkata'
        : /^[+-]\d{2}:?00$/.test(offset)
          ? `Etc/GMT${offset[0] === '+' ? '-' : '+'}${Number(offset.slice(1, 3))}`
          : 'UTC'
  return {
    value: { all_day: false, on_date: null, at_time: instant.toISOString(), source_timezone: zone },
    inferred:
      zone === 'Asia/Kolkata' || zone === 'UTC' ? null : `time zone inferred from offset ${offset}`,
  }
}
