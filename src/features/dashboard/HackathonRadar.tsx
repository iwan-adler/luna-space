import { Calendar, ExternalLink, Plus, Sparkles, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  MODE_LABELS,
  STATUS_LABELS,
  teamSizeLabel,
  useOpportunities,
  useViewerTimeZone,
} from '@/features/opportunities'
import { radarPicks } from './radar'

const DEADLINE_LABELS: Record<string, string> = {
  registration_deadline: 'Registration closes',
  submission_deadline: 'Submissions close',
}

/**
 * Hackathon Radar: the team's own open hackathons and competitions, soonest deadline first.
 * Built from the workspace's opportunities, so it is never stale (replaces a fixed list).
 */
export function HackathonRadar() {
  const opps = useOpportunities()
  const tz = useViewerTimeZone()
  const picks = useMemo(() => radarPicks(opps.data ?? [], tz), [opps.data, tz])

  return (
    <section aria-labelledby="radar-title" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary-ink" aria-hidden />
          <h2 id="radar-title" className="text-h2 font-semibold">
            Hackathon Radar
          </h2>
        </div>
        <a
          href="https://devpost.com/hackathons"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-body-sm text-muted transition-colors hover:text-text"
        >
          Find more on Devpost <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>

      {opps.isPending && opps.fetchStatus === 'paused' ? (
        <p className="panel p-5 text-body-sm text-muted">
          You&apos;re offline. Your hackathons will appear when you reconnect.
        </p>
      ) : opps.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2" aria-label="Loading hackathons">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : opps.error ? (
        <p className="panel p-5 text-body-sm text-danger">Couldn&apos;t load your hackathons.</p>
      ) : picks.length === 0 ? (
        <div
          className="panel flex flex-wrap items-center justify-between gap-3 p-5"
          data-testid="radar-empty"
        >
          <p className="text-body-sm text-muted">
            No open hackathons yet. Paste a hackathon link and Luna fills in the details.
          </p>
          <Link
            to="/opportunities/new"
            className="btn-secondary inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-body-sm font-medium"
          >
            <Plus className="size-4" aria-hidden />
            Add a hackathon
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="radar">
          {picks.map(({ opp, deadline }) => {
            const soon = deadline != null && deadline.info.daysLeft <= 7
            const team = teamSizeLabel(opp.team_min, opp.team_max)
            const chips = [
              opp.mode !== 'unknown' ? MODE_LABELS[opp.mode] : null,
              team,
              ...opp.tracks.slice(0, 2),
            ].filter((c): c is string => Boolean(c))
            return (
              <li key={opp.id}>
                <article
                  className={`group relative flex h-full flex-col justify-between rounded-xl border p-4 transition-colors hover:bg-surface-raised ${
                    soon ? 'border-primary/40 bg-primary-subtle' : 'border-border bg-surface'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-caption font-semibold tracking-wider text-muted uppercase">
                        {opp.organizer ?? STATUS_LABELS[opp.status]}
                      </span>
                      {opp.prizes ? (
                        <span
                          className="inline-flex max-w-[50%] items-center gap-1 truncate rounded-md bg-surface-raised px-2 py-0.5 text-caption font-semibold text-primary-ink"
                          title={opp.prizes}
                        >
                          <Trophy className="size-3 shrink-0" aria-hidden />
                          <span className="truncate">{opp.prizes}</span>
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-body font-semibold text-text transition-colors group-hover:text-primary-ink">
                      <Link
                        to={`/opportunities/${opp.id}`}
                        className="after:absolute after:inset-0"
                      >
                        {opp.title}
                      </Link>
                    </h3>
                    <p className="flex items-center gap-1.5 text-caption text-muted">
                      <Calendar className="size-3.5 shrink-0" aria-hidden />
                      {deadline ? (
                        <span className={soon ? 'font-medium text-text' : undefined}>
                          {DEADLINE_LABELS[deadline.kind] ?? 'Deadline'} {deadline.info.relative}
                        </span>
                      ) : (
                        <span>No deadline added yet</span>
                      )}
                    </p>
                  </div>
                  <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2">
                    <span className="rounded-md bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-text">
                      {STATUS_LABELS[opp.status]}
                    </span>
                    {chips.map((c) => (
                      <span
                        key={c}
                        className="rounded-md bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-muted"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
