/**
 * Browsers (ICU) still report some legacy zone names, e.g. Chrome returns "Asia/Calcutta"
 * where the IANA database and our default use "Asia/Kolkata". Normalise to current names so
 * selects always contain the stored value.
 */
const MODERN_NAMES: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Rangoon': 'Asia/Yangon',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Atlantic/Faeroe': 'Atlantic/Faroe',
  'Europe/Kiev': 'Europe/Kyiv',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'Pacific/Enderbury': 'Pacific/Kanton',
}

export function normalizeTimeZone(zone: string): string {
  return MODERN_NAMES[zone] ?? zone
}

let cache: string[] | null = null

export function listTimeZones(): string[] {
  if (cache) return cache
  let zones: string[]
  try {
    zones = Intl.supportedValuesOf('timeZone')
  } catch {
    zones = []
  }
  cache = [...new Set([...zones.map(normalizeTimeZone), 'Asia/Kolkata', 'UTC'])].sort()
  return cache
}

/** Zone options that are guaranteed to include `current` (never silently change a stored value). */
export function timeZoneOptions(current?: string | null): { value: string; label: string }[] {
  const zones = listTimeZones()
  const list = current && !zones.includes(current) ? [...zones, current].sort() : zones
  return list.map((z) => ({ value: z, label: z.replace(/_/g, ' ') }))
}

export function deviceTimeZone(): string {
  try {
    return normalizeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata')
  } catch {
    return 'Asia/Kolkata'
  }
}
