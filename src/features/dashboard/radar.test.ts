import { describe, expect, it } from 'vitest'
import type { Opportunity } from '@/features/opportunities'
import { radarPicks } from './radar'

const NOW = new Date('2026-11-27T10:00:00Z')
const TZ = 'UTC'

function opp(
  id: string,
  over: Partial<Opportunity> = {},
  deadline: string | null = null,
): Opportunity {
  return {
    id,
    type: 'hackathon',
    status: 'interested',
    title: id,
    updated_at: '2026-11-01T00:00:00Z',
    dates: deadline
      ? [
          {
            kind: 'registration_deadline',
            all_day: true,
            on_date: deadline,
            at_time: null,
            source_timezone: null,
          },
        ]
      : [],
    ...over,
  } as Opportunity
}

describe('radarPicks', () => {
  it('lists open hackathons, soonest deadline first, undated last', () => {
    const picks = radarPicks(
      [
        opp('later', {}, '2026-12-20'),
        opp('undated'),
        opp('soon', {}, '2026-11-30'),
        opp('coding', { type: 'coding_competition' }, '2026-12-05'),
      ],
      TZ,
      NOW,
    )
    expect(picks.map((p) => p.opp.id)).toEqual(['soon', 'coding', 'later', 'undated'])
    expect(picks[0]?.deadline?.info.relative).toBe('in 3 days')
  })

  it('leaves out past, closed and non-competition opportunities', () => {
    const picks = radarPicks(
      [
        opp('ended', {}, '2026-07-12'),
        opp('won', { status: 'won' }, '2026-12-10'),
        opp('job', { type: 'internship' }, '2026-12-10'),
        opp('open', {}, '2026-12-10'),
      ],
      TZ,
      NOW,
    )
    expect(picks.map((p) => p.opp.id)).toEqual(['open'])
  })

  it('shows at most four', () => {
    const many = Array.from({ length: 6 }, (_, i) => opp(`h${i}`, {}, `2026-12-1${i}`))
    expect(radarPicks(many, TZ, NOW)).toHaveLength(4)
  })
})
