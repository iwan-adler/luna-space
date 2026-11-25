import { Check, Copy, Users } from 'lucide-react'
import { useState } from 'react'
import { useCurrentWorkspace, useMembers } from '@/features/workspace'
import { MeetingCard, useLiveRoom } from '@/features/projects'
import { MemberPresence } from '@/components/patterns/MemberPresence'
import { usePresence } from './hooks'
import { useAuth } from '@/features/auth'

export interface StudioMeetViewProps {
  onlineIds?: Set<string>
}

export function StudioMeetView({ onlineIds }: StudioMeetViewProps = {}) {
  const ws = useCurrentWorkspace()
  const members = useMembers(ws.workspaceId)
  const rawPresence = usePresence()
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)
  const studio = useLiveRoom(null)

  const copyMeetLink = () => {
    try {
      void navigator.clipboard.writeText(studio.state.meetUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Pane Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text tracking-tight">
            Studio Meeting Room
          </h2>
        </div>

        <button
          type="button"
          onClick={copyMeetLink}
          className="flex items-center gap-2 self-start sm:self-auto rounded-full border border-border bg-surface-raised px-3.5 py-1.5 text-caption font-medium text-text transition-all hover:bg-surface-hover hover:border-border-hover active:scale-[0.98]"
        >
          {copied ? (
            <Check className="size-3.5 text-success" />
          ) : (
            <Copy className="size-3.5 text-primary-ink" />
          )}
          <span>{copied ? 'Link Copied' : 'Copy Meet Link'}</span>
        </button>
      </div>

      {/* Main Studio Meeting Stage */}
      <MeetingCard projectId="studio" hero />

      {/* Team Presence in Meeting */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary-ink" />
            <h3 className="text-body-sm font-semibold text-text tracking-tight">Teammates</h3>
          </div>
          <span className="inline-flex items-center rounded-full border border-border bg-surface-raised px-2.5 py-0.5 text-caption font-medium text-muted">
            {members.data?.length ?? 0} members
          </span>
        </div>

        {/* Grouped rounded container: iOS inset-list style */}
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {(members.data ?? []).map((m, i) => {
              const isOnline = onlineIds
                ? onlineIds.has(m.userId)
                : rawPresence.has(m.userId) || m.userId === user?.id

              return (
                <div
                  key={m.userId}
                  aria-label={`${m.displayName}, ${isOnline ? 'online' : 'offline'}`}
                  className="relative min-h-[64px] flex items-center px-4 py-3 sm:px-5 hover:bg-surface-hover/50 transition-colors duration-150"
                >
                  {/* Divider on mobile (< sm): inset after avatar for rows after the first */}
                  {i > 0 && (
                    <div className="absolute top-0 left-[68px] right-0 h-px bg-border/40 sm:hidden pointer-events-none" />
                  )}
                  {/* Vertical divider on wide screens (sm+) between columns */}
                  {i % 2 === 0 && (
                    <div className="hidden sm:block absolute right-0 top-3 bottom-3 w-px bg-border/40 pointer-events-none" />
                  )}
                  {/* Horizontal divider on wide screens (sm+) between row tiers */}
                  {i >= 2 && (
                    <div className="hidden sm:block absolute top-0 left-5 right-5 h-px bg-border/40 pointer-events-none" />
                  )}

                  <MemberPresence
                    displayName={m.displayName}
                    avatarPath={m.avatarPath}
                    isOnline={isOnline}
                    statusText={m.role === 'owner' ? 'Workspace Lead' : 'Teammate'}
                    size="md"
                    cutoutClass="ring-2 ring-surface"
                    className="w-full"
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
