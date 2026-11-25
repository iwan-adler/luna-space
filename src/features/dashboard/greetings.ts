/**
 * Dynamic, moon-themed dashboard greeting system.
 *
 * Provides time-bucketed greetings, contextual touches (day of week, return visit, deadline awareness),
 * and subtitle text tailored to the user's local time zone.
 */

export type TimeBucket =
  'late_night' | 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night'

export interface GreetingConfig {
  greeting: string
  subtitle: string
  bucket: TimeBucket
}

export interface PickGreetingOptions {
  date?: Date
  timeZone?: string
  name?: string
  lastGreeting?: string
  daysSinceLastVisit?: number
  deadlineDays?: number
  random?: () => number
}

export const BUCKET_SUBTITLES: Record<TimeBucket, string> = {
  late_night: "Here's what's happening in your space tonight.",
  early_morning: "The space is quiet. Here's your agenda for today.",
  morning: "Here's an overview of your active tasks and sprints.",
  afternoon: "Here's how your projects and team are tracking.",
  evening: "Here's the latest updates from your workspace.",
  night: "Here's what's underway before tomorrow.",
}

export const TIME_BUCKET_GREETINGS: Record<TimeBucket, string[]> = {
  late_night: [
    'Burning the midnight oil, {name}?',
    'Late night sprint, {name}?',
    "The moon's keeping you company, {name}",
    "Still up, {name}? Let's make it count",
    'Night owl mode: on, {name}',
    'Deep night focus, {name}',
    'Midnight momentum, {name}',
    'The quiet hours are yours, {name}',
  ],
  early_morning: [
    'Early start, {name}',
    "Moonset, sunrise: you're up first, {name}",
    'Quiet hours, big ideas, {name}',
    'First light of day, {name}',
    'Dawn patrol, {name}',
    'Ahead of the world, {name}',
    'Morning silence, pure focus, {name}',
    'Early birds build first, {name}',
  ],
  morning: [
    'Good morning, {name}',
    'Fresh day, fresh ideas, {name}',
    'Rise and ship, {name}',
    'Morning momentum, {name}',
    'Ready to make moves, {name}?',
    'New daylight, clean slate, {name}',
    "Sun's up, time to build, {name}",
    'Coffee poured, focus on, {name}',
  ],
  afternoon: [
    'Good afternoon, {name}',
    'Afternoon momentum, {name}',
    'Halfway there, {name}',
    'Keep the rhythm going, {name}',
    'Midday groove, {name}',
    'Second wind starts now, {name}',
    'Cruising through the day, {name}',
    'Peak building hours, {name}',
  ],
  evening: [
    'Good evening, {name}',
    'Golden hour, {name}',
    'Evening focus, {name}',
    'Winding down or gearing up, {name}?',
    'Twilight sprint, {name}',
    'Closing the day strong, {name}',
    'Dusk arrives, focus sharpens, {name}',
    'Golden light, good progress, {name}',
  ],
  night: [
    'Moonlit and focused, {name}',
    'Night shift begins, {name}',
    'Under the moon, {name}',
    'Late evening rhythm, {name}',
    'Quiet night in the studio, {name}',
    'Starlit building, {name}',
    'The moon is high, {name}',
    'Wrapping up or diving in, {name}?',
  ],
}

export function getTimeBucket(hour: number): TimeBucket {
  if (hour >= 0 && hour < 4) return 'late_night'
  if (hour >= 4 && hour < 7) return 'early_morning'
  if (hour >= 7 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

export function getLocalHour(date: Date, timeZone?: string): number {
  if (!timeZone) return date.getHours()
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false,
    })
    const parts = formatter.formatToParts(date)
    const hourPart = parts.find((p) => p.type === 'hour')
    if (hourPart) {
      const val = parseInt(hourPart.value, 10)
      return val === 24 ? 0 : val
    }
    return date.getHours()
  } catch {
    return date.getHours()
  }
}

export function getLocalWeekday(date: Date, timeZone?: string): number {
  if (!timeZone) return date.getDay()
  try {
    const dayName = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date)
    const days: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    return days[dayName] ?? date.getDay()
  } catch {
    return date.getDay()
  }
}

/** Formats a template string by replacing `{name}` with user's name, or cleanly removing it. */
export function formatGreeting(template: string, name?: string): string {
  const firstName = name?.trim() ? name.trim().split(/\s+/)[0] : ''
  if (firstName) {
    return template.replace(/\{name\}/g, firstName)
  }
  // When no name is provided, cleanly strip ", {name}" or "{name}" while keeping punctuation
  return template
    .replace(/,\s*\{name\}\?/g, '?')
    .replace(/,\s*\{name\}!/g, '!')
    .replace(/,\s*\{name\}/g, '')
    .replace(/\{name\}\?/g, '?')
    .replace(/\{name\}!/g, '!')
    .replace(/\{name\}/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Pure function to pick a greeting and subtitle.
 * Supports overloaded arguments:
 * - pickGreeting(date, name, lastGreeting)
 * - pickGreeting({ date, timeZone, name, lastGreeting, ... })
 */
export function pickGreeting(
  dateOrOptions: Date | PickGreetingOptions = new Date(),
  nameArg?: string,
  lastGreetingArg?: string,
  extraOptions?: Partial<PickGreetingOptions>,
): GreetingConfig {
  let opts: PickGreetingOptions

  if (dateOrOptions instanceof Date) {
    opts = {
      date: dateOrOptions,
      name: nameArg,
      lastGreeting: lastGreetingArg,
      ...extraOptions,
    }
  } else {
    opts = {
      date: new Date(),
      ...dateOrOptions,
    }
  }

  const {
    date = new Date(),
    timeZone,
    name,
    lastGreeting,
    daysSinceLastVisit,
    deadlineDays,
    random = Math.random,
  } = opts

  const hour = getLocalHour(date, timeZone)
  const weekday = getLocalWeekday(date, timeZone)
  const bucket = getTimeBucket(hour)
  const subtitle = BUCKET_SUBTITLES[bucket]

  // Collect potential context-aware candidates
  const contextCandidates: string[] = []

  // 1. Returning after long gap (>= 48 hours)
  if (daysSinceLastVisit !== undefined && daysSinceLastVisit >= 2) {
    contextCandidates.push('Welcome back, {name}', 'Great to see you again, {name}')
  }

  // 2. Hackathon / deadline awareness
  if (deadlineDays !== undefined) {
    if (deadlineDays === 0) {
      contextCandidates.push('Demo day is today, {name}!')
    } else if (deadlineDays === 1) {
      contextCandidates.push('Demo day is tomorrow, {name}!')
    } else if (deadlineDays > 1 && deadlineDays <= 7) {
      contextCandidates.push(`Demo day is close, {name}`, `${deadlineDays} days to go, {name}`)
    }
  }

  // 3. Day of week variants
  if (weekday === 1) {
    // Monday
    contextCandidates.push('Fresh week, {name}', 'Monday momentum, {name}')
  } else if (weekday === 5) {
    // Friday
    contextCandidates.push('Almost the weekend, {name}', 'Friday finish line, {name}')
  } else if (weekday === 0 || weekday === 6) {
    // Weekend (Sat / Sun)
    contextCandidates.push('Weekend grind, {name}?', 'Weekend building, {name}')
  }

  const timeCandidates = TIME_BUCKET_GREETINGS[bucket]

  // ~25% chance of choosing a context-aware greeting if available
  const useContext = contextCandidates.length > 0 && random() < 0.25
  const pool = useContext ? contextCandidates : timeCandidates

  // Filter out the last greeting to never show the exact same line twice in a row
  const formattedCandidates = pool.map((tmpl) => formatGreeting(tmpl, name))
  const filtered = formattedCandidates.filter((cand) => cand !== lastGreeting)
  const candidatesToPick = filtered.length > 0 ? filtered : formattedCandidates

  const pickedIndex = Math.floor(random() * candidatesToPick.length)
  const greeting = candidatesToPick[pickedIndex] ?? formatGreeting(timeCandidates[0]!, name)

  return {
    greeting,
    subtitle,
    bucket,
  }
}

/** Convenience shorthand returning just the greeting string. */
export function getGreeting(date: Date = new Date(), name?: string, lastGreeting?: string): string {
  return pickGreeting(date, name, lastGreeting).greeting
}
