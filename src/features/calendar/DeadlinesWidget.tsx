import { SkeletonList } from '@/components/ui/Skeleton'
import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { useViewerTimeZone } from '@/features/profile'
import { formatDateOnly, todayIn } from '@/lib/dates'
import { useCalendarFeed } from './hooks'
import { addDays, daysBetween, itemDates, itemKey, sourcePath, type FeedItem } from './model'

const DEADLINE_SOURCES = new Set(['opportunity_date', 'task', 'project_end', 'checklist_item'])
const isDeadline = (i: FeedItem) =>
  DEADLINE_SOURCES.has(i.sourceType) || (i.sourceType === 'event' && i.kind === 'deadline')

/**
 * Upcoming deadlines for the next 14 days: opportunity dates, task due dates, project ends,
 * checklist items and deadline events, with days remaining (FR-DASH-02). `mine` keeps only items
 * the viewer owns.
 */
export function DeadlinesWidget({ mine, userId }: { mine: boolean; userId: string | undefined }) {
  const tz = useViewerTimeZone()
  const today = todayIn(tz)
  const feed = useCalendarFeed(today, addDays(today, 14), tz)
  const rows = useMemo(() => {
    const out: { item: FeedItem; date: string; left: number }[] = []
    for (const item of feed.data ?? []) {
      if (!isDeadline(item) || (mine && item.ownerId !== userId)) continue
      const date = item.occurrence ?? itemDates(item, tz)[0]
      if (!date || date < today) continue
      out.push({ item, date, left: daysBetween(today, date) })
    }
    return out.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8)
  }, [feed.data, mine, userId, tz, today])

  return (
    <section aria-labelledby="deadlines-title" className="panel space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h2 id="deadlines-title" className="text-body font-medium">
          Upcoming deadlines
        </h2>
        <Link to="/calendar" className="icon-btn size-8" aria-label="Open calendar">
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      {feed.isPending ? (
        <SkeletonList label="Loading deadlines" variant="line" rows={3} />
      ) : feed.error ? (
        <p className="text-body-sm text-danger">Couldn&apos;t load deadlines.</p>
      ) : rows.length === 0 ? (
        <p className="text-body-sm text-muted" data-testid="deadlines-empty">
          Nothing due in the next two weeks.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="deadlines">
          {rows.map(({ item, date, left }) => {
            const to = sourcePath(item)
            const label = (
              <>
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-caption ${left <= 2 ? 'bg-danger/12 text-danger' : 'bg-hairline text-muted'}`}
                  title={formatDateOnly(date, { weekday: true })}
                >
                  {left === 0 ? 'today' : left === 1 ? 'tomorrow' : `${left} days`}
                </span>
              </>
            )
            return (
              <li key={itemKey(item)} className="text-body-sm">
                {to ? (
                  <Link to={to} className="flex items-center gap-2 hover:text-text">
                    {label}
                  </Link>
                ) : (
                  <span className="flex items-center gap-2">{label}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
