import type { DatedValue } from '@/lib/dates'
import { deadlineInfo, type DeadlineInfo } from '@/lib/dates'
import type { Database } from '@/types/database'
import { CLOSED_STATUSES, type DateKind } from './constants'

export type OpportunityRow = Database['public']['Tables']['opportunities']['Row']
export type OpportunityDateRow = Pick<
  Database['public']['Tables']['opportunity_dates']['Row'],
  'kind' | 'all_day' | 'on_date' | 'at_time' | 'source_timezone'
>
export type Opportunity = Omit<OpportunityRow, 'search'> & { dates: OpportunityDateRow[] }

/** The dates that count as deadlines for badges and sorting. */
const DEADLINE_KINDS: DateKind[] = ['registration_deadline', 'submission_deadline']

export interface NextDeadline {
  kind: DateKind
  value: DatedValue
  info: DeadlineInfo
}

/** Nearest upcoming (or most recent passed) registration/submission deadline. */
export function nextDeadline(
  opp: Pick<Opportunity, 'dates'>,
  viewerTz: string,
  now = new Date(),
): NextDeadline | null {
  const candidates = opp.dates
    .filter((d) => DEADLINE_KINDS.includes(d.kind))
    .map((d) => ({ kind: d.kind, value: d, info: deadlineInfo(d, viewerTz, now) }))
  if (!candidates.length) return null
  const upcoming = candidates
    .filter((c) => c.info.urgency !== 'passed')
    .sort((a, b) => a.info.daysLeft - b.info.daysLeft)
  if (upcoming[0]) return upcoming[0]
  return candidates.sort((a, b) => b.info.daysLeft - a.info.daysLeft)[0] ?? null
}

export type MissingField = 'registration_deadline' | 'eligibility' | 'team_size' | 'mode'

const MISSING_LABELS: Record<MissingField, string> = {
  registration_deadline: 'registration deadline',
  eligibility: 'eligibility',
  team_size: 'team size',
  mode: 'online/offline mode',
}

/** Critical fields that are missing (FR-OPP-14). Closed opportunities raise no warnings. */
export function missingCriticalFields(
  opp: Pick<
    Opportunity,
    'dates' | 'eligibility_text' | 'team_min' | 'team_max' | 'mode' | 'status' | 'type'
  >,
): MissingField[] {
  if (CLOSED_STATUSES.includes(opp.status)) return []
  const missing: MissingField[] = []
  if (!opp.dates.some((d) => d.kind === 'registration_deadline'))
    missing.push('registration_deadline')
  if (!opp.eligibility_text?.trim()) missing.push('eligibility')
  const teamBased = ['hackathon', 'coding_competition', 'innovation_challenge'].includes(opp.type)
  if (teamBased && opp.team_min == null && opp.team_max == null) missing.push('team_size')
  if (opp.mode === 'unknown') missing.push('mode')
  return missing
}

export function describeMissing(fields: MissingField[]): string {
  return fields.map((f) => MISSING_LABELS[f]).join(', ')
}

export function teamSizeLabel(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null
  if (min != null && max != null) return min === max ? `Team of ${min}` : `Team ${min}–${max}`
  if (min != null) return `Team of ${min}+`
  return `Team up to ${max}`
}

export function feeLabel(
  o: Pick<Opportunity, 'is_free' | 'fee_amount' | 'fee_currency'>,
): string | null {
  if (o.is_free) return 'Free'
  if (o.fee_amount != null) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: o.fee_currency ?? 'INR',
      maximumFractionDigits: 2,
    }).format(o.fee_amount)
  }
  return null
}
