import { SkeletonList } from '@/components/ui/Skeleton'
import { AlertTriangle, ArrowRight, Lock, Repeat } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { useViewerTimeZone } from '@/features/profile'
import { formatDateOnly, todayIn } from '@/lib/dates'
import { useCalendarFeed } from './hooks'
import {
  addDays,
  findClashes,
  groupByDate,
  itemKey,
  itemTime,
  layerOf,
  sourcePath,
  type Layer,
} from './model'

const dot: Record<Layer, string> = {
  shared: 'bg-primary',
  personal: 'bg-rose',
  deadlines: 'bg-highlight',
  tasks: 'bg-info',
  projects: 'bg-accent',
}

/** Home: today and the next 7 days from the calendar, with clash warnings (FR-DASH, FR-CAL-07). */
export function UpcomingAgenda() {
  const tz = useViewerTimeZone()
  const today = todayIn(tz)
  const end = addDays(today, 7)
  const feed = useCalendarFeed(today, end, tz)
  const navigate = useNavigate()
  const days = useMemo(() => Array.from({ length: 8 }, (_, i) => addDays(today, i)), [today])
  const byDate = useMemo(() => groupByDate(feed.data ?? [], tz), [feed.data, tz])
  const clashKeys = useMemo(() => {
    const c = findClashes(feed.data ?? [], tz).filter((x) => x.day >= today && x.day <= end)
    return new Set(c.flatMap((x) => [itemKey(x.a), itemKey(x.b)]))
  }, [feed.data, tz, today, end])
  const withItems = days.filter((d) => (byDate.get(d) ?? []).length)

  return (
    <section aria-labelledby="agenda-title" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 id="agenda-title" className="text-h2">
          Today and the next 7 days
        </h2>
        <Link
          to="/calendar"
          className="inline-flex items-center gap-1 text-body-sm text-muted hover:text-text"
        >
          Calendar <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      {feed.isPending ? (
        <SkeletonList label="Loading your week" variant="line" rows={3} />
      ) : feed.error ? (
        <p className="panel p-5 text-body-sm text-danger">Couldn&apos;t load your week.</p>
      ) : withItems.length === 0 ? (
        <p className="panel p-5 text-body-sm text-muted">
          A clear week. Add an event or an opportunity with a deadline and it shows up here.
        </p>
      ) : (
        <ol className="panel divide-y divide-hairline p-0" data-testid="upcoming-agenda">
          {withItems.map((d) => (
            <li key={d} className="flex gap-4 px-4 py-3">
              <div className="w-16 shrink-0">
                <p className={`text-caption ${d === today ? 'text-highlight' : 'text-muted'}`}>
                  {d === today
                    ? 'Today'
                    : d === addDays(today, 1)
                      ? 'Tomorrow'
                      : formatDateOnly(d, { weekday: true }).split(',')[0]}
                </p>
                <p className="text-body-sm font-semibold">
                  {formatDateOnly(d).replace(/ \d{4}$/, '')}
                </p>
              </div>
              <ul className="min-w-0 flex-1 space-y-1">
                {byDate.get(d)!.map((item) => {
                  const path = sourcePath(item) ?? `/calendar?view=day&date=${d}`
                  return (
                    <li key={itemKey(item)}>
                      <button
                        type="button"
                        onClick={() => void navigate(path)}
                        className="flex w-full items-center gap-2.5 rounded-[10px] px-2 py-1 text-left text-body-sm hover:bg-hairline"
                      >
                        <span
                          aria-hidden
                          className={`size-2 shrink-0 rounded-full ${dot[layerOf(item)]}`}
                        />
                        <span className="w-11 shrink-0 text-caption text-muted">
                          {itemTime(item, tz) ?? 'All day'}
                        </span>
                        <span className="flex-1 truncate">{item.title}</span>
                        {item.rrule ? (
                          <Repeat className="size-3 text-muted" aria-label="Repeats" />
                        ) : null}
                        {item.visibility === 'private' ? (
                          <Lock className="size-3 text-muted" aria-label="Private" />
                        ) : null}
                        {clashKeys.has(itemKey(item)) ? (
                          <AlertTriangle
                            className="size-3.5 text-warning"
                            aria-label="Clashes with another item"
                          />
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
