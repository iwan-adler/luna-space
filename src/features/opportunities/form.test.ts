import { describe, expect, it } from 'vitest'
import {
  emptyForm,
  formFromOpportunity,
  opportunityFormSchema,
  splitList,
  toSavePayload,
} from './form'
import type { Opportunity } from './model'
import { missingCriticalFields, nextDeadline, teamSizeLabel } from './model'

describe('opportunity form', () => {
  it('keeps date-only deadlines as dates and converts timed ones with their zone (FR-OPP-03)', () => {
    const v = emptyForm('Asia/Kolkata')
    v.title = 'Moonshot'
    v.dates.registration_deadline = {
      date: '2026-12-15',
      hasTime: false,
      time: '',
      timezone: 'Asia/Kolkata',
    }
    v.dates.submission_deadline = {
      date: '2026-12-20',
      hasTime: true,
      time: '23:59',
      timezone: 'Asia/Kolkata',
    }
    const p = toSavePayload(v)
    expect(p.dates).toEqual([
      {
        kind: 'registration_deadline',
        all_day: true,
        on_date: '2026-12-15',
        at_time: null,
        source_timezone: null,
      },
      {
        kind: 'submission_deadline',
        all_day: false,
        on_date: null,
        at_time: '2026-12-20T18:29:00.000Z',
        source_timezone: 'Asia/Kolkata',
      },
    ])
  })

  it('maps blanks to null and lists to arrays', () => {
    const v = emptyForm('UTC')
    v.title = '  Hack  '
    v.tracks = 'AI, Open,AI'
    v.requiredDocuments = 'Student ID\nResume'
    const f = toSavePayload(v).fields
    expect(f.title).toBe('Hack')
    expect(f.organizer).toBeNull()
    expect(f.tracks).toEqual(['AI', 'Open'])
    expect(f.required_documents).toEqual(['Student ID', 'Resume'])
    expect(f.is_free).toBeNull()
  })

  it('validates team size order, URLs and paid fees', () => {
    const v = { ...emptyForm('UTC'), title: 'x', teamMin: '5', teamMax: '2' }
    expect(opportunityFormSchema.safeParse(v).success).toBe(false)
    expect(
      opportunityFormSchema.safeParse({
        ...emptyForm('UTC'),
        title: 'x',
        officialUrl: 'javascript:x',
      }).success,
    ).toBe(false)
    expect(
      opportunityFormSchema.safeParse({ ...emptyForm('UTC'), title: 'x', fee: 'paid' }).success,
    ).toBe(false)
    expect(opportunityFormSchema.safeParse({ ...emptyForm('UTC'), title: 'x' }).success).toBe(true)
  })

  it('splits lists without duplicates', () => {
    expect(splitList('a, b\n\na ,c')).toEqual(['a', 'b', 'c'])
  })

  it('round-trips a saved opportunity into the form', () => {
    const o = {
      type: 'internship',
      title: 'Summer intern',
      mode: 'online',
      visibility: 'private',
      required_documents: ['CV'],
      tracks: [],
      tags: ['ml'],
      is_free: null,
      fee_amount: null,
      fee_currency: 'INR',
      team_min: null,
      team_max: null,
      dates: [
        {
          kind: 'submission_deadline',
          all_day: false,
          on_date: null,
          at_time: '2026-12-20T18:29:00Z',
          source_timezone: 'Asia/Kolkata',
        },
      ],
    } as unknown as Opportunity
    const f = formFromOpportunity(o, 'Europe/Berlin')
    expect(f.dates.submission_deadline).toEqual({
      date: '2026-12-20',
      hasTime: true,
      time: '23:59',
      timezone: 'Asia/Kolkata',
    })
    expect(f.requiredDocuments).toBe('CV')
    expect(f.visibility).toBe('private')
  })
})

describe('opportunity model', () => {
  const base = {
    type: 'hackathon',
    status: 'interested',
    mode: 'unknown',
    eligibility_text: null,
    team_min: null,
    team_max: null,
    dates: [],
  } as unknown as Opportunity

  it('lists missing critical fields (FR-OPP-14)', () => {
    expect(missingCriticalFields(base)).toEqual([
      'registration_deadline',
      'eligibility',
      'team_size',
      'mode',
    ])
    expect(missingCriticalFields({ ...base, status: 'archived' })).toEqual([])
  })

  it('picks the nearest upcoming deadline', () => {
    const now = new Date('2026-11-17T06:00:00Z')
    const o = {
      dates: [
        {
          kind: 'registration_deadline',
          all_day: true,
          on_date: '2026-11-10',
          at_time: null,
          source_timezone: null,
        },
        {
          kind: 'submission_deadline',
          all_day: true,
          on_date: '2026-11-30',
          at_time: null,
          source_timezone: null,
        },
        {
          kind: 'event_start',
          all_day: true,
          on_date: '2026-11-20',
          at_time: null,
          source_timezone: null,
        },
      ],
    } as unknown as Opportunity
    expect(nextDeadline(o, 'Asia/Kolkata', now)?.kind).toBe('submission_deadline')
  })

  it('labels team sizes', () => {
    expect(teamSizeLabel(2, 4)).toBe('Team 2–4')
    expect(teamSizeLabel(1, 1)).toBe('Team of 1')
    expect(teamSizeLabel(null, 5)).toBe('Team up to 5')
    expect(teamSizeLabel(null, null)).toBeNull()
  })
})
