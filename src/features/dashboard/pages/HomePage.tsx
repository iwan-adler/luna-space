import { ArrowRight, Plus, Sparkles, UserPlus } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { UpcomingAgenda } from '@/features/calendar'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth'
import { nextDeadlineOf, useOpportunities, useViewerTimeZone } from '@/features/opportunities'
import { useCurrentWorkspace, useMembers } from '@/features/workspace'

function greeting(now = new Date()) {
  const h = now.getHours()
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/** Home: a calm summary. The full dashboard (FR-DASH-01…06) grows into this in Phase 8. */
export function HomePage() {
  const ws = useCurrentWorkspace()
  const { user } = useAuth()
  const tz = useViewerTimeZone()
  const members = useMembers(ws.workspaceId)
  const opps = useOpportunities()
  const me = members.data?.find((m) => m.userId === user?.id)
  const partner = members.data?.find((m) => m.userId !== user?.id)

  const upcoming = useMemo(() => {
    const rows = []
    for (const o of opps.data ?? []) {
      const d = nextDeadlineOf(o, tz)
      if (d && d.info.urgency !== 'passed') rows.push({ o, d })
    }
    return rows.sort((a, b) => a.d.info.daysLeft - b.d.info.daysLeft).slice(0, 6)
  }, [opps.data, tz])
  const thisWeek = upcoming.filter((x) => x.d.info.daysLeft <= 7).length

  return (
    <section aria-labelledby="home-title" className="space-y-6">
      <header>
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
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel panel-corner flex flex-col justify-between gap-6 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-body font-medium">This week</h2>
            <Link to="/calendar" className="icon-btn size-8" aria-label="Open calendar">
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div>
            <p className="text-[40px] leading-none font-semibold tracking-[-0.03em]">
              {opps.isPending ? '–' : thisWeek}
            </p>
            <p className="mt-2 min-h-5 text-body-sm text-muted" data-testid="week-summary">
              {opps.isPending
                ? ''
                : thisWeek === 0
                  ? 'Nothing due this week. A good time to look for the next opportunity.'
                  : `${thisWeek} deadline${thisWeek === 1 ? '' : 's'} this week.`}
            </p>
          </div>
        </div>

        <div className="panel panel-glow flex flex-col items-center justify-center gap-3 p-6 text-center">
          <h2 className="text-body font-medium">Found something worth doing?</h2>
          <p className="max-w-64 text-body-sm text-muted">
            Paste a link to a hackathon, internship or scholarship and Luna Space fills in the
            details.
          </p>
          <Link to="/opportunities/new" className="mt-1">
            <Button icon={<Plus className="size-4" aria-hidden />}>Add opportunity</Button>
          </Link>
        </div>

        <div className="panel flex flex-col justify-between gap-6 p-5" data-testid="partner-card">
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

      <UpcomingAgenda />
    </section>
  )
}
