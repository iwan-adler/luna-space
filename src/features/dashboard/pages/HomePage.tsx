import { CalendarPlus, ListPlus, MessageCircle, NotebookPen, Plus } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/features/auth'
import { DeadlinesWidget, UpcomingAgenda } from '@/features/calendar'
import { useCreateNote } from '@/features/notes'
import { NotificationsWidget } from '@/features/notifications'
import { PipelineStrip } from '@/features/opportunities'
import { ActiveProjectsWidget } from '@/features/projects'
import { useCurrentWorkspace, useMembers } from '@/features/workspace'
import { useViewerTimeZone } from '@/features/profile'
import { formatDateOnly, todayIn } from '@/lib/dates'
import { ActivityWidget } from '../ActivityWidget'
import { Hero } from '../Hero'
import { TeamCard, WeeklyRecap } from '../TeamWidgets'

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
          <TeamCard />
        </div>
        <div className="rise" style={{ '--i': 4 } as CSSProperties}>
          <PipelineStrip />
        </div>
        <div className="rise" style={{ '--i': 5 } as CSSProperties}>
          <WeeklyRecap />
        </div>
        <div className="rise" style={{ '--i': 6 } as CSSProperties}>
          <ActiveProjectsWidget mine={mine} userId={user?.id} />
        </div>
        <div className="rise" style={{ '--i': 7 } as CSSProperties}>
          <NotificationsWidget />
        </div>
        <div className="rise md:col-span-2" style={{ '--i': 8 } as CSSProperties}>
          <ActivityWidget mine={mine} />
        </div>
      </div>

      <div className="rise" style={{ '--i': 9 } as CSSProperties}>
        <UpcomingAgenda />
      </div>
    </div>
  )
}
