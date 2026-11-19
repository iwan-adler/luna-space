import { describe, expect, it } from 'vitest'
import { countdown, findMissions, instantOf, shortCountdown, type MissionSource } from './model'

const now = new Date('2026-11-20T10:00:00Z')
const opp = (patch: Partial<MissionSource>): MissionSource => ({
  id: 'o1',
  title: 'Rover Hack',
  status: 'registered',
  dates: [],
  ...patch,
})
const date = (kind: string, at: string) => ({
  kind: kind as 'submission_deadline',
  all_day: false,
  on_date: at.slice(0, 10),
  at_time: at,
  source_timezone: 'UTC',
})

describe('missions', () => {
  it('a submission within a week is a mission; later ones are not yet', () => {
    const soon = opp({ dates: [date('submission_deadline', '2026-11-22T18:00:00Z')] })
    const later = opp({ id: 'o2', dates: [date('submission_deadline', '2026-12-20T18:00:00Z')] })
    expect(findMissions([soon, later], 'UTC', now).map((m) => m.id)).toEqual(['o1'])
  })

  it('a running event is live even when its end is far away', () => {
    const o = opp({
      dates: [
        date('event_start', '2026-11-19T09:00:00Z'),
        date('event_end', '2026-12-10T09:00:00Z'),
      ],
    })
    expect(findMissions([o], 'UTC', now)[0]).toMatchObject({ live: true, kind: 'event_end' })
  })

  it('ignores opportunities you are not taking part in, and past deadlines', () => {
    const saved = opp({
      status: 'saved',
      dates: [date('submission_deadline', '2026-11-21T00:00:00Z')],
    })
    const past = opp({ dates: [date('submission_deadline', '2026-11-19T00:00:00Z')] })
    expect(findMissions([saved, past], 'UTC', now)).toEqual([])
  })

  it('an all-day deadline runs to the end of that day in its time zone', () => {
    const d = {
      all_day: true,
      on_date: '2026-11-21',
      at_time: null,
      source_timezone: 'Asia/Kolkata',
    }
    expect(instantOf(d, 'UTC').toISOString()).toBe('2026-11-21T18:29:00.000Z')
  })

  it('formats the countdown and its urgency', () => {
    expect(shortCountdown(countdown(new Date('2026-11-22T14:30:00Z'), now))).toBe('2d 4h')
    expect(countdown(new Date('2026-11-20T20:00:00Z'), now).tone).toBe('urgent')
    expect(shortCountdown(countdown(new Date('2026-11-20T10:09:30Z'), now))).toBe('9m')
  })
})
