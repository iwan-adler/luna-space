import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Opportunities from '@/features/opportunities'
import type { Opportunity } from '@/features/opportunities'
import { HackathonRadar } from './HackathonRadar'

const state = vi.hoisted(() => ({
  query: {} as {
    data?: unknown[]
    isPending: boolean
    fetchStatus: 'idle' | 'fetching' | 'paused'
    error: Error | null
  },
}))

vi.mock('@/features/opportunities', async (importOriginal) => ({
  ...(await importOriginal<typeof Opportunities>()),
  useOpportunities: () => state.query,
  useViewerTimeZone: () => 'UTC',
}))

function hackathon(id: string, title: string, over: Partial<Opportunity> = {}): Opportunity {
  return {
    id,
    title,
    type: 'hackathon',
    status: 'interested',
    organizer: 'MLH',
    prizes: '$10,000',
    mode: 'online',
    team_min: 2,
    team_max: 4,
    tracks: ['AI'],
    updated_at: '2026-11-01T00:00:00Z',
    dates: [
      {
        kind: 'registration_deadline',
        all_day: true,
        on_date: '2026-11-30',
        at_time: null,
        source_timezone: null,
      },
    ],
    ...over,
  } as Opportunity
}

const show = () =>
  render(
    <MemoryRouter>
      <HackathonRadar />
    </MemoryRouter>,
  )

describe('HackathonRadar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-27T10:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it("shows the team's open hackathons with prize, deadline and details", () => {
    state.query = {
      data: [
        hackathon('h1', 'Moon Hack'),
        hackathon('h2', 'Old Hack', {
          dates: [
            {
              kind: 'registration_deadline',
              all_day: true,
              on_date: '2026-07-12',
              at_time: null,
              source_timezone: null,
            },
          ],
        }),
      ],
      isPending: false,
      fetchStatus: 'idle',
      error: null,
    }
    show()
    const list = screen.getByTestId('radar')
    const card = within(list).getByRole('link', { name: 'Moon Hack' })
    expect(card).toHaveAttribute('href', '/opportunities/h1')
    expect(list).toHaveTextContent('$10,000')
    expect(list).toHaveTextContent('Registration closes in 3 days')
    expect(list).toHaveTextContent('Team 2–4')
    expect(list).not.toHaveTextContent('Old Hack')
  })

  it('offers to add a hackathon when there are none', () => {
    state.query = { data: [], isPending: false, fetchStatus: 'idle', error: null }
    show()
    expect(screen.getByTestId('radar-empty')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add a hackathon/ })).toHaveAttribute(
      'href',
      '/opportunities/new',
    )
  })

  it('says so when offline or when loading fails', () => {
    state.query = { isPending: true, fetchStatus: 'paused', error: null }
    const { unmount } = show()
    expect(screen.getByText(/You're offline/)).toBeInTheDocument()
    unmount()
    state.query = { isPending: false, fetchStatus: 'idle', error: new Error('x') }
    show()
    expect(screen.getByText(/Couldn't load your hackathons/)).toBeInTheDocument()
  })
})
