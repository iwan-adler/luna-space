/** Today's moon, for the dashboard's hero art (decorative). */

const SYNODIC_DAYS = 29.530588853
// A known new moon: 2000-01-06 18:14 UTC.
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)

/** Position in the lunar cycle: 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter. */
export function moonPhase(at: Date): number {
  const days = (at.getTime() - KNOWN_NEW_MOON) / 86_400_000
  const p = (days / SYNODIC_DAYS) % 1
  return p < 0 ? p + 1 : p
}

export function moonPhaseName(p: number): string {
  const names = [
    'New moon',
    'Waxing crescent',
    'First quarter',
    'Waxing gibbous',
    'Full moon',
    'Waning gibbous',
    'Last quarter',
    'Waning crescent',
  ]
  return names[Math.round(p * 8) % 8]!
}

/** Share of the disc that is lit, 0–1. */
export function illumination(p: number): number {
  return (1 - Math.cos(2 * Math.PI * p)) / 2
}

/** SVG path of the lit part of a moon of radius r centred at (cx, cy). */
export function litPath(p: number, cx: number, cy: number, r: number): string {
  const rx = Math.abs(Math.cos(2 * Math.PI * p)) * r
  const waxing = p < 0.5
  const outerSweep = waxing ? 1 : 0
  // The terminator bulges toward the lit side for crescents and away from it for gibbous moons.
  const crescent = p < 0.25 || p > 0.75
  const termSweep = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0
  const f = (n: number) => Math.round(n * 100) / 100
  return [
    `M ${f(cx)} ${f(cy - r)}`,
    `A ${f(r)} ${f(r)} 0 0 ${outerSweep} ${f(cx)} ${f(cy + r)}`,
    `A ${f(rx)} ${f(r)} 0 0 ${termSweep} ${f(cx)} ${f(cy - r)}`,
    'Z',
  ].join(' ')
}
