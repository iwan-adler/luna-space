import {
  CalendarPlus,
  ListPlus,
  MessageCircle,
  NotebookPen,
  Plus,
  Sparkles,
  UserPlus,
} from 'lucide-react'
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
  const partner = members.data?.find((m) => m.userId !== user?.id)
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

      <div className="rise" style={{ '--i': 6 } as CSSProperties}>
        <UpcomingAgenda />
      </div>
    </div>
  )
}
