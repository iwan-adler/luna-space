import { ChevronLeft, ChevronRight, Lock, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { useViewerTimeZone } from '@/features/profile'
import { formatDateOnly, todayIn, type DateOnly } from '@/lib/dates'
import { EventDialog } from './EventDialog'
import { useCalendarEvent, useCalendarFeed } from './hooks'
import {
  addDays,
  addMonths,
  groupByDate,
  itemTime,
  LAYERS,
  layerOf,
  monthGrid,
  monthOf,
  sourcePath,
  weekDays,
  type FeedItem,
  type Layer,
} from './model'

type View = 'month' | 'week' | 'agenda'
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const tone: Record<Layer, string> = {
  shared: 'bg-primary/18 text-text border-primary/40',
  personal: 'bg-rose/15 text-text border-rose/40',
  deadlines: 'bg-moon/14 text-text border-moon/45',
  tasks: 'bg-info/14 text-text border-info/40',
  projects: 'bg-accent/14 text-text border-accent/40',
}
const dot: Record<Layer, string> = {
  shared: 'bg-primary',
  personal: 'bg-rose',
  deadlines: 'bg-moon',
  tasks: 'bg-info',
  projects: 'bg-accent',
}

/** /calendar — every date in one place (FR-CAL-01–04). State lives in the URL. */
export function CalendarPage() {
  const tz = useViewerTimeZone()
  const today = todayIn(tz)
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const view = (
    ['month', 'week', 'agenda'].includes(params.get('view') ?? '') ? params.get('view') : 'month'
  ) as View
  const focus = (params.get('date') ?? today) as DateOnly
  const hideParam = params.get('hide') ?? ''
  const hidden = useMemo(
    () => new Set(hideParam.split(',').filter(Boolean) as Layer[]),
    [hideParam],
  )
  const [editing, setEditing] = useState<{ id: string | null; day: DateOnly } | null>(null)
  const editEvent = useCalendarEvent(editing?.id ?? null)

  const days = useMemo(
    () =>
      view === 'month'
        ? monthGrid(monthOf(focus))
        : view === 'week'
          ? weekDays(focus)
          : Array.from({ length: 30 }, (_, i) => addDays(focus, i)),
    [view, focus],
  )
  const from = days[0]!
  const to = days[days.length - 1]!
  const feed = useCalendarFeed(from, to, tz)
  const byDate = useMemo(
    () =>
      groupByDate(
        (feed.data ?? []).filter((i) => !hidden.has(layerOf(i))),
        tz,
      ),
    [feed.data, tz, hidden],
  )

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }
  const step = (dir: 1 | -1) =>
    update({
      date:
        view === 'month'
          ? `${addMonths(monthOf(focus), dir)}-01`
          : addDays(focus, dir * (view === 'week' ? 7 : 30)),
    })
  const toggleLayer = (l: Layer) => {
    const next = new Set(hidden)
    if (next.has(l)) next.delete(l)
    else next.add(l)
    update({ hide: next.size ? [...next].join(',') : null })
  }
  const openItem = (item: FeedItem) => {
    if (item.sourceType === 'event') setEditing({ id: item.sourceId, day: focus })
    else {
      const path = sourcePath(item)
      if (path) void navigate(path)
    }
  }

  const heading =
    view === 'month'
      ? new Intl.DateTimeFormat('en-IN', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(Date.UTC(+focus.slice(0, 4), +focus.slice(5, 7) - 1, 1))
      : `${formatDateOnly(from)} – ${formatDateOnly(to)}`

  return (
    <section aria-labelledby="calendar-title" className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <p className="eyebrow">Calendar</p>
          <h1 id="calendar-title" className="font-display text-h1" data-testid="calendar-heading">
            {heading}
          </h1>
        </div>
        <Button
          icon={<Plus className="size-4" aria-hidden />}
          onClick={() =>
            setEditing({ id: null, day: focus < today && view !== 'month' ? today : focus })
          }
        >
          New event
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => step(-1)}
            className="grid size-9 place-items-center rounded-full text-muted hover:bg-hairline hover:text-text"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <Button variant="secondary" size="sm" onClick={() => update({ date: null })}>
            Today
          </Button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => step(1)}
            className="grid size-9 place-items-center rounded-full text-muted hover:bg-hairline hover:text-text"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
        <div
          role="tablist"
          aria-label="View"
          className="flex rounded-full border border-hairline bg-surface p-1 backdrop-blur-md"
        >
          {(['month', 'week', 'agenda'] as const).map((v) => (
            <button
              key={v}
              role="tab"
              type="button"
              aria-selected={view === v}
              onClick={() => update({ view: v === 'month' ? null : v })}
              className={`rounded-full px-3.5 py-1 text-body-sm capitalize ${view === v ? 'bg-primary-subtle text-text' : 'text-muted hover:text-text'}`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto" role="group" aria-label="Layers">
          {LAYERS.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={!hidden.has(l.id)}
              onClick={() => toggleLayer(l.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-caption transition-opacity ${hidden.has(l.id) ? 'border-hairline text-muted opacity-60' : 'border-border text-text'}`}
            >
              <span aria-hidden className={`size-2 rounded-full ${dot[l.id]}`} />
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {feed.isPending ? (
        <PageSpinner label="Loading calendar" />
      ) : feed.error ? (
        <Alert tone="danger">
          Couldn&apos;t load the calendar.{' '}
          <button type="button" className="underline" onClick={() => feed.refetch()}>
            Retry
          </button>
        </Alert>
      ) : view === 'agenda' ? (
        <Agenda days={days} byDate={byDate} tz={tz} today={today} onOpen={openItem} />
      ) : (
        <div className="panel overflow-hidden p-0" data-testid={`calendar-${view}`}>
          <div className="grid grid-cols-7 border-b border-hairline">
            {WEEKDAYS.map((d) => (
              <div key={d} className="eyebrow px-2 py-2 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const items = byDate.get(d) ?? []
              const outside = view === 'month' && monthOf(d) !== monthOf(focus)
              const max = view === 'month' ? 3 : 12
              return (
                <div
                  key={d}
                  data-date={d}
                  className={`group relative border-b border-l border-hairline p-1.5 first:border-l-0 [&:nth-child(7n+1)]:border-l-0 ${view === 'month' ? 'min-h-24 sm:min-h-28' : 'min-h-64'} ${outside ? 'opacity-45' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => setEditing({ id: null, day: d })}
                    aria-label={`Add an event on ${formatDateOnly(d)}`}
                    className={`mb-1 grid size-7 place-items-center rounded-full text-caption ${d === today ? 'btn-aurora font-semibold' : 'text-muted hover:bg-hairline hover:text-text'}`}
                  >
                    {Number(d.slice(8))}
                  </button>
                  <ul className="space-y-1">
                    {items.slice(0, max).map((item) => (
                      <li key={`${item.sourceType}:${item.sourceId}:${d}`}>
                        <ItemChip item={item} tz={tz} onOpen={openItem} />
                      </li>
                    ))}
                    {items.length > max ? (
                      <li>
                        <button
                          type="button"
                          className="px-1 text-caption text-muted hover:text-text"
                          onClick={() => update({ view: 'agenda', date: d })}
                        >
                          +{items.length - max} more
                        </button>
                      </li>
                    ) : null}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {editing && (!editing.id || editEvent.data) ? (
        <EventDialog
          key={editing.id ?? `new-${editing.day}`}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          event={editing.id ? (editEvent.data ?? null) : null}
          day={editing.day}
          viewerTz={tz}
        />
      ) : null}
    </section>
  )
}

function ItemChip({
  item,
  tz,
  onOpen,
}: {
  item: FeedItem
  tz: string
  onOpen: (i: FeedItem) => void
}) {
  const layer = layerOf(item)
  const time = itemTime(item, tz)
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      title={item.title}
      data-testid="calendar-item"
      className={`flex w-full items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-left text-[11px] leading-4 hover:brightness-125 ${tone[layer]}`}
    >
      {time ? <span className="shrink-0 text-muted">{time}</span> : null}
      {item.visibility === 'private' ? (
        <Lock className="size-2.5 shrink-0" aria-label="Private" />
      ) : null}
      <span className="truncate">{item.title}</span>
    </button>
  )
}

function Agenda({
  days,
  byDate,
  tz,
  today,
  onOpen,
}: {
  days: DateOnly[]
  byDate: Map<DateOnly, FeedItem[]>
  tz: string
  today: DateOnly
  onOpen: (i: FeedItem) => void
}) {
  const withItems = days.filter((d) => (byDate.get(d) ?? []).length > 0)
  if (withItems.length === 0)
    return (
      <p className="panel p-6 text-body-sm text-muted">
        Nothing scheduled in the next 30 days. Add an event, or save an opportunity with a deadline.
      </p>
    )
  return (
    <ol className="space-y-3" data-testid="calendar-agenda">
      {withItems.map((d) => (
        <li key={d} className="panel p-4">
          <h2 className="eyebrow mb-2">
            {d === today ? 'Today · ' : ''}
            {formatDateOnly(d, { weekday: true })}
          </h2>
          <ul className="space-y-1.5">
            {byDate.get(d)!.map((item) => {
              const layer = layerOf(item)
              return (
                <li key={`${item.sourceType}:${item.sourceId}`}>
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    data-testid="calendar-item"
                    className="flex w-full items-center gap-3 rounded-[10px] px-2 py-1.5 text-left text-body-sm hover:bg-hairline"
                  >
                    <span aria-hidden className={`size-2 shrink-0 rounded-full ${dot[layer]}`} />
                    <span className="w-12 shrink-0 text-caption text-muted">
                      {itemTime(item, tz) ?? 'All day'}
                    </span>
                    <span className="flex-1 truncate">{item.title}</span>
                    {item.visibility === 'private' ? (
                      <Lock className="size-3 text-muted" aria-label="Private" />
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </li>
      ))}
    </ol>
  )
}
