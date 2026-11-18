import { AlarmClock, Bell, CheckCheck, MessageSquare, UserPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { EmptyState } from '@/components/patterns/EmptyState'
import { Button } from '@/components/ui/Button'
import { Alert, Card } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useViewerTimeZone } from '@/features/profile'
import { formatDateTime } from '@/lib/format'
import {
  DEFAULT_PREFS,
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useNotificationsRealtime,
  usePreferences,
  useSavePreferences,
  useUnreadCount,
  type Notification,
} from './hooks'

/** Bell with an unread badge; keeps the count live (FR-PLAT-07). */
export function NotificationBell({ to = '/notifications' }: { to?: string }) {
  useNotificationsRealtime()
  const unread = useUnreadCount()
  const n = unread.data ?? 0
  return (
    <Link
      to={to}
      aria-label={n ? `Notifications, ${n} unread` : 'Notifications'}
      data-testid="notification-bell"
      className="relative grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-hairline hover:text-text"
    >
      <Bell className="size-[18px]" strokeWidth={1.75} aria-hidden />
      {n ? (
        <span className="btn-aurora absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] leading-none font-semibold">
          {n > 99 ? '99+' : n}
        </span>
      ) : null}
    </Link>
  )
}

const ICONS: Record<string, typeof Bell> = {
  'reminder.due': AlarmClock,
  'task.assigned': UserPlus,
  'task.comment': MessageSquare,
}

/** /notifications — the notification centre plus reminder settings. */
export function NotificationsPage() {
  const list = useNotifications()
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()
  const navigate = useNavigate()
  const tz = useViewerTimeZone()
  const unread = (list.data ?? []).filter((n) => !n.read_at).length

  const open = (n: Notification) => {
    if (!n.read_at) markRead.mutate(n.id)
    if (n.link_path) void navigate(n.link_path)
  }

  return (
    <section aria-labelledby="notifications-title" className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <p className="eyebrow">Inbox</p>
          <h1 id="notifications-title" className="font-display text-h1">
            Notifications
          </h1>
        </div>
        {unread ? (
          <Button
            variant="secondary"
            size="sm"
            icon={<CheckCheck className="size-4" aria-hidden />}
            loading={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all as read
          </Button>
        ) : null}
      </div>

      {list.isPending ? (
        <PageSpinner label="Loading notifications" />
      ) : list.error ? (
        <Alert tone="danger">
          Couldn&apos;t load notifications.{' '}
          <button type="button" className="underline" onClick={() => list.refetch()}>
            Retry
          </button>
        </Alert>
      ) : list.data.length === 0 ? (
        <EmptyState title="You're all caught up">
          Reminders for deadlines, tasks and events, and updates from your partner, appear here.
        </EmptyState>
      ) : (
        <ul className="panel divide-y divide-hairline p-0" data-testid="notification-list">
          {list.data.map((n) => {
            const Icon = ICONS[n.type] ?? Bell
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => open(n)}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-hairline"
                >
                  <span
                    className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${n.read_at ? 'bg-hairline text-muted' : 'bg-primary-subtle text-primary'}`}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-body-sm ${n.read_at ? 'text-muted' : 'font-medium'}`}
                    >
                      {n.title}
                    </span>
                    {n.body ? (
                      <span className="block text-caption text-muted">{n.body}</span>
                    ) : null}
                    <span className="block text-caption text-muted">
                      {formatDateTime(n.created_at, tz)}
                    </span>
                  </span>
                  {n.read_at ? null : (
                    <span
                      aria-label="Unread"
                      className="mt-2 size-2 shrink-0 rounded-full bg-primary"
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <ReminderSettings />
    </section>
  )
}

const DAY_OPTIONS = [
  { value: 14, label: '2 weeks before' },
  { value: 7, label: '1 week before' },
  { value: 3, label: '3 days before' },
  { value: 1, label: 'The day before' },
  { value: 0, label: 'On the day' },
]
const MINUTE_OPTIONS = [
  { value: 10080, label: '1 week before' },
  { value: 1440, label: '1 day before' },
  { value: 120, label: '2 hours before' },
  { value: 60, label: '1 hour before' },
  { value: 15, label: '15 minutes before' },
]

/** Default reminder times for deadlines (FR-AUTO-01, FR-CAL-05). */
function ReminderSettings() {
  const prefs = usePreferences()
  const save = useSavePreferences()
  const toast = useToast()
  if (prefs.isPending) return null
  const days = prefs.data?.deadline_reminder_days ?? DEFAULT_PREFS.deadline_reminder_days
  const minutes = prefs.data?.timed_reminder_minutes ?? DEFAULT_PREFS.timed_reminder_minutes
  const toggle = (list: number[], v: number) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v].sort((a, b) => b - a)
  const done = { onSuccess: () => toast.show('Reminder settings saved', 'success') }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-display text-[28px] leading-8">Reminder settings</h2>
        <p className="text-body-sm text-muted">
          Applies to deadlines of opportunities you&apos;re interested in or working on. Date-only
          deadlines remind you at 09:00 in your time zone.
        </p>
      </div>
      <fieldset className="space-y-2">
        <legend className="eyebrow mb-1">Date-only deadlines</legend>
        <div className="flex flex-wrap gap-2">
          {DAY_OPTIONS.map((o) => (
            <label
              key={o.value}
              className="inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-body-sm"
            >
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-primary)]"
                checked={days.includes(o.value)}
                onChange={() =>
                  save.mutate({ deadline_reminder_days: toggle(days, o.value) }, done)
                }
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="eyebrow mb-1">Deadlines with a time</legend>
        <div className="flex flex-wrap gap-2">
          {MINUTE_OPTIONS.map((o) => (
            <label
              key={o.value}
              className="inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-body-sm"
            >
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-primary)]"
                checked={minutes.includes(o.value)}
                onChange={() =>
                  save.mutate({ timed_reminder_minutes: toggle(minutes, o.value) }, done)
                }
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
    </Card>
  )
}
