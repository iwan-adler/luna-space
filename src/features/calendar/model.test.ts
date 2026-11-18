import { describe, expect, it } from 'vitest'
import {
  addDays,
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
