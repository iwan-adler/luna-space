import { Video } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useToast } from '@/components/ui/Toast'
import { NEW_MEET_URL, normaliseMeetUrl, useLiveRoom, type MeetState } from '../liveRooms'

export function MeetingCard({
  projectId = 'studio',
  className = '',
  hero = false,
}: {
  projectId?: string
  className?: string
  hero?: boolean
}) {
  const room = useLiveRoom(projectId === 'studio' ? null : projectId)
  const toast = useToast()
  const state = room.state
  const [customUrl, setCustomUrl] = useState('')
  const [editingUrl, setEditingUrl] = useState(false)

  // Shared with everyone in the workspace (ADR 0023).
  const saveState = (next: Pick<MeetState, 'isActive' | 'meetUrl'>) =>
    room.save.mutate(
      { meetUrl: next.meetUrl, isActive: next.isActive },
      { onError: (e) => toast.show(e.message, 'error') },
    )

  const startMeeting = () => {
    const targetUrl = state.meetUrl || NEW_MEET_URL
    saveState({ isActive: true, meetUrl: targetUrl })
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
  }

  const endMeeting = () => {
    saveState({ isActive: false, meetUrl: state.meetUrl })
  }

  const updateMeetUrl = (e: FormEvent) => {
    e.preventDefault()
    let url = customUrl.trim()
    if (!url) {
      setEditingUrl(false)
      return
    }
    const clean = normaliseMeetUrl(url)
    if (!clean) {
      toast.show('Use a Google Meet link, like meet.google.com/abc-defg-hij.', 'error')
      return
    }
    url = clean
    saveState({ isActive: state.isActive, meetUrl: url })
    setEditingUrl(false)
  }

  if (hero) {
    return (
      <div
        className={`relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-[#181a24] via-[#12141c] to-[#0c0d12] p-6 sm:p-10 shadow-2xl ${className}`}
      >
        {/* Ambient Warm Glow */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/[0.04] via-transparent to-transparent" />

        {/* 1. Top Status Beacon Row */}
        {state.isActive && (
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3.5 py-1.5 backdrop-blur-md">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[12px] font-medium text-white/90">
                Live Now · Hosted by {state.startedBy || 'team'}
              </span>
            </div>

            <button
              type="button"
              onClick={endMeeting}
              className="text-[12px] font-medium text-rose-400 hover:text-rose-300 transition-colors"
            >
              End call for team
            </button>
          </div>
        )}

        {/* 2. Central Minimalist Stage */}
        <div className="relative z-10 my-8 sm:my-10 flex flex-col items-center text-center max-w-xl mx-auto space-y-4">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-xl backdrop-blur-xl">
            <Video className="size-7 text-primary-ink" strokeWidth={1.75} />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
              Team Studio Meeting
            </h2>
          </div>

          <div className="pt-3">
            <button
              type="button"
              onClick={startMeeting}
              className="flex h-12 items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-8 text-body-sm font-bold text-[#0c0d10] shadow-[0_0_24px_rgba(240,168,52,0.35)] transition-all hover:shadow-[0_0_36px_rgba(240,168,52,0.5)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <Video className="size-4" strokeWidth={2.2} />
              <span>{state.isActive ? 'Join Live Meeting' : 'Start Studio Meeting'}</span>
            </button>
          </div>
        </div>

        {/* 3. Bottom Minimalist Controls Bar */}
        <div className="relative z-10 border-t border-white/10 pt-4">
          {editingUrl ? (
            <form onSubmit={updateMeetUrl} className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://meet.google.com/xxx-yyyy-zzz"
                className="h-9 w-full sm:flex-1 rounded-xl border border-white/15 bg-white/5 px-3 text-[13px] text-white placeholder:text-muted outline-none focus:border-amber-400/60"
                autoFocus
              />
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setEditingUrl(false)}
                  className="rounded-xl px-3 py-1.5 text-[12px] text-muted hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-400/20 text-amber-200 border border-amber-400/30 px-3.5 py-1.5 text-[12px] font-semibold hover:bg-amber-400/30 transition-colors"
                >
                  Save link
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 text-caption text-muted">
              <div className="flex items-center gap-2 min-w-0 max-w-md">
                <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                  Link:
                </span>
                <span className="truncate font-sans text-[13px] text-white/80">
                  {state.meetUrl}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomUrl(state.meetUrl)
                  setEditingUrl(true)
                }}
                className="text-[12px] font-medium text-white/80 hover:text-white transition-colors underline-offset-4 hover:underline"
              >
                Set custom link
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex w-full max-w-[420px] flex-col gap-[20px] rounded-[20px] border border-border bg-surface shadow-card p-[24px] font-sans text-text ${className}`}
    >
      {/* 1. Top row: video icon + title + subtitle */}
      <div className="flex items-start gap-3">
        <Video className="mt-0.5 size-5 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-medium leading-snug text-text">Team Studio Meeting</h3>
          <p className="mt-0.5 text-[13px] font-normal leading-tight text-muted">
            {state.isActive
              ? `Live now · Started by ${state.startedBy || 'team'}`
              : 'Ready to start'}
          </p>
        </div>
      </div>

      {/* 2. Start Meeting (or Join Meeting) button */}
      <button
        type="button"
        onClick={startMeeting}
        className="flex h-[44px] w-full cursor-pointer items-center justify-center rounded-[12px] bg-btn-primary px-4 text-[14px] font-semibold text-on-btn-primary transition-all duration-150 hover:bg-btn-primary-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
      >
        {state.isActive ? 'Join Meeting' : 'Start Meeting'}
      </button>

      {/* 3. Set custom link action / editing inline form */}
      {editingUrl ? (
        <form onSubmit={updateMeetUrl} className="flex flex-col gap-2 pt-0.5">
          <input
            type="text"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://meet.google.com/xxx-yyyy-zzz"
            className="h-[38px] w-full rounded-[10px] border border-border bg-surface-raised px-3 text-[13px] font-normal text-text placeholder:text-muted outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
          <div className="flex items-center justify-between">
            {state.isActive ? (
              <button
                type="button"
                onClick={endMeeting}
                className="py-1 text-[12px] font-normal text-danger hover:underline"
              >
                End call for team
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingUrl(false)}
                className="py-1 text-[13px] font-normal text-muted transition-colors hover:text-text"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-[8px] bg-primary-subtle px-3 py-1 text-[13px] font-medium text-primary-ink transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setCustomUrl(state.meetUrl)
              setEditingUrl(true)
            }}
            className="cursor-pointer py-1 text-center text-[13px] font-normal text-muted transition-colors hover:text-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
          >
            Set custom link
          </button>
          {state.isActive ? (
            <button
              type="button"
              onClick={endMeeting}
              className="cursor-pointer text-[12px] font-normal text-muted transition-colors hover:text-danger hover:underline"
            >
              End call
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
