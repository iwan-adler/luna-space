import { CLOSED_STATUSES, nextDeadlineOf, type Opportunity } from '@/features/opportunities'

/** Opportunity types the Radar shows: team competitions. */
export const RADAR_TYPES: readonly Opportunity['type'][] = [
  'hackathon',
  'coding_competition',
  'innovation_challenge',
]

export interface RadarPick {
  opp: Opportunity
  deadline: ReturnType<typeof nextDeadlineOf>
}

/**
 * The team's open hackathons and competitions: not closed, not past their last deadline,
 * soonest deadline first, then those without a deadline (most recently updated first).
 */
export function radarPicks(
  opps: readonly Opportunity[],
  viewerTz: string,
  now = new Date(),
  limit = 4,
): RadarPick[] {
  const picks: RadarPick[] = []
  for (const opp of opps) {
    if (!RADAR_TYPES.includes(opp.type) || CLOSED_STATUSES.includes(opp.status)) continue
    const deadline = nextDeadlineOf(opp, viewerTz, now)
    if (deadline?.info.urgency === 'passed') continue
    picks.push({ opp, deadline })
  }
  return picks
    .sort((a, b) => {
      if (a.deadline && b.deadline) return a.deadline.info.daysLeft - b.deadline.info.daysLeft
      if (a.deadline) return -1
      if (b.deadline) return 1
      return b.opp.updated_at.localeCompare(a.opp.updated_at)
    })
    .slice(0, limit)
}
