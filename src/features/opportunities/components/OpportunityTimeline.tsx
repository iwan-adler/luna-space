import { Link } from 'react-router'
import { formatDated } from '@/lib/dates'
import { gradientFor, initials } from '@/lib/visuals'
import { TYPE_HUE, TYPE_LABELS } from '../constants'
import { nextDeadline, type Opportunity } from '../model'

const BUCKETS = [
  { id: 'week', label: 'This week', min: -1, max: 7 },
  { id: 'next', label: 'Next week', min: 7, max: 14 },
  { id: 'month', label: 'This month', min: 14, max: 31 },
  { id: 'later', label: 'Later', min: 31, max: Number.POSITIVE_INFINITY },
] as const

/** Upcoming deadlines on one glowing line, grouped by how soon they are (ADR 0019). */
export function OpportunityTimeline({ opps, viewerTz }: { opps: Opportunity[]; viewerTz: string }) {
  const dated = opps
    .map((o) => ({ o, d: nextDeadline(o, viewerTz) }))
    .filter((x) => x.d && x.d.info.urgency !== 'passed')
    .sort((a, b) => a.d!.info.daysLeft - b.d!.info.daysLeft)
  const undated = opps.filter((o) => {
    const d = nextDeadline(o, viewerTz)
    return !d || d.info.urgency === 'passed'
  })
  const groups = BUCKETS.map((b) => ({
    ...b,
    items: dated.filter((x) => x.d!.info.daysLeft > b.min && x.d!.info.daysLeft <= b.max),
  })).filter((g) => g.items.length)

  return (
    <div className="space-y-6" data-testid="opportunity-timeline">
      {groups.map((g) => (
        <section key={g.id} aria-label={g.label}>
          <h2 className="eyebrow mb-3 tracking-[0.16em] uppercase">
            {g.label} <span className="text-muted">· {g.items.length}</span>
          </h2>
          <ol className="relative space-y-2.5 pl-6 before:absolute before:top-1 before:bottom-1 before:left-[7px] before:w-px before:bg-gradient-to-b before:from-[var(--color-highlight)] before:to-transparent">
            {g.items.map(({ o, d }) => {
              const hue = TYPE_HUE[o.type] ?? TYPE_HUE.other!
              return (
                <li key={o.id} className="relative">
                  <span
                    aria-hidden
                    className="absolute top-1/2 -left-[22px] size-2.5 -translate-y-1/2 rounded-full"
                    style={{ background: hue, boxShadow: `0 0 10px 2px ${hue}` }}
                  />
                  <Link
                    to={`/opportunities/${o.id}`}
                    className="panel flex items-center gap-3 px-4 py-3"
                  >
                    <span
                      aria-hidden
                      className="grid size-9 shrink-0 place-items-center rounded-[12px] text-caption font-semibold text-white"
                      style={{ background: gradientFor(o.organizer || o.title) }}
                    >
                      {initials(o.organizer || o.title)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{o.title}</span>
                      <span className="block text-caption text-muted">
                        {TYPE_LABELS[o.type]} ·{' '}
                        {d!.kind === 'registration_deadline' ? 'registration' : 'submission'}{' '}
                        {formatDated(d!.value)}
                      </span>
                    </span>
                    <span
                      className={`stat-number shrink-0 rounded-full px-2.5 py-1 text-caption ${d!.info.daysLeft <= 2 ? 'bg-danger/15 text-danger' : d!.info.daysLeft <= 7 ? 'bg-warning/15 text-warning' : 'bg-hairline text-muted'}`}
                    >
                      {d!.info.relative}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
      {undated.length ? (
        <section aria-label="No upcoming deadline">
          <h2 className="eyebrow mb-3 tracking-[0.16em] uppercase">
            No upcoming deadline <span className="text-muted">· {undated.length}</span>
          </h2>
          <ul className="flex flex-wrap gap-2">
            {undated.map((o) => (
              <li key={o.id}>
                <Link
                  to={`/opportunities/${o.id}`}
                  className="inline-flex rounded-full border border-hairline px-3 py-1 text-body-sm text-muted hover:text-text"
                >
                  {o.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
