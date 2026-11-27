import { CalendarPlus, ListPlus, NotebookPen, Plus } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/features/auth'
import { DeadlinesWidget, UpcomingAgenda } from '@/features/calendar'
import { useCreateNote } from '@/features/notes'
import { NotificationsWidget } from '@/features/notifications'
import { PipelineStrip } from '@/features/opportunities'
import { ActiveProjectsWidget } from '@/features/projects'

import { useCurrentWorkspace, useMembers } from '@/features/workspace'
import { ActivityWidget } from '../ActivityWidget'
import { HackathonRadar } from '../HackathonRadar'
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

const baseAction =
  'group relative inline-flex h-[44px] shrink-0 snap-start items-center gap-2 rounded-full pl-3.5 pr-4 text-[15px] font-medium tracking-[-0.01em] whitespace-nowrap transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none motion-reduce:transform-none select-none cursor-pointer'

const primaryAction = `${baseAction} bg-primary/[0.15] text-primary-ink border border-primary/30 hover:bg-primary/[0.22] hover:border-primary/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`

const neutralAction = `${baseAction} bg-surface text-text border border-border/60 hover:bg-surface-raised hover:border-border/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] disabled:opacity-50 disabled:pointer-events-none`

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
      <Hero name={me?.displayName} workspaceName={ws.workspaceName} greeting={greeting()} />

      <div className="rise flex flex-wrap items-center gap-3" style={{ '--i': 1 } as CSSProperties}>
        <nav
          aria-label="Quick actions"
          className="-mx-4 flex min-w-0 basis-full items-center gap-2.5 overflow-x-auto scroll-smooth snap-x snap-mandatory px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent_100%)] min-[520px]:mx-0 min-[520px]:basis-auto min-[520px]:overflow-visible min-[520px]:px-0 min-[520px]:[mask-image:none] sm:gap-3"
        >
          <Link to="/opportunities/new" className={primaryAction}>
            <Plus className="size-[18px] stroke-[1.85] text-primary-ink" aria-hidden />
            Add opportunity
          </Link>
          <Link to="/tasks" className={neutralAction}>
            <ListPlus
              className="size-[18px] stroke-[1.85] text-muted group-hover:text-text transition-colors"
              aria-hidden
            />
            New task
          </Link>
          <Link to="/calendar?new=event" className={neutralAction}>
            <CalendarPlus
              className="size-[18px] stroke-[1.85] text-muted group-hover:text-text transition-colors"
              aria-hidden
            />
            New event
          </Link>
          <button
            type="button"
            className={neutralAction}
            disabled={createNote.isPending}
            onClick={() =>
              createNote.mutate(
                {},
                { onSuccess: (id) => void navigate(id ? `/notes/${id}` : '/notes') },
              )
            }
          >
            <NotebookPen
              className="size-[18px] stroke-[1.85] text-muted group-hover:text-text transition-colors"
              aria-hidden
            />
            New note
          </button>
        </nav>
        <div
          role="group"
          aria-label="Dashboard view"
          className="relative ml-auto flex rounded-lg border border-border bg-surface p-1"
        >
          <span
            aria-hidden
            className="nav-active absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md transition-transform duration-[var(--motion-slow)] ease-[var(--ease-standard)]"
            style={{ transform: view === 'me' ? 'translateX(100%)' : 'translateX(0)' }}
          />
          {(['shared', 'me'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => choose(v)}
              className={`relative z-10 min-w-20 rounded-md px-4 py-1.5 text-body-sm transition-colors ${view === v ? 'text-text' : 'text-muted hover:text-text'}`}
            >
              {v === 'shared' ? 'Shared' : 'Me'}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Active Projects & Today's 7-Day Agenda (Immediate execution radar) */}
      <div className="rise grid gap-4 md:grid-cols-2" style={{ '--i': 2 } as CSSProperties}>
        <div>
          <ActiveProjectsWidget mine={mine} userId={user?.id} />
        </div>
        <div>
          <UpcomingAgenda />
        </div>
      </div>

      {/* 2. Your Team (Current builders & active tasks) */}
      <div className="rise" style={{ '--i': 3 } as CSSProperties}>
        <TeamCard />
      </div>

      {/* Deadlines, pipeline, the week and what changed */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rise" style={{ '--i': 4 } as CSSProperties}>
          <DeadlinesWidget mine={mine} userId={user?.id} />
        </div>
        <div className="rise" style={{ '--i': 5 } as CSSProperties}>
          <PipelineStrip />
        </div>
        <div className="rise" style={{ '--i': 6 } as CSSProperties}>
          <WeeklyRecap />
        </div>
        <div className="rise" style={{ '--i': 7 } as CSSProperties}>
          <NotificationsWidget />
        </div>
        <div className="rise md:col-span-2" style={{ '--i': 8 } as CSSProperties}>
          <ActivityWidget mine={mine} />
        </div>
      </div>

      {/* Hackathon Radar: the team's open hackathons, soonest deadline first */}
      <div className="rise" style={{ '--i': 9 } as CSSProperties}>
        <HackathonRadar />
      </div>
    </div>
  )
}
