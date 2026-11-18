import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useNavigate, useSearchParams } from 'react-router'
import { EmptyState } from '@/components/patterns/EmptyState'
import { MoonLogo } from '@/components/patterns/MoonLogo'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { PageSpinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth'
import { NotificationBell } from '@/features/notifications'
import { formatDateOnly } from '@/lib/dates'
import { STAGE_LABELS } from '../constants'
import { useLeaveRoom, useMyGuestRooms } from '../guests'
import { GUEST_ROLE_LABELS } from '../room'
import { ProjectRoomPage } from './ProjectRoomPage'

/** Minimal shell for guests: logo, their rooms, sign out — no workspace modules (Flow §3). */
export function GuestShell() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-hairline bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/guest" className="flex items-center gap-2 font-semibold tracking-[-0.02em]">
            <MoonLogo className="size-6" />
            Luna Space
          </Link>
          <Badge tone="info">Guest</Badge>
          <span className="ml-auto" />
          <NotificationBell to="/guest/notifications" />
          <span className="hidden truncate text-caption text-muted sm:block">{user?.email}</span>
          <Button
            variant="ghost"
            size="sm"
            icon={<LogOut className="size-4" aria-hidden />}
            onClick={async () => {
              await signOut()
              void navigate('/auth/sign-in', { replace: true })
            }}
          >
            Sign out
          </Button>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

/** /guest — the rooms this person is a guest in (FR-GUEST-11). */
export function GuestHomePage() {
  const rooms = useMyGuestRooms()
  const leave = useLeaveRoom()
  const toast = useToast()
  const [leaving, setLeaving] = useState<{ id: string; name: string } | null>(null)

  return (
    <section aria-labelledby="guest-home-title" className="space-y-4">
      <h1 id="guest-home-title" className="font-display text-h1">
        Your rooms
      </h1>
      {rooms.isPending ? (
        <PageSpinner label="Loading your rooms" />
      ) : rooms.error ? (
        <Alert tone="danger">
          Couldn&apos;t load your rooms.{' '}
          <button type="button" className="underline" onClick={() => rooms.refetch()}>
            Retry
          </button>
        </Alert>
      ) : rooms.data.length === 0 ? (
        <EmptyState title="No rooms yet">
          When someone invites you to a project room, it appears here.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2" data-testid="guest-rooms">
          {rooms.data.map((r) => (
            <li key={r.id} className="panel flex flex-col gap-3 p-5">
              <Link
                to={`/guest/rooms/${r.project_id}/board`}
                className="text-h3 font-semibold hover:text-primary"
              >
                {r.project.name}
              </Link>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="primary">{STAGE_LABELS[r.project.stage]}</Badge>
                <Badge tone="info">{GUEST_ROLE_LABELS[r.role]}</Badge>
                {r.project.end_date ? (
                  <span className="text-caption text-muted">
                    Ends {formatDateOnly(r.project.end_date)}
                  </span>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => setLeaving({ id: r.project_id, name: r.project.name })}
              >
                Leave room
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={Boolean(leaving)}
        onOpenChange={(open) => !open && setLeaving(null)}
        title={`Leave ${leaving?.name ?? 'this room'}?`}
        description="You'll lose access straight away. Someone in the room would need to invite you again."
        footer={
          <>
            <Button variant="ghost" onClick={() => setLeaving(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={leave.isPending}
              onClick={() =>
                leaving &&
                leave.mutate(leaving.id, {
                  onSuccess: () => {
                    toast.show(`You left ${leaving.name}`, 'success')
                    setLeaving(null)
                  },
                })
              }
            >
              Leave room
            </Button>
          </>
        }
      />
    </section>
  )
}

/** /guest/rooms/:id/:tab — the room, plus a one-time welcome after joining. */
export function GuestRoomPage() {
  const [params, setParams] = useSearchParams()
  return (
    <div className="space-y-4">
      {params.get('welcome') ? (
        <Alert tone="success">
          You&apos;re a guest in this room. You can see items the team shares with guests.{' '}
          <button
            type="button"
            className="underline"
            onClick={() => {
              const next = new URLSearchParams(params)
              next.delete('welcome')
              setParams(next, { replace: true })
            }}
          >
            Dismiss
          </button>
        </Alert>
      ) : null}
      <ProjectRoomPage base="/guest/rooms" />
    </div>
  )
}
