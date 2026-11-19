import { describe, expect, it } from 'vitest'
import { gradientFor, hashString, initials } from './visuals'

describe('visual helpers', () => {
  it('gives the same gradient for the same name', () => {
    expect(gradientFor('Lunar Rover')).toBe(gradientFor('Lunar Rover'))
    expect(gradientFor('Lunar Rover')).not.toBe(gradientFor('Solar Sail'))
    expect(hashString('a')).not.toBe(hashString('b'))
  })

  it('makes monogram initials', () => {
    expect(initials('Smart India Hackathon')).toBe('SI')
    expect(initials('devpost')).toBe('DE')
    expect(initials('  ')).toBe('?')
  })
})
