import { SkeletonList } from '@/components/ui/Skeleton'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { useViewerTimeZone } from '@/features/profile'
import { formatDateTime } from '@/lib/format'
import { useNotifications, useUnreadCount } from './hooks'

/** Unread count and the latest three notifications (FR-DASH-06). */
export function NotificationsWidget() {
  const unread = useUnreadCount()
  const list = useNotifications()
  const tz = useViewerTimeZone()
  const latest = (list.data ?? []).slice(0, 3)
  return (
    <section aria-labelledby="notif-widget-title" className="panel space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h2 id="notif-widget-title" className="text-body font-medium">
          Notifications
          {unread.data ? (
            <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-caption">
              {unread.data} unread
            </span>
          ) : null}
        </h2>
        <Link to="/notifications" className="icon-btn size-8" aria-label="Open notifications">
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      {list.isPending ? (
        <SkeletonList label="Loading notifications" variant="line" rows={3} />
      ) : list.error ? (
        <p className="text-body-sm text-danger">Couldn&apos;t load notifications.</p>
      ) : latest.length === 0 ? (
        <p className="text-body-sm text-muted">You&apos;re all caught up.</p>
      ) : (
        <ul className="space-y-2">
          {latest.map((n) => (
            <li key={n.id} className="text-body-sm">
              <Link to={n.link_path ?? '/notifications'} className="block hover:text-text">
                <span className={`line-clamp-1 ${n.read_at ? 'text-muted' : 'font-medium'}`}>
                  {n.title}
                </span>
                <span className="text-caption text-muted">{formatDateTime(n.created_at, tz)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
