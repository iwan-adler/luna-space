import { Medal, Send, Trophy } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/patterns/EmptyState'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { SkeletonList } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/format'
import { gradientFor, initials } from '@/lib/visuals'
import { TYPE_HUE, TYPE_LABELS } from '../constants'
import { useOpportunities, useViewerTimeZone } from '../hooks'

/**
 * /trophies — what you've won and what you've shipped (ADR 0020). The seed of a portfolio
 * (FR-PORT, R3).
 */
export function TrophyWallPage() {
  const opps = useOpportunities()
  const tz = useViewerTimeZone()
  const won = (opps.data ?? []).filter((o) => o.status === 'won')
  const shipped = (opps.data ?? []).filter((o) =>
    ['submitted', 'awaiting_result', 'not_selected'].includes(o.status),
  )

  return (
    <section aria-labelledby="trophies-title" className="space-y-6">
      <div>
        <h1 id="trophies-title" className="text-h1">
          Trophy wall
        </h1>
        <p className="mt-1 text-body-sm text-muted">
          Everything this workspace has won, and everything it shipped on the way.
        </p>
      </div>

      {opps.isPending ? (
        <SkeletonList label="Loading trophies" rows={3} />
      ) : opps.error ? (
        <Alert tone="danger">Couldn&apos;t load your trophies.</Alert>
      ) : won.length + shipped.length === 0 ? (
        <div className="panel panel-glow">
          <EmptyState
            title="Your wall is waiting"
            action={
              <Link to="/opportunities">
                <Button>Find an opportunity</Button>
              </Link>
            }
          >
            Mark an opportunity as submitted or won and it takes its place here.
          </EmptyState>
        </div>
      ) : (
        <>
          {won.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="trophies-won">
              {won.map((o, i) => (
                <li key={o.id} className="rise" style={{ ['--i' as string]: i }}>
                  <Link
                    to={`/opportunities/${o.id}`}
                    className="panel panel-glow relative block overflow-hidden p-6 text-center"
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 -top-16 mx-auto size-48 rounded-full blur-2xl"
                      style={{
                        background: `radial-gradient(circle, ${TYPE_HUE[o.type] ?? '#ffd98a'}66, transparent 70%)`,
                      }}
                    />
                    <span className="relative mx-auto grid size-16 place-items-center rounded-full bg-[linear-gradient(160deg,#ffe7a8,#e0a440)] text-[#5a3a08] shadow-[0_0_28px_2px_rgb(255_210_120/0.55)]">
                      <Trophy className="size-8" aria-hidden />
                    </span>
                    <p className="relative mt-4 text-h3 font-semibold">{o.title}</p>
                    <p className="relative mt-1 text-caption text-muted">
                      {TYPE_LABELS[o.type]}
                      {o.organizer ? ` · ${o.organizer}` : ''}
                    </p>
                    {o.prizes ? (
                      <p className="relative mt-2 line-clamp-2 text-body-sm text-highlight">
                        {o.prizes}
                      </p>
                    ) : null}
                    <p className="relative mt-3 text-caption text-muted">
                      Won · {formatDateTime(o.updated_at, tz)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel flex items-center gap-2 p-4 text-body-sm text-muted">
              <Medal className="size-4 text-highlight" aria-hidden /> No wins yet. They&apos;ll
              shine here.
            </p>
          )}

          {shipped.length ? (
            <section aria-labelledby="shipped-title" className="space-y-3">
              <h2 id="shipped-title" className="eyebrow tracking-[0.16em] uppercase">
                Shipped · {shipped.length}
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {shipped.map((o) => (
                  <li key={o.id}>
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
                          {o.status === 'not_selected'
                            ? 'Submitted · not selected this time'
                            : 'Submitted · awaiting result'}
                        </span>
                      </span>
                      <Send className="size-4 text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </section>
  )
}
