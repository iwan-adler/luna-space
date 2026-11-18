import {
  CalendarPlus,
  ListPlus,
  MessageCircle,
  NotebookPen,
  Plus,
  Sparkles,
  UserPlus,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth'
import { DeadlinesWidget, UpcomingAgenda } from '@/features/calendar'
import { useCreateNote } from '@/features/notes'
import { NotificationsWidget } from '@/features/notifications'
import { ActiveProjectsWidget } from '@/features/projects'
import { useCurrentWorkspace, useMembers } from '@/features/workspace'
import { ActivityWidget } from '../ActivityWidget'

type View = 'shared' | 'me'
const VIEW_KEY = 'luna.dashboard.view'

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'me' ? 'me' : 'shared'
  } catch {
    return 'shared'
  }
}

function greeting(now = new Date()) {
  const h = now.getHours()
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

const action =
  'panel flex items-center gap-2.5 px-4 py-3 text-body-sm font-medium transition-colors hover:border-border'

/** Home dashboard: Shared and Me views, quick actions and widgets (FR-DASH-01–06). */
export function HomePage() {
  const ws = useCurrentWorkspace()
  const { user } = useAuth()
  const members = useMembers(ws.workspaceId)
  const createNote = useCreateNote()
  const navigate = useNavigate()
  const [view, setView] = useState<View>(readView)
  const me = members.data?.find((m) => m.userId === user?.id)
  const partner = members.data?.find((m) => m.userId !== user?.id)
  const mine = view === 'me'

  const choose = (v: View) => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      // Remembering the choice is a convenience only.
    }
  }

  return (
    <section aria-labelledby="home-title" className="space-y-6">
      <header className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 id="home-title" className="text-display">
            Welcome
            {me ? (
              <>
                , <span className="text-highlight">{me.displayName}</span>
              </>
            ) : null}
          </h1>
          <p className="mt-1 text-body text-muted">
            {greeting()} · here&apos;s your {ws.workspaceName} overview
          </p>
        </div>
        <div role="group" aria-label="Dashboard view" className="flex gap-1">
          {(['shared', 'me'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => choose(v)}
              className={`rounded-full px-4 py-1.5 text-body-sm ${view === v ? 'nav-active' : 'border border-border text-muted hover:text-text'}`}
            >
              {v === 'shared' ? 'Shared' : 'Me'}
            </button>
          ))}
        </div>
      </header>

      <nav
        aria-label="Quick actions"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
      >
        <Link to="/opportunities/new" className={action}>
          <Plus className="size-4 text-highlight" aria-hidden /> Add opportunity
        </Link>
        <Link to="/tasks" className={action}>
          <ListPlus className="size-4 text-highlight" aria-hidden /> New task
        </Link>
        <Link to="/calendar?new=event" className={action}>
          <CalendarPlus className="size-4 text-highlight" aria-hidden /> New event
        </Link>
        <button
          type="button"
          className={action}
          disabled={createNote.isPending}
          onClick={() =>
            createNote.mutate({}, { onSuccess: (id) => void navigate(`/notes/${id}`) })
          }
        >
          <NotebookPen className="size-4 text-highlight" aria-hidden /> New note
        </button>
        <Link to="/chat" className={action}>
          <MessageCircle className="size-4 text-highlight" aria-hidden /> Open chat
        </Link>
      </nav>

      <div className="grid gap-4 md:grid-cols-2">
        <DeadlinesWidget mine={mine} userId={user?.id} />
        <ActiveProjectsWidget mine={mine} userId={user?.id} />
        <ActivityWidget mine={mine} />
        <div className="space-y-4">
          <NotificationsWidget />
          <div className="panel flex flex-col gap-4 p-5" data-testid="partner-card">
            <div className="flex items-center justify-between">
              <h2 className="text-body font-medium">Your partner</h2>
              <Sparkles className="size-4 text-highlight" strokeWidth={1.75} aria-hidden />
            </div>
            {members.isPending ? (
              <Spinner className="size-4" label="Loading members" />
            ) : partner ? (
              <div className="flex items-center gap-3">
                <span className="btn-primary flex size-11 items-center justify-center rounded-full text-body font-semibold">
                  {partner.displayName.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="font-medium">{partner.displayName}</p>
                  <p className="text-body-sm text-muted">Shares this workspace with you</p>
                </div>
              </div>
            ) : (
              <Link
                to="/settings/workspace"
                className="inline-flex items-center gap-2 text-body-sm text-muted hover:text-text"
              >
                <UserPlus className="size-4" strokeWidth={1.75} aria-hidden /> Invite your partner
              </Link>
            )}
          </div>
        </div>
      </div>

      <UpcomingAgenda />
    </section>
  )
}
