import { Radio, Rocket, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useMissions, useNow } from './hooks'
import { countdown, shortCountdown } from './model'

const DISMISS_KEY = 'luna.mission.dismissed'

function readDismissed(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISS_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

/**
 * The glowing countdown bar across the top while a hackathon you are in is close or running
 * (ADR 0019). It turns amber within 72 hours and red within 12.
 */
export function MissionBar() {
  const missions = useMissions()
  const now = useNow(30_000)
  const location = useLocation()
  const [dismissed, setDismissed] = useState(readDismissed)
  const mission = missions.find((m) => !dismissed.includes(m.id))
  if (!mission || location.pathname.startsWith('/mission/')) return null
  const c = countdown(mission.endsAt, now)
  const tone =
    c.tone === 'urgent'
      ? 'from-danger/35 via-danger/15 to-danger/35 border-danger/40'
      : c.tone === 'soon'
        ? 'from-warning/30 via-warning/10 to-warning/30 border-warning/35'
        : 'from-primary/30 via-primary/10 to-primary/30 border-primary/30'

  return (
    <div
      role="region"
      aria-label="Mission countdown"
      className={`mission-sweep mb-4 flex items-center gap-3 rounded-[18px] border bg-gradient-to-r px-4 py-2.5 backdrop-blur-md ${tone}`}
      data-testid="mission-bar"
    >
      <span className="icon-bubble size-8 shrink-0">
        {mission.live ? (
          <Radio className="size-4" aria-hidden />
        ) : (
          <Rocket className="size-4" aria-hidden />
        )}
      </span>
      <p className="min-w-0 flex-1 text-body-sm">
        <span className="font-semibold">{mission.title}</span>
        <span className="text-muted">
          {' · '}
          {mission.live ? 'live now · ' : ''}
          {mission.kind === 'submission_deadline' ? 'submission' : 'ends'} in{' '}
        </span>
        <span className="stat-number font-semibold">{shortCountdown(c)}</span>
      </p>
      <Link
        to={`/mission/${mission.id}`}
        className="btn-primary shrink-0 rounded-full px-3.5 py-1.5 text-body-sm font-medium"
      >
        Mission control
      </Link>
      <button
        type="button"
        className="icon-btn size-8 shrink-0"
        aria-label="Hide for now"
        onClick={() => {
          const next = [...dismissed, mission.id]
          setDismissed(next)
          try {
            sessionStorage.setItem(DISMISS_KEY, JSON.stringify(next))
          } catch {
            // Hiding is a convenience only.
          }
        }}
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
