import { describe, expect, it } from 'vitest'
import { describeLink, firstLink } from './links'

describe('chat links', () => {
  it('finds the first web link and trims trailing punctuation', () => {
    expect(firstLink('See https://devpost.com/hackathons, then reply.')).toBe(
      'https://devpost.com/hackathons',
    )
    expect(firstLink('no links here')).toBeNull()
    expect(firstLink('javascript:alert(1)')).toBeNull()
  })

  it('describes a link for display', () => {
    expect(describeLink('https://www.example.org/a/b/')).toEqual({
      host: 'example.org',
      path: '/a/b',
    })
  })
})
