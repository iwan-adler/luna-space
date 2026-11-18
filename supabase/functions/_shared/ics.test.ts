import { describe, expect, it } from 'vitest'
import { buildCalendar, type IcsRow } from './ics'

const row = (over: Partial<IcsRow>): IcsRow => ({
  source_type: 'event',
  source_id: 'e1',
  parent_id: null,
  title: 'Team sync',
  kind: 'meeting',
  all_day: false,
  start_date: null,
  end_date: null,
  starts_at: null,
  ends_at: null,
  timezone: null,
  rrule: null,
  exdates: null,
  location: null,
  description: null,
  updated_at: '2026-11-18T10:00:00Z',
  ...over,
})
const SITE = 'https://lunaspace.example'
const NOW = '2026-11-18T12:00:00Z'
const unfold = (s: string) => s.replace(/\r\n /g, '')

describe('iCalendar feed', () => {
  it('wraps events in a calendar with CRLF line endings', () => {
    const ics = buildCalendar([], SITE, NOW)
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics).toContain('X-WR-CALNAME:Luna Space')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('keeps date-only deadlines on their date (AC-18)', () => {
    const ics = buildCalendar(
      [
        row({
          source_type: 'opportunity_date',
          source_id: 'd1',
          parent_id: 'o1',
          title: 'Hack — registration deadline',
          all_day: true,
          start_date: '2026-12-15',
          end_date: '2026-12-15',
        }),
      ],
      SITE,
      NOW,
    )
    expect(ics).toContain('DTSTART;VALUE=DATE:20261215\r\nDTEND;VALUE=DATE:20261216')
    expect(ics).toContain('CATEGORIES:Deadline')
    expect(unfold(ics)).toContain('URL:https://lunaspace.example/opportunities/o1')
  })

  it('writes one-off timed events in UTC', () => {
    const ics = buildCalendar(
      [
        row({
          starts_at: '2026-12-01T04:30:00Z',
          ends_at: '2026-12-01T05:30:00Z',
          timezone: 'Asia/Kolkata',
        }),
      ],
      SITE,
      NOW,
    )
    expect(ics).toContain('DTSTART:20261201T043000Z\r\nDTEND:20261201T053000Z')
  })

  it('writes repeating timed events in their own zone, with a UTC UNTIL and skipped dates', () => {
    const ics = unfold(
      buildCalendar(
        [
          row({
            starts_at: '2026-10-26T16:00:00Z',
            ends_at: '2026-10-26T17:00:00Z',
            timezone: 'America/Los_Angeles',
            rrule: 'FREQ=WEEKLY;BYDAY=MO;UNTIL=20261231',
            exdates: ['2026-11-09'],
          }),
        ],
        SITE,
        NOW,
      ),
    )
    expect(ics).toContain('DTSTART;TZID=America/Los_Angeles:20261026T090000')
    expect(ics).toContain('DTEND;TZID=America/Los_Angeles:20261026T100000')
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261231T235959Z')
    expect(ics).toContain('EXDATE;TZID=America/Los_Angeles:20261109T090000')
  })

  it('escapes text and folds long lines', () => {
    const ics = buildCalendar(
      [
        row({
          all_day: true,
          start_date: '2026-12-01',
          title: 'Plan; agenda, notes\nand more',
          description: 'x'.repeat(200),
        }),
      ],
      SITE,
      NOW,
    )
    expect(ics).toContain('SUMMARY:Plan\\; agenda\\, notes\\nand more')
    expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true)
  })
})
