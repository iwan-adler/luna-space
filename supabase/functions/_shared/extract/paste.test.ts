import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractFromPastedText, pastedTextToHtml } from './paste'
import type { FieldResult } from './types'

const ctx = {
  pageUrl: 'https://example.test/listing',
  now: new Date('2026-11-18T08:00:00Z'),
  defaultTimeZone: 'Asia/Kolkata',
}
const fixture = (name: string) => readFileSync(join(__dirname, '__fixtures__', name), 'utf8')
const get = (fields: FieldResult[], key: string) => fields.filter((f) => f.field_key === key)

describe('pasted page text (sites that block automated reading)', () => {
  it('reads a Devpost-style page', () => {
    const { fields, thin } = extractFromPastedText(fixture('pasted-devpost-style.txt'), ctx)
    expect(thin).toBe(false)
    expect(get(fields, 'title')[0]?.value).toBe('Arbiter Hacks V1')
    // "Deadline" on one line, "Dec 21, 2026 @ 11:45pm EST" on the next; the date-only end of the
    // submission period on the same day does not count as a conflict.
    expect(get(fields, 'submission_deadline')).toHaveLength(1)
    expect(get(fields, 'submission_deadline')[0]).toMatchObject({
      status: 'confirmed',
      value: {
        all_day: false,
        at_time: '2026-12-22T04:45:00.000Z',
        source_timezone: 'America/New_York',
      },
    })
    expect(get(fields, 'event_start')[0]?.value).toMatchObject({
      all_day: true,
      on_date: '2026-10-20',
    })
    expect(get(fields, 'mode')[0]?.value).toBe('online')
    expect(get(fields, 'team_max')[0]?.value).toBe(4)
    expect(String(get(fields, 'prizes')[0]?.value)).toContain('$10,000')
    expect(String(get(fields, 'description')[0]?.value)).toContain('month-long online hackathon')
  })

  it('reads an Unstop-style page', () => {
    const { fields } = extractFromPastedText(fixture('pasted-unstop-style.txt'), ctx)
    expect(get(fields, 'title')[0]?.value).toBe('Code Sprint 2026')
    expect(get(fields, 'registration_deadline')[0]).toMatchObject({
      status: 'confirmed',
      value: { at_time: '2026-12-01T18:29:00.000Z', source_timezone: 'Asia/Kolkata' },
    })
    expect(get(fields, 'event_start')[0]).toMatchObject({ status: 'inferred' })
    expect(get(fields, 'team_min')[0]?.value).toBe(2)
    expect(get(fields, 'team_max')[0]?.value).toBe(4)
    expect(get(fields, 'fee')[0]).toMatchObject({ status: 'inferred', value: { is_free: true } })
    expect(get(fields, 'mode')[0]).toMatchObject({ status: 'inferred', value: 'online' })
    expect(get(fields, 'eligibility_text')[0]?.value).toBe('Engineering Students\nUndergraduate')
  })

  it('escapes pasted markup and caps very long pastes', () => {
    const html = pastedTextToHtml('<script>alert(1)</script>\nPrizes\n' + 'x\n'.repeat(10_000))
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('<h3>Prizes</h3>')
    expect((html.match(/<p>/g) ?? []).length).toBeLessThanOrEqual(4000)
  })

  it('never invents values from unrelated text', () => {
    const { fields, thin } = extractFromPastedText('Hello\nThis page has nothing useful.', ctx)
    expect(thin).toBe(true)
    expect(get(fields, 'submission_deadline')[0]?.status).toBe('missing')
  })
})
