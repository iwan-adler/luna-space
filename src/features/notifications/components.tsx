import { Bell, Calendar, CheckSquare, MessageSquare, Settings } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Alert } from '@/components/ui/Card'
import { useViewerTimeZone } from '@/features/profile'
import { useMembership, useMyWorkspaces, useSwitchWorkspace } from '@/features/workspace'
import { formatDateTime } from '@/lib/format'
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useNotificationsRealtime,
  useUnreadCount,
  type Notification,
} from './hooks'

/** Sleek Apple SF Symbols-style Bell icon */
export function AppleBellIcon({ className = 'size-[18px]' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3a5.5 5.5 0 0 0-5.5 5.5c0 4.2-1.2 6.3-1.8 7.2-.2.3 0 .8.4.8h13.8c.4 0 .6-.5.4-.8-.6-.9-1.8-3-1.8-7.2A5.5 5.5 0 0 0 12 3z" />
      <path d="M9.8 19a2.4 2.4 0 0 0 4.4 0" />
    </svg>
  )
}

/** Bell with an unread badge; keeps the count live (FR-PLAT-07). */
export function NotificationBell({ to = '/notifications' }: { to?: string }) {
  useNotificationsRealtime()
  const unread = useUnreadCount()
  const n = unread.data ?? 0
  const displayCount = n > 9 ? '9+' : n
  return (
    <Link
      to={to}
      aria-label={n ? `Notifications, ${n} unread` : 'Notifications'}
      data-testid="notification-bell"
      className="group relative flex size-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-surface text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-border/90 hover:bg-surface-raised hover:text-text active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--navbar-bg)] motion-reduce:transition-none motion-reduce:transform-none before:absolute before:inset-[-4px] before:content-[''] select-none"
    >
      <AppleBellIcon className="size-5 transition-colors" />
      {n > 0 ? (
        <span
          className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white ring-2 ring-[var(--navbar-bg)] leading-none select-none"
          aria-hidden="true"
        >
          {displayCount}
        </span>
      ) : null}
    </Link>
  )
}

function getNotificationIconInfo(type?: string | null) {
  const t = (type ?? '').toLowerCase()
  if (t.includes('message') || t.includes('chat') || t.includes('comment')) {
    return {
      bg: 'bg-[#10b981]',
      icon: MessageSquare,
      label: 'Message',
    }
  }
  if (t.includes('task') || t.includes('review') || t.includes('assign')) {
    return {
      bg: 'bg-[#f5a524]',
      icon: CheckSquare,
      label: 'Task',
    }
  }
  if (
    t.includes('calendar') ||
    t.includes('deadline') ||
    t.includes('event') ||
    t.includes('due') ||
    t.includes('reminder')
  ) {
    return {
      bg: 'bg-[#ff3b30]',
      icon: Calendar,
      label: 'Calendar',
    }
  }
  return {
    bg: 'bg-[#27272a]',
    icon: Bell,
    label: 'Notification',
  }
}

function formatRelativeTime(iso: string | null | undefined, timeZone?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()

  // Future or less than 1 minute ago
  if (diffMs < 60 * 1000) return 'now'

  const diffMins = Math.floor(diffMs / (60 * 1000))
  if (diffMins < 60) return `${diffMins}m`

  const diffHours = Math.floor(diffMs / (60 * 60 * 1000))
  if (diffHours < 24) {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone })
    if (formatter.format(d) === formatter.format(now)) {
      return `${diffHours}h`
    }
  }

  // Check if yesterday
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone })
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (formatter.format(d) === formatter.format(yesterday)) {
    return 'Yesterday'
  }

  // Older: e.g. "20 Nov"
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone,
  }).format(d)
}

function getNotificationGroup(iso: string, timeZone?: string): 'Today' | 'Yesterday' | 'Earlier' {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Earlier'
  const now = new Date()

  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone })
  const itemDate = formatter.format(d)
  const todayDate = formatter.format(now)

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayDate = formatter.format(yesterday)

  if (itemDate === todayDate) return 'Today'
  if (itemDate === yesterdayDate) return 'Yesterday'
  return 'Earlier'
}

/**
 * Redesigned standard notifications list page (/notifications).
 */
export function NotificationsPage() {
  const list = useNotifications()
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()
  const navigate = useNavigate()
  const tz = useViewerTimeZone()
  const unread = (list.data ?? []).filter((n) => !n.read_at).length

  const current = useMembership().data
  const workspaces = useMyWorkspaces()
  const switchTo = useSwitchWorkspace()
  const otherWorkspace = (n: Notification) =>
    current && n.workspace_id !== current.workspaceId
      ? workspaces.data?.find((w) => w.workspaceId === n.workspace_id)
      : undefined

  const open = (n: Notification) => {
    if (!n.read_at) markRead.mutate(n.id)
    const targetPath = n.link_path ?? (n as unknown as { path?: string }).path
    const other = otherWorkspace(n)
    if (other) void switchTo(other.workspaceId, targetPath ?? '/')
    else if (targetPath) void navigate(targetPath)
  }

  // Group notifications into Today, Yesterday, and Earlier
  const groups: { label: 'Today' | 'Yesterday' | 'Earlier'; items: Notification[] }[] = []
  if (list.data && list.data.length > 0) {
    const todayItems = list.data.filter((n) => getNotificationGroup(n.created_at, tz) === 'Today')
    const yesterdayItems = list.data.filter(
      (n) => getNotificationGroup(n.created_at, tz) === 'Yesterday',
    )
    const earlierItems = list.data.filter(
      (n) => getNotificationGroup(n.created_at, tz) === 'Earlier',
    )

    if (todayItems.length > 0) groups.push({ label: 'Today', items: todayItems })
    if (yesterdayItems.length > 0) groups.push({ label: 'Yesterday', items: yesterdayItems })
    if (earlierItems.length > 0) groups.push({ label: 'Earlier', items: earlierItems })
  }

  return (
    <section aria-labelledby="notifications-title" className="space-y-4 pb-32">
      {/* Title row with small 36x36 ghost gear icon button */}
      <div className="flex items-center justify-between">
        <h1 id="notifications-title" className="font-sans text-h1 font-medium text-text">
          Notifications
        </h1>
        <Link
          to="/more/notifications"
          aria-label="Notification settings"
          className="flex size-9 items-center justify-center rounded-lg text-muted hover:text-white hover:bg-white/[0.06] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
        >
          <Settings className="size-4" strokeWidth={1.75} />
        </Link>
      </div>

      {/* Header row under title: unread count on left, Mark all as read button on right */}
      <div className="flex items-center justify-between text-[13px] text-muted -mt-1">
        <span>{unread === 1 ? '1 unread' : `${unread} unread`}</span>
        {unread > 0 ? (
          <button
            type="button"
            disabled={markAll.isPending}
            onClick={() => markAll.mutate()}
            className="text-[13px] text-muted hover:text-white transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 rounded px-1 disabled:opacity-50"
          >
            Mark all as read
          </button>
        ) : null}
      </div>

      {/* Main Content: Loading, Error, Empty, or Grouped Notification Cards */}
      {list.isPending ? (
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#18181b] divide-y divide-white/[0.06]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
              <div className="size-9 rounded-[10px] bg-white/[0.06] shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 w-1/3 rounded bg-white/[0.06]" />
                <div className="h-3.5 w-3/4 rounded bg-white/[0.04]" />
              </div>
              <div className="h-3.5 w-10 rounded bg-white/[0.04] shrink-0" />
            </div>
          ))}
        </div>
      ) : list.error ? (
        <Alert tone="danger">
          Couldn&apos;t load notifications.{' '}
          <button type="button" className="underline" onClick={() => list.refetch()}>
            Retry
          </button>
        </Alert>
      ) : list.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-border bg-surface shadow-card">
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-raised text-muted mb-3">
            <Bell className="size-6" strokeWidth={1.5} />
          </div>
          <p className="text-[15px] font-medium text-text">You&apos;re all caught up</p>
          <p className="mt-1 text-[13px] text-muted">New notifications will show up here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-1 text-[12px] font-medium tracking-wider text-muted uppercase">
                {group.label}
              </p>
              <div
                className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card divide-y divide-border"
                data-testid="notification-list"
              >
                {group.items.map((n) => {
                  const isUnread = !n.read_at
                  const itemType = n.type || (n as unknown as { kind?: string }).kind || ''
                  const iconInfo = getNotificationIconInfo(itemType)
                  const Icon = iconInfo.icon

                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => open(n)}
                      className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-surface-raised outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                        isUnread ? 'bg-primary-subtle/30' : 'bg-transparent'
                      }`}
                    >
                      {/* Unread 8px amber dot at far left edge or spacer */}
                      <div className="flex items-center self-center shrink-0 -ml-1 mr-0.5">
                        {isUnread ? (
                          <span className="size-2 rounded-full bg-[#f5a524]" aria-label="Unread" />
                        ) : (
                          <span className="size-2 opacity-0" aria-hidden />
                        )}
                      </div>

                      {/* Icon tile: 36x36, rounded-[10px], colored by notification type */}
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${iconInfo.bg}`}
                        aria-hidden
                      >
                        <Icon className="size-[18px] text-white" strokeWidth={2} />
                      </span>

                      {/* Text Column */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={`truncate text-[15px] font-medium leading-snug ${
                              isUnread ? 'text-text font-semibold' : 'text-text-secondary'
                            }`}
                          >
                            {n.title}
                          </p>
                          <span
                            title={formatDateTime(n.created_at, tz)}
                            className="shrink-0 text-[13px] text-muted font-normal"
                          >
                            {formatRelativeTime(n.created_at, tz)}
                          </span>
                        </div>
                        {n.body ? (
                          <p
                            className={`mt-0.5 line-clamp-2 text-[14px] leading-relaxed ${
                              isUnread ? 'text-text-secondary' : 'text-muted'
                            }`}
                          >
                            {n.body}
                          </p>
                        ) : null}
                        {otherWorkspace(n) ? (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-surface-raised px-2 py-0.5 text-[11px] font-normal text-muted border border-border">
                            {otherWorkspace(n)!.emoji ?? ''} {otherWorkspace(n)!.workspaceName}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
