import { describe, expect, it } from 'vitest'
import {
  addDays,
  expandRecurring,
  findClashes,
  addMonths,
  groupByDate,
  isoWeekday,
  itemDates,
  itemTime,
  layerOf,
  monthGrid,
  sourcePath,
  weekDays,
  type FeedItem,
} from './model'

const item = (over: Partial<FeedItem>): FeedItem => ({
  sourceType: 'event',
  sourceId: 'e1',
  parentId: null,
  title: 'x',
  kind: 'other',
  allDay: true,
  startDate: '2026-12-15',
  endDate: null,
  startsAt: null,
  endsAt: null,
  timezone: null,
  visibility: 'shared',
  rrule: null,
  exdates: [],
  occurrence: null,
  ...over,
})

describe('date-only arithmetic', () => {
  it('adds days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28')
  })
  it('knows ISO weekdays and adds months', () => {
    expect(isoWeekday('2026-11-16')).toBe(1) // Monday
    expect(isoWeekday('2026-11-22')).toBe(7) // Sunday
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2027-01', -1)).toBe('2026-12')
  })
  it('builds a Monday-first month grid and week', () => {
    const grid = monthGrid('2026-12')
    expect(grid).toHaveLength(42)
    expect(grid[0]).toBe('2026-11-30')
    expect(grid).toContain('2026-12-31')
    expect(weekDays('2026-12-17')).toEqual([
      '2026-12-14',
      '2026-12-15',
      '2026-12-16',
      '2026-12-17',
      '2026-12-18',
      '2026-12-19',
      '2026-12-20',
    ])
  })
})

describe('placing items (AC-18)', () => {
  it('keeps date-only items on their date in every zone', () => {
    for (const tz of ['Pacific/Kiritimati', 'America/Los_Angeles', 'Asia/Kolkata'])
      expect(itemDates(item({}), tz)).toEqual(['2026-12-15'])
  })
  it('spans multi-day all-day items', () => {
    expect(itemDates(item({ endDate: '2026-12-17' }), 'UTC')).toEqual([
      '2026-12-15',
      '2026-12-16',
      '2026-12-17',
    ])
  })
  it('places timed items on the viewer’s local date', () => {
    const timed = item({ allDay: false, startDate: null, startsAt: '2026-12-20T18:29:00Z' })
    expect(itemDates(timed, 'Asia/Kolkata')).toEqual(['2026-12-20'])
    expect(itemTime(timed, 'Asia/Kolkata')).toBe('23:59')
    expect(itemDates(timed, 'Pacific/Kiritimati')).toEqual(['2026-12-21'])
  })
  it('lists all-day items before timed ones', () => {
    const map = groupByDate(
      [
        item({ sourceId: 'b', allDay: false, startDate: null, startsAt: '2026-12-15T05:00:00Z' }),
        item({ sourceId: 'a' }),
      ],
      'UTC',
    )
    expect(map.get('2026-12-15')?.map((i) => i.sourceId)).toEqual(['a', 'b'])
  })
})

describe('layers and links (FR-CAL-02/03)', () => {
  it('assigns layers', () => {
    expect(layerOf(item({ visibility: 'private' }))).toBe('personal')
    expect(layerOf(item({ sourceType: 'opportunity_date' }))).toBe('deadlines')
    expect(layerOf(item({ sourceType: 'checklist_item' }))).toBe('projects')
  })
  it('links derived items to their source', () => {
    expect(sourcePath(item({ sourceType: 'opportunity_date', parentId: 'o1' }))).toBe(
      '/opportunities/o1',
    )
    expect(sourcePath(item({ sourceType: 'task', sourceId: 't1', parentId: 'p1' }))).toBe(
      '/projects/p1/board?task=t1',
    )
    expect(sourcePath(item({}))).toBeNull()
  })
})

describe('repeating events and clashes (FR-CAL-06/07)', () => {
  it('expands a weekly timed event at the same local time across a DST change', () => {
    const weekly = item({
      allDay: false,
      startDate: null,
      startsAt: '2026-10-26T16:00:00Z', // 09:00 in Los Angeles (PDT)
      endsAt: '2026-10-26T17:00:00Z',
      timezone: 'America/Los_Angeles',
      rrule: 'FREQ=WEEKLY',
    })
    const occ = expandRecurring([weekly], '2026-10-26', '2026-11-08')
    // One day of padding either side (zones differ); the view keeps only its own days.
    expect(occ.slice(0, 2).map((o) => o.startsAt)).toEqual([
      '2026-10-26T16:00:00.000Z',
      '2026-11-02T17:00:00.000Z', // still 09:00 after DST ends
    ])
    expect(occ[1]!.endsAt).toBe('2026-11-02T18:00:00.000Z')
    expect(occ.slice(0, 2).map((o) => o.occurrence)).toEqual(['2026-10-26', '2026-11-02'])
  })

  it('finds overlapping events, close deadlines and deadlines on exam days', () => {
    const clashes = findClashes(
      [
        item({
          sourceId: 'e1',
          allDay: false,
          startDate: null,
          startsAt: '2026-12-01T04:30:00Z',
          endsAt: '2026-12-01T05:30:00Z',
        }),
        item({
          sourceId: 'e2',
          allDay: false,
          startDate: null,
          startsAt: '2026-12-01T05:00:00Z',
          endsAt: '2026-12-01T06:00:00Z',
        }),
        item({ sourceId: 'd1', sourceType: 'opportunity_date', startDate: '2026-12-10' }),
        item({ sourceId: 'd2', sourceType: 'task', startDate: '2026-12-10' }),
        item({ sourceId: 'x1', kind: 'exam', startDate: '2026-12-10' }),
      ],
      'Asia/Kolkata',
    )
    expect(clashes.map((c) => c.kind).sort()).toEqual(['deadlines', 'exam', 'exam', 'overlap'])
  })
})
