const FALLBACK = ['Asia/Kolkata', 'UTC']

export function listTimeZones(): string[] {
  try {
    const zones = Intl.supportedValuesOf('timeZone')
    return zones.includes('UTC') ? zones : [...zones, 'UTC']
  } catch {
    return FALLBACK
  }
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
  } catch {
    return 'Asia/Kolkata'
  }
}
