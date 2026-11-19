import { describe, expect, it } from 'vitest'
import { sharedLink } from './share'

describe('shared links', () => {
  it('finds the link in whichever field the phone used', () => {
    expect(sharedLink(new URLSearchParams('url=https://devpost.com/x'))).toBe(
      'https://devpost.com/x',
    )
    expect(
      sharedLink(new URLSearchParams({ text: 'Check this https://unstop.com/hack-1 out' })),
    ).toBe('https://unstop.com/hack-1')
    expect(sharedLink(new URLSearchParams({ text: 'no link' }))).toBeNull()
    expect(sharedLink(new URLSearchParams({ url: 'javascript:alert(1)' }))).toBeNull()
  })
})
