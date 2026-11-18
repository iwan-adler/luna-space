import { ArrowRight, Plus, Sparkles, UserPlus } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { DeadlineBadge } from '@/components/patterns/DeadlineBadge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth'
import { nextDeadlineOf, useOpportunities, useViewerTimeZone } from '@/features/opportunities'
import { useCurrentWorkspace, useMembers } from '@/features/workspace'
import { formatDated } from '@/lib/dates'

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
    <section aria-labelledby="home-title" className="space-y-10">
      <header className="panel relative overflow-hidden p-7 sm:p-9">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-primary/10 blur-3xl"
        />
        <p className="eyebrow">{ws.workspaceName}</p>
        <h1 id="home-title" className="mt-3 text-display font-semibold">
          {greeting()}
          {me ? `, ${me.displayName}` : ''}
          <Sparkles className="ml-2 inline size-6 text-primary/80" strokeWidth={1.5} aria-hidden />
        </h1>
        <p className="mt-2 min-h-6 text-body text-muted" data-testid="week-summary">
          {opps.isPending
            ? ''
            : thisWeek === 0
              ? 'Nothing due this week. A good time to look for the next opportunity.'
              : `${thisWeek} deadline${thisWeek === 1 ? '' : 's'} this week.`}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link to="/opportunities/new">
            <Button icon={<Plus className="size-4" aria-hidden />}>Add opportunity</Button>
          </Link>
          <div
            data-testid="partner-card"
            className="flex items-center gap-2 text-body-sm text-muted"
          >
            {members.isPending ? (
              <Spinner className="size-4" label="Loading members" />
            ) : partner ? (
              <>
                <span className="flex size-7 items-center justify-center rounded-full bg-hairline text-caption font-semibold text-text">
                  {partner.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span>
                  with <span className="text-text">{partner.displayName}</span>
                </span>
              </>
            ) : (
              <Link
                to="/settings/workspace"
                className="inline-flex items-center gap-1.5 hover:text-text"
              >
                <UserPlus className="size-4" strokeWidth={1.75} aria-hidden /> Invite your partner
              </Link>
            )}
          </div>
        </div>
      </header>

      <section aria-labelledby="upcoming-title" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 id="upcoming-title" className="text-h2 font-semibold">
            Upcoming
          </h2>
          <Link
            to="/opportunities"
            className="inline-flex items-center gap-1 text-body-sm text-muted hover:text-text"
          >
            All opportunities <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        {opps.isPending ? (
          <Spinner label="Loading deadlines" />
        ) : upcoming.length === 0 ? (
          <p className="panel p-6 text-body-sm text-muted">
            No upcoming deadlines. Paste a link to a hackathon, internship or scholarship to start
            tracking it.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2" data-testid="upcoming-list">
            {upcoming.map(({ o, d }) => (
              <li key={o.id}>
                <Link
                  to={`/opportunities/${o.id}`}
                  className="panel flex h-full flex-col gap-3 p-5 transition-transform duration-[var(--motion-base)] hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium">{o.title}</span>
                    <DeadlineBadge value={d.value} viewerTz={tz} />
                  </div>
                  <span className="text-body-sm text-muted">
                    {d.kind === 'registration_deadline' ? 'Registration' : 'Submission'} ·{' '}
                    {formatDated(d.value)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
