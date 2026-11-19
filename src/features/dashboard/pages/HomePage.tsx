import { CalendarPlus, ListPlus, MessageCircle, NotebookPen, Plus, UserPlus } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth'
import { DeadlinesWidget, UpcomingAgenda } from '@/features/calendar'
import { useCreateNote } from '@/features/notes'
import { NotificationsWidget } from '@/features/notifications'
import { ActiveProjectsWidget } from '@/features/projects'
import { useCurrentWorkspace, useMembers } from '@/features/workspace'
import { useViewerTimeZone } from '@/features/profile'
import { formatDateOnly, todayIn } from '@/lib/dates'
import { ActivityWidget } from '../ActivityWidget'
import { Hero } from '../Hero'

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
  'lift flex shrink-0 items-center whitespace-nowrap gap-2.5 rounded-full border border-hairline bg-[var(--control-fill)] py-1.5 pr-4 pl-1.5 text-body-sm font-medium backdrop-blur-md hover:border-border'

/** Home dashboard: Shared and Me views, quick actions and widgets (FR-DASH-01–06). */
export function HomePage() {
  const ws = useCurrentWorkspace()
  const { user } = useAuth()
  const members = useMembers(ws.workspaceId)
  const createNote = useCreateNote()
  const navigate = useNavigate()
  const [view, setView] = useState<View>(readView)
  const me = members.data?.find((m) => m.userId === user?.id)
  const others = members.data?.filter((m) => m.userId !== user?.id) ?? []
  const mine = view === 'me'
  const tz = useViewerTimeZone()

  const choose = (v: View) => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      // Remembering the choice is a convenience only.
    }
  }

  return (
    <div className="space-y-6">
      <Hero
        name={me?.displayName}
        workspaceName={ws.workspaceName}
        greeting={greeting()}
        today={formatDateOnly(todayIn(tz), { weekday: true })}
      />

      <div className="rise flex flex-wrap items-center gap-3" style={{ '--i': 1 } as CSSProperties}>
        <nav
          aria-label="Quick actions"
          className="-mx-5 flex min-w-0 basis-full gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:basis-auto sm:flex-1 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [scrollbar-width:none]"
        >
          <Link to="/opportunities/new" className={action}>
            <span className="icon-bubble size-7">
              <Plus className="size-3.5" aria-hidden />
            </span>
            Add opportunity
          </Link>
          <Link to="/tasks" className={action}>
            <span className="icon-bubble size-7">
              <ListPlus className="size-3.5" aria-hidden />
            </span>
            New task
          </Link>
          <Link to="/calendar?new=event" className={action}>
            <span className="icon-bubble size-7">
              <CalendarPlus className="size-3.5" aria-hidden />
            </span>
            New event
          </Link>
          <button
            type="button"
            className={action}
            disabled={createNote.isPending}
            onClick={() =>
              createNote.mutate({}, { onSuccess: (id) => void navigate(`/notes/${id}`) })
            }
          >
            <span className="icon-bubble size-7">
              <NotebookPen className="size-3.5" aria-hidden />
            </span>
            New note
          </button>
          <Link to="/chat" className={action}>
            <span className="icon-bubble size-7">
              <MessageCircle className="size-3.5" aria-hidden />
            </span>
            Open chat
          </Link>
        </nav>
        <div
          role="group"
          aria-label="Dashboard view"
          className="relative ml-auto flex rounded-full border border-hairline bg-[var(--control-fill)] p-1 backdrop-blur-md"
        >
          <span
            aria-hidden
            className="nav-active absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-transform duration-[var(--motion-slow)] ease-[var(--ease-standard)]"
            style={{ transform: view === 'me' ? 'translateX(100%)' : 'translateX(0)' }}
          />
          {(['shared', 'me'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => choose(v)}
              className={`relative z-10 min-w-20 rounded-full px-4 py-1.5 text-body-sm transition-colors ${view === v ? 'text-text' : 'text-muted hover:text-text'}`}
            >
              {v === 'shared' ? 'Shared' : 'Me'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rise" style={{ '--i': 2 } as CSSProperties}>
          <DeadlinesWidget mine={mine} userId={user?.id} />
        </div>
        <div className="rise" style={{ '--i': 3 } as CSSProperties}>
          <ActiveProjectsWidget mine={mine} userId={user?.id} />
        </div>
        <div className="rise" style={{ '--i': 4 } as CSSProperties}>
          <ActivityWidget mine={mine} />
        </div>
        <div className="rise space-y-4" style={{ '--i': 5 } as CSSProperties}>
          <NotificationsWidget />
          <div className="panel flex flex-col gap-4 p-5" data-testid="team-card">
            <div className="flex items-center justify-between">
              <h2 className="text-body font-medium">Your team</h2>
              <Link
                to="/settings/workspace"
                className="icon-btn size-8"
                aria-label="Workspace members and invites"
              >
                <UserPlus className="size-4" strokeWidth={1.75} aria-hidden />
              </Link>
            </div>
            {members.isPending ? (
              <Spinner className="size-4" label="Loading members" />
            ) : others.length ? (
              <div className="space-y-3">
                <div className="flex -space-x-2.5" aria-hidden>
                  {members.data?.slice(0, 7).map((m) => (
                    <span
                      key={m.userId}
                      title={m.displayName}
                      className="btn-primary grid size-10 place-items-center rounded-full border-2 border-[var(--color-surface)] text-body-sm font-semibold"
                    >
                      {m.displayName.slice(0, 1).toUpperCase()}
                    </span>
                  ))}
                </div>
                <p className="text-body-sm text-muted">
                  {others.length === 1
                    ? `You and ${others[0]!.displayName} share this workspace.`
                    : `You, ${others
                        .slice(0, 3)
                        .map((m) => m.displayName)
                        .join(', ')}${others.length > 3 ? ` and ${others.length - 3} more` : ''}.`}
                </p>
              </div>
            ) : (
              <Link
                to="/settings/workspace"
                className="inline-flex items-center gap-2 text-body-sm text-muted hover:text-text"
              >
                <UserPlus className="size-4" strokeWidth={1.75} aria-hidden /> Invite your friends
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="rise" style={{ '--i': 6 } as CSSProperties}>
        <UpcomingAgenda />
      </div>
    </div>
  )
}
