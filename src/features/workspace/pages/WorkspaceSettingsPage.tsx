import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Alert, Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { TextField } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth'
import { formatDate, formatDateTime } from '@/lib/format'
import { InviteLinkPanel } from '../components/InviteLinkPanel'
import {
  useCurrentWorkspace,
  useMembers,
  useOpenInvitation,
  useRenameWorkspace,
  useRevokeInvitation,
} from '../hooks'

const nameSchema = z.object({ name: z.string().trim().min(1, 'Enter a name').max(60) })

export function WorkspaceSettingsPage() {
  const ws = useCurrentWorkspace()
  const { user } = useAuth()
  const toast = useToast()
  const members = useMembers(ws.workspaceId)
  const invitation = useOpenInvitation(ws.workspaceId)
  const rename = useRenameWorkspace(ws.workspaceId)
  const revoke = useRevokeInvitation(ws.workspaceId)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const form = useForm<z.infer<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
    values: { name: ws.workspaceName },
  })
  const full = (members.data?.length ?? 0) >= 2

  return (
    <section aria-labelledby="ws-title" className="max-w-2xl space-y-6">
      <h1 id="ws-title" className="text-h1 font-bold">
        Workspace settings
      </h1>

      <Card>
        <form
          noValidate
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={form.handleSubmit((v) =>
            rename.mutate(v.name, { onSuccess: () => toast.show('Workspace renamed', 'success') }),
          )}
        >
          <div className="flex-1">
            <TextField
              label="Workspace name"
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />
          </div>
          <Button type="submit" loading={rename.isPending}>
            Save
          </Button>
        </form>
        {rename.error ? (
          <Alert tone="danger" className="mt-3">
            {rename.error.message}
          </Alert>
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-3 text-h3 font-semibold">Members</h2>
        {members.isPending ? (
          <Spinner label="Loading members" />
        ) : members.error ? (
          <Alert tone="danger">{members.error.message}</Alert>
        ) : (
          <ul className="divide-y divide-border" data-testid="member-list">
            {members.data.map((m) => (
              <li key={m.userId} className="flex items-center justify-between py-2">
                <span className="font-medium">
                  {m.displayName}
                  {m.userId === user?.id ? <span className="ml-1 text-muted">(you)</span> : null}
                </span>
                <span className="text-caption text-muted">Joined {formatDate(m.joinedAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-caption text-muted">A workspace has at most two members.</p>
      </Card>

      {!members.isPending && !full ? (
        <Card>
          <h2 className="mb-2 text-h3 font-semibold">Invite your partner</h2>
          {invitation.data ? (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-sm bg-bg px-3 py-2 text-body-sm">
              <span>
                An invitation link is active until {formatDateTime(invitation.data.expiresAt)}.
              </span>
              <Button size="sm" variant="secondary" onClick={() => setConfirmRevoke(true)}>
                Revoke link
              </Button>
            </div>
          ) : null}
          <p className="mb-3 text-body-sm text-muted">
            Creating a new link cancels any earlier one. Links work once and expire after 7 days.
          </p>
          <InviteLinkPanel workspaceId={ws.workspaceId} />
        </Card>
      ) : null}

      <Dialog
        open={confirmRevoke}
        onOpenChange={setConfirmRevoke}
        title="Revoke the invitation link?"
        description="Anyone who has the link will no longer be able to join. You can create a new one at any time."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRevoke(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={revoke.isPending}
              onClick={() =>
                revoke.mutate(undefined, {
                  onSuccess: () => {
                    setConfirmRevoke(false)
                    toast.show('Invitation revoked', 'success')
                  },
                })
              }
            >
              Revoke
            </Button>
          </>
        }
      />
    </section>
  )
}
