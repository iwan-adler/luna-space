import { ChevronRight, Trophy } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from 'react-router'
import { Skeleton } from '@/components/ui/Skeleton'
import { useOpportunities } from '../hooks'

const STAGES = [
  { id: 'discover', label: 'Interested', statuses: ['saved', 'interested'] },
  { id: 'preparing', label: 'Applied', statuses: ['planning', 'registered', 'in_progress'] },
  { id: 'submitted', label: 'Submitted', statuses: ['submitted', 'awaiting_result'] },
  { id: 'won', label: 'Won', statuses: ['won'] },
] as const

/** Interested → Applied → Submitted → Won, with counts (ADR 0019). */
export function PipelineStrip() {
  const opps = useOpportunities()
  return (
    <section aria-labelledby="pipeline-title" className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="pipeline-title" className="text-body font-medium">
          Opportunity pipeline
        </h2>
        <Link to="/opportunities?view=pipeline" className="text-body-sm text-muted hover:text-text">
          Open
        </Link>
      </div>
      {opps.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : opps.error ? (
        <p className="text-body-sm text-danger">Couldn&apos;t load opportunities.</p>
      ) : (
        <ol className="flex items-stretch gap-1.5" data-testid="pipeline-strip">
          {STAGES.map((s, i) => {
            const n = (opps.data ?? []).filter((o) =>
              (s.statuses as readonly string[]).includes(o.status),
            ).length
            const won = s.id === 'won'
            return (
              <Fragment key={s.id}>
                {i > 0 ? (
                  <li aria-hidden className="flex items-center text-muted">
                    <ChevronRight className="size-4" />
                  </li>
                ) : null}
                <li className="min-w-0 flex-1">
                  <Link
                    to={won ? '/trophies' : '/opportunities?view=pipeline'}
                    className={`lift flex h-full flex-col items-center justify-center rounded-[16px] border px-2 py-3 text-center ${won && n ? 'border-transparent bg-[var(--gradient-primary)] text-white shadow-[var(--glow-primary)]' : 'border-hairline bg-[var(--control-fill)]'}`}
                  >
                    <span className="stat-number flex items-center gap-1 text-[24px] leading-7">
                      {won ? <Trophy className="size-4" aria-hidden /> : null}
                      {n}
                    </span>
                    <span
                      className={`truncate text-caption ${won && n ? 'text-white/85' : 'text-muted'}`}
                    >
                      {s.label}
                    </span>
                  </Link>
                </li>
              </Fragment>
            )
          })}
        </ol>
      )}
    </section>
  )
}
