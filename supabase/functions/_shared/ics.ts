/**
 * iCalendar (RFC 5545) output for the private sync link (ADR 0013). Pure: tested with Vitest.
 * - all-day items use VALUE=DATE, so they stay on their date in every zone (AC-18);
 * - one-off timed items use UTC;
 * - repeating timed events use TZID + local time, so they keep their wall-clock time across
 *   daylight-saving changes, with UNTIL converted to UTC as the RFC requires.
 */
export interface IcsRow {
  source_type: string
  source_id: string
  parent_id: string | null
  title: string
  kind: string
  all_day: boolean
  start_date: string | null
  end_date: string | null
  starts_at: string | null
  ends_at: string | null
  timezone: string | null
  rrule: string | null
  exdates: string[] | null
  location: string | null
  description: string | null
  updated_at: string
}

const escapeText = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')

/** Folds lines longer than 75 characters with CRLF + space. */
function fold(line: string): string {
  if (line.length <= 75) return line
  const parts: string[] = [line.slice(0, 75)]
  for (let i = 75; i < line.length; i += 74) parts.push(` ${line.slice(i, i + 74)}`)
  return parts.join('\r\n')
}

const ymd = (d: string) => d.replace(/-/g, '')
const utc = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
const nextDay = (d: string) =>
  new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)

/** Wall-clock "YYYYMMDDTHHMMSS" of an instant in a zone. */
function local(iso: string, zone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(iso))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return `${get('year')}${get('month')}${get('day')}T${get('hour')}${get('minute')}${get('second')}`
}

/** Link back to the item in Luna Space. */
export function appPath(row: IcsRow): string {
  switch (row.source_type) {
    case 'opportunity_date':
      return `/opportunities/${row.parent_id}`
    case 'task':
      return row.parent_id ? `/projects/${row.parent_id}/board?task=${row.source_id}` : '/tasks'
    case 'project_end':
      return `/projects/${row.source_id}/overview`
    default: {
      const day = row.start_date ?? row.starts_at?.slice(0, 10) ?? ''
      return `/calendar?view=day&date=${day}`
    }
  }
}

function event(row: IcsRow, siteUrl: string, now: string): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${row.source_type}-${row.source_id}@lunaspace`,
    `DTSTAMP:${utc(now)}`,
    `LAST-MODIFIED:${utc(row.updated_at)}`,
    `SUMMARY:${escapeText(row.title)}`,
  ]
  const repeating = Boolean(row.rrule)
  const zone = row.timezone
  if (row.all_day && row.start_date) {
    lines.push(`DTSTART;VALUE=DATE:${ymd(row.start_date)}`)
    lines.push(`DTEND;VALUE=DATE:${ymd(nextDay(row.end_date ?? row.start_date))}`)
    if (repeating) {
      lines.push(`RRULE:${row.rrule}`)
      if (row.exdates?.length) lines.push(`EXDATE;VALUE=DATE:${row.exdates.map(ymd).join(',')}`)
    }
  } else if (row.starts_at) {
    const end =
      row.ends_at ??
      new Date(
        Date.parse(row.starts_at) + (row.source_type === 'event' ? 3_600_000 : 1_800_000),
      ).toISOString()
    if (repeating && zone) {
      lines.push(`DTSTART;TZID=${zone}:${local(row.starts_at, zone)}`)
      lines.push(`DTEND;TZID=${zone}:${local(end, zone)}`)
      // With a TZID start, UNTIL must be given in UTC (RFC 5545 §3.3.10).
      lines.push(`RRULE:${row.rrule!.replace(/UNTIL=(\d{8})(?!T)/, 'UNTIL=$1T235959Z')}`)
      if (row.exdates?.length) {
        const time = local(row.starts_at, zone).slice(8)
        lines.push(`EXDATE;TZID=${zone}:${row.exdates.map((d) => `${ymd(d)}${time}`).join(',')}`)
      }
    } else {
      lines.push(`DTSTART:${utc(row.starts_at)}`)
      lines.push(`DTEND:${utc(end)}`)
    }
  } else {
    return []
  }
  if (row.location) lines.push(`LOCATION:${escapeText(row.location)}`)
  const link = `${siteUrl.replace(/\/$/, '')}${appPath(row)}`
  const details = [row.description, `Open in Luna Space: ${link}`].filter(Boolean).join('\n')
  lines.push(`DESCRIPTION:${escapeText(details)}`)
  lines.push(`URL:${link}`)
  if (row.source_type !== 'event')
    lines.push(`CATEGORIES:${row.source_type === 'task' ? 'Task' : 'Deadline'}`)
  lines.push('END:VEVENT')
  return lines
}

export function buildCalendar(
  rows: IcsRow[],
  siteUrl: string,
  now = new Date().toISOString(),
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Luna Space//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Luna Space',
    'X-PUBLISHED-TTL:PT1H',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    ...rows.flatMap((r) => event(r, siteUrl, now)),
    'END:VCALENDAR',
  ]
  return `${lines.map(fold).join('\r\n')}\r\n`
}
