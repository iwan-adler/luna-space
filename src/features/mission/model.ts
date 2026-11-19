/**
 * Mission Control (ADR 0019): an opportunity you are taking part in becomes a "mission" while
 * its submission deadline (or the event's end) is close, or while the event is running.
 */
import { zonedLocalToUtcIso, type DatedValue } from '@/lib/dates'

export const MISSION_STATUSES = ['registered', 'in_progress', 'planning'] as const
export const MISSION_WINDOW_HOURS = 7 * 24

type DateKind =
  | 'registration_open'
  | 'registration_deadline'
  | 'submission_deadline'
  | 'event_start'
  | 'event_end'
  | 'result'
  | 'other'

export interface MissionDate extends DatedValue {
  kind: DateKind
}

export interface MissionSource {
  id: string
  title: string
  status: string
  dates: MissionDate[]
}

export interface Mission {
  id: string
  title: string
  /** The moment the countdown runs to. */
  endsAt: Date
  kind: 'submission_deadline' | 'event_end'
  /** The event started and has not ended (a hackathon weekend in progress). */
  live: boolean
}

/**
 * The instant a date stands for. An all-day date runs to the end of that day in its own time
 * zone (or the viewer's when it has none).
 */
export function instantOf(d: DatedValue, viewerTz: string): Date {
  if (!d.all_day && d.at_time) return new Date(d.at_time)
  const tz = d.source_timezone ?? viewerTz
  return new Date(zonedLocalToUtcIso(`${d.on_date}T23:59`, tz))
}

function startOf(d: DatedValue, viewerTz: string): Date {
  if (!d.all_day && d.at_time) return new Date(d.at_time)
  const tz = d.source_timezone ?? viewerTz
  return new Date(zonedLocalToUtcIso(`${d.on_date}T00:00`, tz))
}

/** Missions now, nearest end first. */
export function findMissions(opps: MissionSource[], viewerTz: string, now = new Date()): Mission[] {
  const out: Mission[] = []
  for (const o of opps) {
    if (!(MISSION_STATUSES as readonly string[]).includes(o.status)) continue
    const ends = o.dates
      .filter((d) => d.kind === 'submission_deadline' || d.kind === 'event_end')
      .map((d) => ({ kind: d.kind as Mission['kind'], at: instantOf(d, viewerTz) }))
      .filter((e) => e.at.getTime() > now.getTime())
      .sort((a, b) => a.at.getTime() - b.at.getTime())
    const next = ends[0]
    if (!next) continue
    const start = o.dates.find((d) => d.kind === 'event_start')
    const live = start ? startOf(start, viewerTz).getTime() <= now.getTime() : false
    const hoursLeft = (next.at.getTime() - now.getTime()) / 3_600_000
    if (live || hoursLeft <= MISSION_WINDOW_HOURS) {
      out.push({ id: o.id, title: o.title, endsAt: next.at, kind: next.kind, live })
    }
  }
  return out.sort((a, b) => a.endsAt.getTime() - b.endsAt.getTime())
}

export interface Countdown {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMs: number
  /** calm > 72 h, soon ≤ 72 h, urgent ≤ 12 h. */
  tone: 'calm' | 'soon' | 'urgent'
}

export function countdown(to: Date, now = new Date()): Countdown {
  const totalMs = Math.max(0, to.getTime() - now.getTime())
  const s = Math.floor(totalMs / 1000)
  const hoursLeft = totalMs / 3_600_000
  return {
    days: Math.floor(s / 86_400),
    hours: Math.floor((s % 86_400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    totalMs,
    tone: hoursLeft <= 12 ? 'urgent' : hoursLeft <= 72 ? 'soon' : 'calm',
  }
}

/** "2d 4h", "14h 22m", "9m" — the short form for the bar. */
export function shortCountdown(c: Countdown): string {
  if (c.totalMs <= 0) return 'now'
  if (c.days > 0) return `${c.days}d ${c.hours}h`
  if (c.hours > 0) return `${c.hours}h ${c.minutes}m`
  return `${c.minutes}m`
}
