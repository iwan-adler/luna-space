import { AlertTriangle, Lock, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { DeadlineBadge } from '@/components/patterns/DeadlineBadge'
import { Badge } from '@/components/ui/Badge'
import { DATE_KIND_LABELS, MODE_LABELS, STATUS_LABELS, TYPE_LABELS } from '../constants'
import {
  describeMissing,
  feeLabel,
  missingCriticalFields,
  nextDeadline,
  teamSizeLabel,
  type Opportunity,
} from '../model'
import { StatusSelect } from './StatusSelect'

/** List/pipeline card (UI spec §13). */
export function OpportunityCard({
  opp,
  viewerTz,
  showStatusMenu = true,
}: {
  opp: Opportunity
  viewerTz: string
  showStatusMenu?: boolean
}) {
  const deadline = nextDeadline(opp, viewerTz)
  const missing = missingCriticalFields(opp)
  const facts = [opp.organizer, teamSizeLabel(opp.team_min, opp.team_max), feeLabel(opp)].filter(
    Boolean,
  )

  return (
    <article
      className="rounded-md border border-border bg-surface p-3 shadow-1 transition-colors hover:border-primary/40"
      data-testid="opportunity-card"
    >
      <div className="flex flex-wrap items-start gap-2">
        <h3 className="min-w-0 flex-1 text-h3 font-semibold">
          <Link to={`/opportunities/${opp.id}`} className="hover:text-primary hover:underline">
            {opp.title}
          </Link>
          {opp.visibility === 'private' ? (
            <Lock className="ml-1 inline size-3.5 text-muted" aria-label="Private" />
          ) : null}
        </h3>
        {deadline ? (
          <DeadlineBadge
            value={deadline.value}
            viewerTz={viewerTz}
            prefix={deadline.kind === 'registration_deadline' ? 'Reg.' : 'Submit'}
          />
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge tone="primary">{TYPE_LABELS[opp.type]}</Badge>
        <Badge>
          {opp.mode !== 'unknown' ? MODE_LABELS[opp.mode] : 'Mode ?'}
          {opp.location ? (
            <>
              <MapPin className="size-3" aria-hidden /> {opp.location}
            </>
          ) : null}
        </Badge>
        {showStatusMenu ? (
          <StatusSelect id={opp.id} status={opp.status} compact />
        ) : (
          <Badge tone="info">{STATUS_LABELS[opp.status]}</Badge>
        )}
      </div>
      {facts.length ? <p className="mt-2 text-body-sm text-muted">{facts.join(' · ')}</p> : null}
      {missing.length ? (
        <p className="mt-2 flex items-center gap-1 text-caption text-warning">
          <AlertTriangle className="size-3.5" aria-hidden /> Missing: {describeMissing(missing)}
        </p>
      ) : null}
      {deadline ? (
        <span className="sr-only">Next deadline: {DATE_KIND_LABELS[deadline.kind]}</span>
      ) : null}
    </article>
  )
}
