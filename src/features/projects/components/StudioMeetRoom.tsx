import { ExternalLink, Video } from 'lucide-react'
import { useActiveLiveRooms } from '../liveRooms'
import { MeetingCard } from './MeetingCard'

/**
 * Studio Live Meeting Room: Frictionless Google Meet integration for hackathon teams.
 */
export function StudioMeetRoom({ projectId = 'studio' }: { projectId?: string }) {
  return <MeetingCard projectId={projectId} />
}

/**
 * Live Meeting Bottom Strip: ONLY pops up when someone has actively started a meeting.
 * Floats cleanly above the bottom navigation bar with a live pulse and 1-click Join button.
 */
export function LiveMeetingBottomStrip() {
  const state = useActiveLiveRooms()[0] ?? { isActive: false, meetUrl: '' }

  if (!state.isActive || !state.meetUrl) return null

  return (
    <aside
      role="region"
      aria-label="Active team meeting"
      className="fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-xl border border-primary/40 bg-surface p-3 shadow-2xl backdrop-blur-none lg:bottom-4"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="relative flex size-3 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-primary" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-body-sm font-semibold text-text">
            Meeting Live{' '}
            <span className="font-normal text-muted">· {state.startedBy || 'Team'}</span>
          </p>
          <p className="text-[11px] text-muted truncate">Google Meet call in progress</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={state.meetUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption font-semibold shadow-md"
        >
          <Video className="size-3.5" aria-hidden />
          Join Meet
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>
    </aside>
  )
}
