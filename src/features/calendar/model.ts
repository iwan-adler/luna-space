import { utcIsoToZonedLocal, type DateOnly } from '@/lib/dates'
import type { Database } from '@/types/database'

type FeedRow = Database['public']['Views']['calendar_feed']['Row']
export type CalendarEvent = Database['public']['Tables']['calendar_events']['Row']
export type EventKind = Database['public']['Enums']['event_kind']

export type SourceType = 'event' | 'opportunity_date' | 'task' | 'project_end' | 'checklist_item'

/** A calendar entry, normalised from the feed view (all fields present). */
export interface FeedItem {
  sourceType: SourceType
  sourceId: string
  parentId: string | null
  title: string
  kind: string
  allDay: boolean
  startDate: DateOnly | null
  endDate: DateOnly | null
  startsAt: string | null
  endsAt: string | null
  timezone: string | null
  visibility: 'shared' | 'private'
}

export function toFeedItem(r: FeedRow): FeedItem | null {
  if (!r.source_type || !r.source_id || !r.title) return null
  return {
    sourceType: r.source_type as SourceType,
    sourceId: r.source_id,
    parentId: r.parent_id,
    title: r.title,
    kind: r.kind ?? 'other',
    allDay: Boolean(r.all_day),
    startDate: r.start_date,
    endDate: r.end_date,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    timezone: r.timezone,
    visibility: r.visibility ?? 'shared',
  }
}

// Date-only arithmetic in UTC, so no value ever crosses a local midnight (ADR 0003).
const ms = (d: DateOnly) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))
const fromMs = (t: number): DateOnly => new Date(t).toISOString().slice(0, 10)

export function addDays(d: DateOnly, n: number): DateOnly {
  return fromMs(ms(d) + n * 86_400_000)
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(d: DateOnly): number {
  return ((new Date(ms(d)).getUTCDay() + 6) % 7) + 1
}

export function startOfWeek(d: DateOnly): DateOnly {
  return addDays(d, 1 - isoWeekday(d))
}

export function monthOf(d: DateOnly): string {
  return d.slice(0, 7)
}

export function addMonths(month: string, n: number): string {
  const y = +month.slice(0, 4)
  const m = +month.slice(5, 7) - 1 + n
  const date = new Date(Date.UTC(y, m, 1))
  return date.toISOString().slice(0, 7)
}

/** Six Monday-first weeks covering the month, as 42 dates. */
export function monthGrid(month: string): DateOnly[] {
  const first = startOfWeek(`${month}-01`)
  return Array.from({ length: 42 }, (_, i) => addDays(first, i))
}

export function weekDays(d: DateOnly): DateOnly[] {
  const first = startOfWeek(d)
  return Array.from({ length: 7 }, (_, i) => addDays(first, i))
}

/** Every calendar date an item covers in the viewer's zone (multi-day all-day items span). */
export function itemDates(item: FeedItem, viewerTz: string): DateOnly[] {
  if (item.allDay && item.startDate) {
    const end = item.endDate && item.endDate > item.startDate ? item.endDate : item.startDate
    const out: DateOnly[] = []
    for (let d = item.startDate; d <= end && out.length < 62; d = addDays(d, 1)) out.push(d)
    return out
  }
  if (item.startsAt) return [utcIsoToZonedLocal(item.startsAt, viewerTz).slice(0, 10)]
  return []
}

/** "HH:mm" in the viewer's zone for timed items, otherwise null. */
export function itemTime(item: FeedItem, viewerTz: string): string | null {
  return !item.allDay && item.startsAt
    ? utcIsoToZonedLocal(item.startsAt, viewerTz).slice(11)
    : null
}

export function groupByDate(items: FeedItem[], viewerTz: string): Map<DateOnly, FeedItem[]> {
  const map = new Map<DateOnly, FeedItem[]>()
  for (const item of items) {
    for (const d of itemDates(item, viewerTz)) {
      const list = map.get(d) ?? []
      list.push(item)
      map.set(d, list)
    }
  }
  for (const list of map.values())
    list.sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
      return (itemTime(a, viewerTz) ?? '').localeCompare(itemTime(b, viewerTz) ?? '')
    })
  return map
}

export type Layer = 'shared' | 'personal' | 'deadlines' | 'tasks' | 'projects'

export const LAYERS: { id: Layer; label: string }[] = [
  { id: 'shared', label: 'Shared' },
  { id: 'personal', label: 'Personal' },
  { id: 'deadlines', label: 'Deadlines' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'projects', label: 'Projects' },
]

export function layerOf(item: FeedItem): Layer {
  switch (item.sourceType) {
    case 'event':
      return item.visibility === 'private' ? 'personal' : 'shared'
    case 'opportunity_date':
      return 'deadlines'
    case 'task':
      return 'tasks'
    default:
      return 'projects'
  }
}

/** Where an item lives; derived items are edited at their source (FR-CAL-03). */
export function sourcePath(item: FeedItem): string | null {
  switch (item.sourceType) {
    case 'opportunity_date':
      return item.parentId ? `/opportunities/${item.parentId}` : null
    case 'task':
      return item.parentId ? `/projects/${item.parentId}/board?task=${item.sourceId}` : '/tasks'
    case 'project_end':
      return `/projects/${item.sourceId}/overview`
    case 'checklist_item':
      return item.parentId ? `/projects/${item.parentId}/checklist` : null
    default:
      return null
  }
}

export const KIND_LABELS: Record<EventKind, string> = {
  meeting: 'Meeting',
  deadline: 'Deadline',
  milestone: 'Milestone',
  assignment: 'Assignment',
  exam: 'Exam',
  class: 'Class',
  lab: 'Lab',
  travel: 'Travel',
  focus: 'Focus time',
  personal: 'Personal',
  other: 'Other',
}

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'No reminder' },
  { value: 0, label: 'At the start' },
  { value: 15, label: '15 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
  { value: 4320, label: '3 days before' },
  { value: 10080, label: '1 week before' },
]
