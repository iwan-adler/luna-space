import { AlertTriangle, Gift, Lock, MapPin, Users, Wifi } from 'lucide-react'
import { Link } from 'react-router'
import { AtmosphericCover } from '@/components/patterns/AtmosphericCover'
import { CountdownRing } from '@/components/patterns/CountdownRing'
import { DeadlineBadge } from '@/components/patterns/DeadlineBadge'
import { Badge } from '@/components/ui/Badge'
import { formatDated } from '@/lib/dates'
import { DATE_KIND_LABELS, MODE_LABELS, STATUS_LABELS, TYPE_LABELS } from '../constants'
import {
  describeMissing,
  feeLabel,
  missingCriticalFields,
  nextDeadline,
  teamSizeLabel,
  type Opportunity,
} from '../model'
import { OpportunityStageTrack } from './OpportunityStageTrack'
import { StatusSelect } from './StatusSelect'

/** The countdown window: a full ring means a month or more to go. */
const RING_WINDOW_DAYS = 30

/** Gallery card (matches the atmospheric Project card style with cover & moon phases). */
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
  const days = deadline?.info.daysLeft ?? null
  const passed = deadline?.info.urgency === 'passed'
  const isUrgent =
    !passed &&
    (deadline?.info.urgency === 'today' ||
      deadline?.info.urgency === 'soon' ||
      (days !== null && days <= 1))

  return (
    <article
      className="panel block p-0 overflow-hidden has-[[aria-expanded='true']]:overflow-visible rounded-[20px] border border-border bg-surface shadow-card transition-all hover:border-border-hover relative has-[[aria-expanded='true']]:z-50 focus-within:z-30 hover:z-20"
      data-testid="opportunity-card"
    >
      <AtmosphericCover
        name={opp.title}
        urgent={isUrgent}
        className="h-20 rounded-t-[inherit] overflow-hidden"
      />
      <div className="relative px-5 pb-5">
        <div className="-mt-7 mb-2 flex items-end justify-between gap-2">
          <div className="relative z-10 inline-flex items-center justify-center rounded-full bg-[#18181b] border-[3px] border-[var(--color-surface)] p-1 shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
            {deadline && days !== null ? (
              <CountdownRing
                fraction={passed ? 0 : Math.min(1, days / RING_WINDOW_DAYS)}
                label={passed ? '—' : days <= 0 ? '!' : String(days)}
                sub={passed ? 'closed' : days === 1 ? 'day' : days <= 0 ? 'today' : 'days'}
                size={52}
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
            ) : (
              <CountdownRing fraction={0} label="—" sub="no date" size={52} tone="calm" />
            )}
          </div>
          <OpportunityStageTrack status={opp.status} compact />
        </div>

        <div className="flex items-start gap-2">
          <h2 className="flex-1 text-h3 font-semibold">
            <Link to={`/opportunities/${opp.id}`} className="hover:text-primary-ink">
              {opp.title}
            </Link>
          </h2>
          {opp.visibility === 'private' ? (
            <Lock className="mt-1 size-3.5 text-muted" aria-label="Private" />
          ) : null}
        </div>

        {opp.organizer ? <p className="mt-0.5 text-caption text-muted">{opp.organizer}</p> : null}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Badge tone="primary">{TYPE_LABELS[opp.type]}</Badge>
          <span className="inline-flex items-center gap-1 rounded-md bg-[#f0f0f3] dark:bg-hairline px-2 py-0.5 text-caption text-[#52525b] dark:text-muted border border-black/[0.06] dark:border-transparent [&_svg]:text-[#52525b] dark:[&_svg]:text-muted">
            {opp.mode === 'online' ? (
              <Wifi className="size-3" aria-hidden />
            ) : (
              <MapPin className="size-3" aria-hidden />
            )}
            {opp.mode !== 'unknown' ? MODE_LABELS[opp.mode] : 'Mode ?'}
            {opp.location ? ` · ${opp.location}` : ''}
          </span>
          {prize ? (
            <span className="inline-flex max-w-48 items-center gap-1 rounded-md bg-[#f0f0f3] dark:bg-hairline px-2 py-0.5 text-caption text-text border border-black/[0.06] dark:border-transparent">
              <Gift className="size-3 shrink-0 text-primary-ink" aria-hidden />
              <span className="truncate">{prize}</span>
            </span>
          ) : null}
          {team ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#f0f0f3] dark:bg-hairline px-2 py-0.5 text-caption text-[#52525b] dark:text-muted border border-black/[0.06] dark:border-transparent [&_svg]:text-[#52525b] dark:[&_svg]:text-muted">
              <Users className="size-3" aria-hidden /> {team}
            </span>
          ) : null}
          {fee ? (
            <span className="rounded-md bg-[#f0f0f3] dark:bg-hairline px-2 py-0.5 text-caption text-[#52525b] dark:text-muted border border-black/[0.06] dark:border-transparent">
              {fee}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-hairline/60 pt-2.5 text-caption">
          {deadline ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <DeadlineBadge
                value={deadline.value}
                viewerTz={viewerTz}
                prefix={deadline.kind === 'registration_deadline' ? 'Reg.' : 'Submit'}
              />
              <span className="text-muted/80 text-[11px] font-normal">
                {formatDated(deadline.value)}
              </span>
            </div>
          ) : (
            <span />
          )}
          <div className="relative z-10 has-[[aria-expanded='true']]:z-50">
            {showStatusMenu ? (
              <StatusSelect id={opp.id} status={opp.status} compact />
            ) : (
              <Badge tone="info">{STATUS_LABELS[opp.status]}</Badge>
            )}
          </div>
        </div>

        {missing.length ? (
          <p className="mt-2 flex items-center gap-1 text-caption text-warning">
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
            Missing: {describeMissing(missing)}
          </p>
        ) : null}

        {deadline ? (
          <span className="sr-only">Next deadline: {DATE_KIND_LABELS[deadline.kind]}</span>
        ) : null}
      </div>
    </article>
  )
}
