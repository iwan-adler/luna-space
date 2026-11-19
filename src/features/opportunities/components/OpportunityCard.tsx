import { AlertTriangle, Gift, Lock, MapPin, Users, Wifi } from 'lucide-react'
import { Link } from 'react-router'
import { CountdownRing } from '@/components/patterns/CountdownRing'
import { DeadlineBadge } from '@/components/patterns/DeadlineBadge'
import { gradientFor, initials } from '@/lib/visuals'
import { DATE_KIND_LABELS, MODE_LABELS, TYPE_HUE, TYPE_LABELS } from '../constants'
import {
  describeMissing,
  feeLabel,
  missingCriticalFields,
  nextDeadline,
  teamSizeLabel,
  type Opportunity,
} from '../model'
import { StatusSelect } from './StatusSelect'
import { Badge } from '@/components/ui/Badge'
import { STATUS_LABELS } from '../constants'

/** The countdown window: a full ring means a month or more to go. */
const RING_WINDOW_DAYS = 30

/** Gallery card (UI spec §13, ADR 0019). */
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
  const team = teamSizeLabel(opp.team_min, opp.team_max)
  const fee = feeLabel(opp)
  const prize = opp.prizes?.split(/\n|;|•/)[0]?.trim()
  const hue = TYPE_HUE[opp.type] ?? TYPE_HUE.other!
  const days = deadline?.info.daysLeft ?? null
  const passed = deadline?.info.urgency === 'passed'

  return (
    <article className="panel relative overflow-hidden p-0" data-testid="opportunity-card">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: hue, boxShadow: `0 0 18px 1px ${hue}` }}
      />
      <div className="flex items-start gap-3.5 p-5 pl-6">
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-[14px] text-body-sm font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]"
          style={{ background: gradientFor(opp.organizer || opp.title) }}
        >
          {initials(opp.organizer || opp.title)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-h3 font-medium">
            <Link
              to={`/opportunities/${opp.id}`}
              className="after:absolute after:inset-0 hover:text-primary"
            >
              {opp.title}
            </Link>
            {opp.visibility === 'private' ? (
              <Lock className="ml-1 inline size-3.5 text-muted" aria-label="Private" />
            ) : null}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-caption text-muted">
            <span className="size-1.5 rounded-full" style={{ background: hue }} aria-hidden />
            {TYPE_LABELS[opp.type]}
            {opp.organizer ? ` · ${opp.organizer}` : ''}
          </p>
        </div>
        {deadline && days !== null ? (
          <div className="flex shrink-0 flex-col items-center gap-1">
            <CountdownRing
              fraction={passed ? 0 : Math.min(1, days / RING_WINDOW_DAYS)}
              label={passed ? '—' : days <= 0 ? '!' : String(days)}
              sub={passed ? 'closed' : days === 1 ? 'day' : days <= 0 ? 'today' : 'days'}
              tone={
                passed
                  ? 'passed'
                  : deadline.info.urgency === 'today' || deadline.info.urgency === 'soon'
                    ? 'urgent'
                    : deadline.info.urgency === 'week'
                      ? 'soon'
                      : 'calm'
              }
            />
            <DeadlineBadge
              value={deadline.value}
              viewerTz={viewerTz}
              prefix={deadline.kind === 'registration_deadline' ? 'Reg.' : 'Submit'}
            />
          </div>
        ) : null}
      </div>
      <div className="relative z-10 flex flex-wrap items-center gap-1.5 px-5 pb-4 pl-6">
        <span className="inline-flex items-center gap-1 rounded-full bg-hairline px-2.5 py-0.5 text-caption">
          {opp.mode === 'online' ? (
            <Wifi className="size-3" aria-hidden />
          ) : (
            <MapPin className="size-3" aria-hidden />
          )}
          {opp.mode !== 'unknown' ? MODE_LABELS[opp.mode] : 'Mode ?'}
          {opp.location ? ` · ${opp.location}` : ''}
        </span>
        {prize ? (
          <span className="inline-flex max-w-56 items-center gap-1 rounded-full bg-hairline px-2.5 py-0.5 text-caption">
            <Gift className="size-3 shrink-0 text-highlight" aria-hidden />
            <span className="truncate">{prize}</span>
          </span>
        ) : null}
        {team ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-hairline px-2.5 py-0.5 text-caption">
            <Users className="size-3" aria-hidden /> {team}
          </span>
        ) : null}
        {fee ? (
          <span className="rounded-full bg-hairline px-2.5 py-0.5 text-caption">{fee}</span>
        ) : null}
        <span className="ml-auto">
          {showStatusMenu ? (
            <StatusSelect id={opp.id} status={opp.status} compact />
          ) : (
            <Badge tone="info">{STATUS_LABELS[opp.status]}</Badge>
          )}
        </span>
      </div>
      {missing.length ? (
        <p className="flex items-center gap-1 px-5 pb-4 pl-6 text-caption text-warning">
          <AlertTriangle className="size-3.5" aria-hidden /> Missing: {describeMissing(missing)}
        </p>
      ) : null}
      {deadline ? (
        <span className="sr-only">Next deadline: {DATE_KIND_LABELS[deadline.kind]}</span>
      ) : null}
    </article>
  )
}
