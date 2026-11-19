import { describe, expect, it } from 'vitest'
import { parseDevpost, parseGithub, parseLinkedin, parseWebsite } from './links'

describe('profile links', () => {
  it('reads GitHub usernames from links or handles', () => {
    expect(parseGithub('https://github.com/ana-dev')).toEqual({ ok: true, value: 'ana-dev' })
    expect(parseGithub('@ana-dev')).toEqual({ ok: true, value: 'ana-dev' })
    expect(parseGithub('')).toEqual({ ok: true, value: null })
    expect(parseGithub('bad--name').ok).toBe(false)
  })

  it('normalises LinkedIn links', () => {
    expect(parseLinkedin('linkedin.com/in/ana-dev')).toEqual({
      ok: true,
      value: 'https://www.linkedin.com/in/ana-dev/',
    })
    expect(parseLinkedin('https://in.linkedin.com/in/ana.dev/')).toEqual({
      ok: true,
      value: 'https://www.linkedin.com/in/ana.dev/',
    })
    expect(parseLinkedin('https://evil.example/in/ana').ok).toBe(false)
  })

  it('makes websites https and refuses other schemes', () => {
    expect(parseWebsite('ana.dev')).toEqual({ ok: true, value: 'https://ana.dev' })
    expect(parseWebsite('http://ana.dev/work')).toEqual({ ok: true, value: 'https://ana.dev/work' })
    expect(parseWebsite('javascript:alert(1)').ok).toBe(false)
    expect(parseWebsite('localhost').ok).toBe(false)
  })

  it('reads Devpost usernames', () => {
    expect(parseDevpost('https://devpost.com/ana_dev')).toEqual({ ok: true, value: 'ana_dev' })
    expect(parseDevpost('ana dev').ok).toBe(false)
  })
})
