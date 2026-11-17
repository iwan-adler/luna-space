import { UserPlus } from 'lucide-react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth'
import { useCurrentWorkspace, useMembers } from '@/features/workspace'

/** Phase 1 home. The full dashboard (FR-DASH-01…06) replaces the placeholder widgets in Phase 8. */
export function HomePage() {
  const ws = useCurrentWorkspace()
  const { user } = useAuth()
  const members = useMembers(ws.workspaceId)
  const me = members.data?.find((m) => m.userId === user?.id)
  const partner = members.data?.find((m) => m.userId !== user?.id)

  return (
    <section aria-labelledby="home-title" className="space-y-6">
      <div>
        <p className="text-caption font-semibold tracking-widest text-primary uppercase">
          {ws.workspaceName}
        </p>
        <h1 id="home-title" className="text-display font-bold">
          {me ? `Welcome, ${me.displayName}` : 'Welcome'}
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="partner-card">
          <h2 className="mb-2 text-h3 font-semibold">Your partner</h2>
          {members.isPending ? (
            <Spinner label="Loading members" />
          ) : partner ? (
            <p>
              <strong>{partner.displayName}</strong> shares this workspace with you.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-body-sm text-muted">
                Luna Space works best with your partner on board.
              </p>
              <Link
                to="/settings/workspace"
                className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
              >
                <UserPlus className="size-4" aria-hidden /> Invite your partner
              </Link>
            </div>
          )}
        </Card>
        <Card>
          <h2 className="mb-2 text-h3 font-semibold">What&apos;s next</h2>
          <p className="text-body-sm text-muted">
            Opportunities with URL extraction arrive next, followed by project rooms, the calendar,
            chat and the knowledge vault.
          </p>
        </Card>
      </div>
    </section>
  )
}
