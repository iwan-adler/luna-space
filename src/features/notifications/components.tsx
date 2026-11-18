import { AlarmClock, Bell, BellRing, CheckCheck, MessageSquare, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { EmptyState } from '@/components/patterns/EmptyState'
import { Button } from '@/components/ui/Button'
import { Alert, Card } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useViewerTimeZone } from '@/features/profile'
import { controlClass } from '@/components/ui/styles'
import { messageForCode, toAppError } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { pushState, type PushState } from '@/lib/push'
import {
  DEFAULT_PREFS,
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useNotificationsRealtime,
  usePreferences,
  useSavePreferences,
  useDevicePush,
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

      <DevicePushCard />
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

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`)

const PUSH_TEXT: Record<PushState, string> = {
  unsupported:
    "This browser can't show notifications. On iPhone, add Luna Space to your Home Screen first.",
  denied:
    "Notifications are blocked for this site. Allow them in your browser's site settings, then come back.",
  on: 'On. Reminders and updates appear here even when Luna Space is closed.',
  off: 'Off. Turn on to get reminders here even when Luna Space is closed.',
}

/** Notifications on this phone or computer, quiet hours and lock-screen privacy (FR-PLAT-08). */
function DevicePushCard() {
  const [state, setState] = useState<PushState | null>(null)
  const { enable, disable, test } = useDevicePush()
  const prefs = usePreferences()
  const save = useSavePreferences()
  const toast = useToast()
  useEffect(() => {
    void pushState().then(setState)
  }, [])
  const fail = (e: unknown, fallback: string) => {
    const code = toAppError(e).code
    toast.show(
      code ? messageForCode(code, fallback) : e instanceof Error ? e.message : fallback,
      'error',
    )
  }
  const quietStart = (prefs.data?.quiet_start ?? '23:00:00').slice(0, 5)
  const quietEnd = (prefs.data?.quiet_end ?? '07:00:00').slice(0, 5)
  const details = prefs.data?.lockscreen_details ?? true

  return (
    <Card className="space-y-4" data-testid="device-push">
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-primary-subtle text-primary">
          <BellRing className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[28px] leading-8">Notifications on this device</h2>
          <p className="text-body-sm text-muted" data-testid="push-state">
            {state === null ? 'Checking this device.' : PUSH_TEXT[state]}
          </p>
        </div>
        {state === 'off' ? (
          <Button
            loading={enable.isPending}
            onClick={() =>
              enable.mutate(undefined, {
                onSuccess: () => {
                  setState('on')
                  toast.show('Notifications turned on for this device', 'success')
                },
                onError: (e) => {
                  void pushState().then(setState)
                  fail(e, "Couldn't turn on notifications.")
                },
              })
            }
          >
            Turn on
          </Button>
        ) : state === 'on' ? (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={test.isPending}
              onClick={() =>
                test.mutate(undefined, {
                  onSuccess: () =>
                    toast.show('Test sent. It should arrive within a minute.', 'success'),
                  onError: (e) => fail(e, "Couldn't send a test."),
                })
              }
            >
              Send test
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={disable.isPending}
              onClick={() =>
                disable.mutate(undefined, {
                  onSuccess: () => {
                    setState('off')
                    toast.show('Notifications turned off for this device', 'success')
                  },
                  onError: (e) => fail(e, "Couldn't turn off notifications."),
                })
              }
            >
              Turn off
            </Button>
          </div>
        ) : null}
      </div>
      {prefs.isPending ? null : (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-body-sm">
          <span className="flex flex-wrap items-center gap-2">
            Quiet hours
            <label className="sr-only" htmlFor="quiet-start">
              Quiet hours start
            </label>
            <select
              id="quiet-start"
              className={`${controlClass} py-1.5`}
              value={quietStart}
              onChange={(e) => save.mutate({ quiet_start: e.target.value })}
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            to
            <label className="sr-only" htmlFor="quiet-end">
              Quiet hours end
            </label>
            <select
              id="quiet-end"
              className={`${controlClass} py-1.5`}
              value={quietEnd}
              onChange={(e) => save.mutate({ quiet_end: e.target.value })}
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </span>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-[var(--color-primary)]"
              checked={details}
              onChange={(e) => save.mutate({ lockscreen_details: e.target.checked })}
            />
            Show details on the lock screen
          </label>
        </div>
      )}
      <p className="text-caption text-muted">
        Pushes wait until quiet hours end. Turn this on separately on each phone and computer.
      </p>
    </Card>
  )
}
