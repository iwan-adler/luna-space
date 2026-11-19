import { describe, expect, it } from 'vitest'
import { illumination, litPath, moonPhase, moonPhaseName } from './moon'

describe('moon phase', () => {
  it('matches known full and new moons', () => {
    // Full moon 2024-01-25 17:54 UTC; new moon 2024-02-09 22:59 UTC.
    expect(moonPhaseName(moonPhase(new Date('2024-01-25T17:54:00Z')))).toBe('Full moon')
    expect(moonPhaseName(moonPhase(new Date('2024-02-09T22:59:00Z')))).toBe('New moon')
    expect(illumination(0.5)).toBeCloseTo(1)
    expect(illumination(0)).toBeCloseTo(0)
  })

  it('draws the lit side on the right while waxing and the left while waning', () => {
    expect(litPath(0.1, 50, 50, 40)).toContain('A 40 40 0 0 1 50 90')
    expect(litPath(0.9, 50, 50, 40)).toContain('A 40 40 0 0 0 50 90')
  })
})
