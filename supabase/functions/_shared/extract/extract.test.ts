import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractFromHtml } from './extract.ts'
import { findDates } from './dates.ts'
import type { FieldResult } from './types.ts'

const fixture = (name: string) => readFileSync(join(__dirname, '__fixtures__', name), 'utf8')
const now = new Date('2026-11-17T06:00:00Z')
const run = (name: string, url = 'https://example.org/page') =>
  extractFromHtml(fixture(name), { pageUrl: url, now, defaultTimeZone: 'Asia/Kolkata' })
const get = (fields: FieldResult[], key: string) => fields.filter((f) => f.field_key === key)
const one = (fields: FieldResult[], key: string) => {
  const r = get(fields, key)
  expect(r).toHaveLength(1)
  return r[0]!
}
const dateOnly = (d: string) => ({
  all_day: true,
  on_date: d,
  at_time: null,
  source_timezone: null,
})

describe('extractFromHtml', () => {
  it('reads schema.org structured data as confirmed facts', () => {
    const { fields, thin } = run('jsonld-event.html')
    expect(one(fields, 'title')).toMatchObject({
      status: 'confirmed',
      value: 'Orbit Hack 2026',
      rule_id: 'jsonld.name',
    })
    expect(one(fields, 'event_start')).toMatchObject({
      status: 'confirmed',
      value: dateOnly('2026-12-05'),
    })
    expect(one(fields, 'event_end').value).toEqual(dateOnly('2026-12-06'))
    expect(one(fields, 'mode')).toMatchObject({ status: 'confirmed', value: 'hybrid' })
    expect(one(fields, 'location').value).toBe('IIIT Hyderabad, Hyderabad, Telangana')
    expect(one(fields, 'organizer').value).toBe('Orbit Society')
    expect(one(fields, 'fee').value).toEqual({ is_free: true, amount: null, currency: null })
    expect(one(fields, 'official_url').value).toBe('https://devspace.example/orbit-hack-2026')
    expect(thin).toBe(false)
  })

  it('reads labelled text on a typical Indian hackathon page (AC-08)', () => {
    const { fields } = run('labelled-india.html', 'https://moonlabs.example/hack')
    const reg = one(fields, 'registration_deadline')
    expect(reg).toMatchObject({ status: 'confirmed', value: dateOnly('2027-01-15') })
    expect(reg.evidence).toContain('Registration closes on 15 January 2027')
    expect(one(fields, 'submission_deadline')).toMatchObject({
      status: 'confirmed',
      value: {
        all_day: false,
        on_date: null,
        at_time: '2027-01-20T18:29:00.000Z',
        source_timezone: 'Asia/Kolkata',
      },
    })
    expect(one(fields, 'team_min').value).toBe(2)
    expect(one(fields, 'team_max').value).toBe(4)
    expect(one(fields, 'fee').value).toEqual({ is_free: true, amount: null, currency: null })
    expect(one(fields, 'mode').value).toBe('offline')
    expect(one(fields, 'location').value).toBe('IIT Bombay, Mumbai')
    expect(one(fields, 'organizer').value).toBe('Moon Labs')
    expect(String(one(fields, 'eligibility_text').value)).toContain(
      'undergraduate and postgraduate',
    )
    expect(String(one(fields, 'prizes').value)).toContain('₹1,00,000')
    expect(one(fields, 'tracks').value).toEqual(['AI for Good', 'Climate', 'Open Innovation'])
    expect(one(fields, 'required_documents').value).toEqual(['College ID card', 'Resume'])
    expect(one(fields, 'registration_url').value).toBe('https://forms.example/moonshot')
    expect(one(fields, 'rules_url').value).toBe('https://moonlabs.example/docs/rulebook.pdf')
  })

  it('marks two different deadlines as conflicting with both pieces of evidence (AC-10)', () => {
    const { fields } = run('conflicting.html')
    const sub = get(fields, 'submission_deadline')
    expect(sub.map((f) => f.status)).toEqual(['conflicting', 'conflicting'])
    expect(sub.map((f) => (f.value as { on_date: string }).on_date).sort()).toEqual([
      '2026-12-20',
      '2026-12-22',
    ])
    expect(sub.every((f) => f.evidence)).toBe(true)
    expect(one(fields, 'registration_deadline').value).toEqual(dateOnly('2026-12-10'))
    expect([one(fields, 'team_min').value, one(fields, 'team_max').value]).toEqual([1, 3])
  })

  it('infers a missing year and says so (AC-09)', () => {
    const { fields } = run('no-year.html')
    const reg = one(fields, 'registration_deadline')
    expect(reg).toMatchObject({ status: 'inferred', value: dateOnly('2026-12-15') })
    expect(reg.reason).toMatch(/year not stated; assumed 2026/)
    expect(one(fields, 'event_start').value).toEqual(dateOnly('2026-12-18'))
    expect(one(fields, 'event_end').value).toEqual(dateOnly('2026-12-19'))
    expect(one(fields, 'mode')).toMatchObject({ status: 'inferred', value: 'online' })
  })

  it('leaves missing information empty — never a default (AC-11)', () => {
    const { fields } = run('no-year.html')
    for (const key of ['team_min', 'team_max', 'fee', 'eligibility_text', 'location', 'prizes']) {
      expect(one(fields, key)).toMatchObject({ status: 'missing', value: null, evidence: null })
    }
  })

  it('flags JavaScript-only pages as thin (AC-14)', () => {
    const { fields, thin } = run('js-shell.html')
    expect(thin).toBe(true)
    expect(one(fields, 'title')).toMatchObject({ status: 'inferred', rule_id: 'page.title' })
  })

  it('handles job postings with a timed deadline and offset-based zone', () => {
    const { fields } = run('internship.html')
    expect(one(fields, 'title').value).toBe('ML Research Intern (Summer 2027)')
    expect(one(fields, 'organizer').value).toBe('Nebula AI')
    expect(one(fields, 'registration_deadline')).toMatchObject({
      status: 'confirmed',
      value: {
        all_day: false,
        at_time: '2026-12-10T18:29:00.000Z',
        source_timezone: 'Asia/Kolkata',
      },
    })
    expect(one(fields, 'mode').value).toBe('online')
    expect(String(one(fields, 'eligibility_text').value)).toContain('Final-year')
    expect(one(fields, 'fee').value).toEqual({ is_free: true, amount: null, currency: null })
  })

  it('reads month-first dates and prize pools', () => {
    const { fields } = run('scholarship.html')
    expect(one(fields, 'registration_deadline').value).toEqual(dateOnly('2026-12-31'))
    expect(String(one(fields, 'eligibility_text').value)).toMatch(/^Undergraduate women/)
    expect(String(one(fields, 'prizes').value)).toContain('₹5,00,000')
  })

  it('marks number words and dd/mm dates as inferred, and reads paid fees and ranges', () => {
    const { fields } = run('words-and-ranges.html')
    expect(one(fields, 'team_max')).toMatchObject({ status: 'inferred', value: 4 })
    const reg = one(fields, 'registration_deadline')
    expect(reg).toMatchObject({ status: 'inferred', value: dateOnly('2026-11-15') })
    expect(reg.reason).toMatch(/day\/month order assumed/)
    expect(one(fields, 'event_start').value).toEqual(dateOnly('2026-12-05'))
    expect(one(fields, 'event_end').value).toEqual(dateOnly('2026-12-06'))
    expect(one(fields, 'fee').value).toEqual({ is_free: false, amount: 499, currency: 'INR' })
    expect(one(fields, 'organizer').value).toBe('Coding Club')
  })

  it('produces one result row for each of the 19 fields', () => {
    const { fields } = run('js-shell.html')
    expect(new Set(fields.map((f) => f.field_key)).size).toBe(19)
    expect(
      fields.every((f) => f.status === 'missing' || (f.evidence && f.evidence.length <= 500)),
    ).toBe(true)
  })
})

describe('findDates', () => {
  const ctx = { now, defaultTimeZone: 'Asia/Kolkata' }
  it('assumes the stated default zone for times without a zone, and says so', () => {
    const [d] = findDates('Submit by 20 Dec 2026 at 6 pm', ctx)
    expect(d?.value).toMatchObject({
      all_day: false,
      at_time: '2026-12-20T12:30:00.000Z',
      source_timezone: 'Asia/Kolkata',
    })
    expect(d?.inferred).toMatch(/time zone not stated/)
  })
  it('maps zone abbreviations', () => {
    const [d] = findDates('Deadline: December 1, 2026 11:59 PM PST', ctx)
    expect(d?.value.source_timezone).toBe('America/Los_Angeles')
    expect(d?.inferred).toBeNull()
  })
  it('rejects impossible dates', () => {
    expect(findDates('31 February 2027', ctx)).toEqual([])
  })
})
