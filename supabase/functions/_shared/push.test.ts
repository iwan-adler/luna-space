import { describe, expect, it } from 'vitest'
import { buildPayload, isGone, safeEqual, type ClaimedRow } from './push'

const row = (over: Partial<ClaimedRow> = {}): ClaimedRow => ({
  notification_id: 'n1',
  recipient_id: 'u1',
  title: 'Moonshot Hack: registration deadline tomorrow',
  body: null,
  link_path: '/opportunities/o1',
  show_details: true,
  subscriptions: [],
  ...over,
})

describe('push payloads', () => {
  it('carries the title, link and a tag that collapses repeats', () => {
    expect(buildPayload(row())).toEqual({
      title: 'Moonshot Hack: registration deadline tomorrow',
      body: '',
      url: '/opportunities/o1',
      tag: 'n1',
    })
  })
  it('hides details on the lock screen when asked', () => {
    const p = buildPayload(row({ show_details: false }))
    expect(p.title).toBe('Luna Space')
    expect(p.body).not.toContain('Moonshot')
  })
  it('never links outside the app', () => {
    expect(buildPayload(row({ link_path: 'https://evil.example' })).url).toBe('/notifications')
    expect(buildPayload(row({ link_path: null })).url).toBe('/notifications')
  })
})

describe('helpers', () => {
  it('recognises expired subscriptions', () => {
    expect(isGone(410)).toBe(true)
    expect(isGone(404)).toBe(true)
    expect(isGone(429)).toBe(false)
    expect(isGone(undefined)).toBe(false)
  })
  it('compares tokens safely', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
  })
})
