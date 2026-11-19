import { zodResolver } from '@hookform/resolvers/zod'
import { Crown, LogOut, UserMinus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Alert, Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { SelectField, TextField } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth'
import { ProfileCard } from '@/features/profile'
import { formatDate, formatDateTime } from '@/lib/format'
import { InviteLinkPanel } from '../components/InviteLinkPanel'
import type { Member } from '../api'
import {
  useCurrentWorkspace,
  useLeaveWorkspace,
  useMembers,
  useOpenInvitation,
  useRemoveMember,
  useRevokeInvitation,
  useUpdateWorkspace,
} from '../hooks'

const detailsSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(60),
  emoji: z.string().trim().max(8),
})

const LIMITS = [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 30, 50]

/** /settings/workspace — details, members and invitations of the current workspace (ADR 0018). */
export function WorkspaceSettingsPage() {
  const ws = useCurrentWorkspace()
  const { user } = useAuth()
  const toast = useToast()
  const members = useMembers(ws.workspaceId)
  const invitation = useOpenInvitation(ws.workspaceId)
  const update = useUpdateWorkspace()
  const revoke = useRevokeInvitation(ws.workspaceId)
  const remove = useRemoveMember(ws.workspaceId)
  const leave = useLeaveWorkspace()
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const [removing, setRemoving] = useState<Member | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const form = useForm<z.infer<typeof detailsSchema>>({
    resolver: zodResolver(detailsSchema),
    values: { name: ws.workspaceName, emoji: ws.emoji ?? '' },
  })
  const isOwner = ws.role === 'owner'
  const count = members.data?.length ?? ws.memberCount
  const full = count >= ws.maxMembers
  const onlyMember = count <= 1

  return (
    <section aria-labelledby="ws-title" className="max-w-2xl space-y-6">
      <h1 id="ws-title" className="text-h1">
        Workspace settings
      </h1>

      <Card>
        <form
          noValidate
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={form.handleSubmit((v) =>
            update.mutate(
              { name: v.name, emoji: v.emoji },
              { onSuccess: () => toast.show('Workspace updated', 'success') },
            ),
          )}
        >
          <div className="w-full sm:w-24">
            <TextField
              label="Emoji"
              placeholder="🚀"
              maxLength={8}
              error={form.formState.errors.emoji?.message}
              {...form.register('emoji')}
            />
          </div>
          <div className="flex-1">
            <TextField
              label="Workspace name"
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />
          </div>
          <Button type="submit" loading={update.isPending}>
            Save
          </Button>
        </form>
        {update.error ? (
          <Alert tone="danger" className="mt-3">
            {update.error.message}
          </Alert>
        ) : null}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-h3 font-semibold">
            Members{' '}
            <span className="text-body-sm font-normal text-muted">
              {count} of {ws.maxMembers}
            </span>
          </h2>
          {isOwner ? (
            <div className="w-36">
              <SelectField
                label="Member limit"
                value={String(ws.maxMembers)}
                onChange={(e) =>
                  update.mutate(
                    { maxMembers: Number(e.target.value) },
                    { onError: (err) => toast.show(err.message, 'error') },
                  )
                }
                options={LIMITS.filter((n) => n >= Math.max(count, 2)).map((n) => ({
                  value: String(n),
                  label: `${n} people`,
                }))}
              />
            </div>
          ) : null}
        </div>
        {members.isPending ? (
          <Spinner label="Loading members" />
        ) : members.error ? (
          <Alert tone="danger">{members.error.message}</Alert>
        ) : (
          <ul className="divide-y divide-hairline" data-testid="member-list">
            {members.data.map((m) => (
              <li key={m.userId} className="flex items-center gap-3 py-2.5">
                <span className="icon-bubble size-9 text-body-sm font-semibold" aria-hidden>
                  {m.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ProfileCard userId={m.userId} label={m.displayName}>
                      {m.displayName}
                    </ProfileCard>
                    {m.userId === user?.id ? <span className="text-muted">(you)</span> : null}
                    {m.role === 'owner' ? (
                      <Crown className="size-3.5 text-highlight" aria-label="Owner" />
                    ) : null}
                  </span>
                  <span className="block text-caption text-muted">
                    {m.role === 'owner' ? 'Owner · ' : ''}Joined {formatDate(m.joinedAt)}
                  </span>
                </span>
                {isOwner && m.userId !== user?.id ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<UserMinus className="size-4" aria-hidden />}
                    aria-label={`Remove ${m.displayName}`}
                    onClick={() => setRemoving(m)}
                  >
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {!members.isPending && !full ? (
        <Card>
          <h2 className="mb-2 text-h3 font-semibold">Invite people</h2>
          {invitation.data ? (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-hairline px-4 py-3 text-body-sm">
              <span>
                An invite link is active until {formatDateTime(invitation.data.expiresAt)}.
              </span>
              <Button size="sm" variant="secondary" onClick={() => setConfirmRevoke(true)}>
                Turn off link
              </Button>
            </div>
          ) : null}
          <p className="mb-3 text-body-sm text-muted">
            Anyone with the link can join until the workspace is full or the link expires after 7
            days. Creating a new link turns off the old one.
          </p>
          <InviteLinkPanel workspaceId={ws.workspaceId} />
        </Card>
      ) : !members.isPending ? (
        <Card>
          <p className="text-body-sm text-muted">
            This workspace is full ({ws.maxMembers} people).
            {isOwner ? ' Raise the member limit above to invite more.' : ''}
          </p>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-1 text-h3 font-semibold">Leave this workspace</h2>
        <p className="mb-3 text-body-sm text-muted">
          {onlyMember
            ? 'You are the only member, so leaving deletes the workspace and everything in it.'
            : isOwner
              ? 'Ownership passes to the longest-standing member. Your private items stay private.'
              : 'You lose access to everything shared here. Your private items stay private.'}
        </p>
        <Button
          variant="secondary"
          icon={<LogOut className="size-4" aria-hidden />}
          onClick={() => setConfirmLeave(true)}
        >
          Leave {ws.workspaceName}
        </Button>
      </Card>

      <Dialog
        open={confirmRevoke}
        onOpenChange={setConfirmRevoke}
        title="Turn off the invite link?"
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
                    toast.show('Invite link turned off', 'success')
                  },
                })
              }
            >
              Turn off
            </Button>
          </>
        }
      />
      <Dialog
        open={removing !== null}
        onOpenChange={(o) => (o ? null : setRemoving(null))}
        title={`Remove ${removing?.displayName ?? ''}?`}
        description="They lose access to this workspace at once. Their open tasks become unassigned."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() =>
                removing &&
                remove.mutate(removing.userId, {
                  onSuccess: () => {
                    toast.show(`${removing.displayName} was removed`, 'success')
                    setRemoving(null)
                  },
                  onError: (e) => toast.show(e.message, 'error'),
                })
              }
            >
              Remove
            </Button>
          </>
        }
      />
      <Dialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title={`Leave ${ws.workspaceName}?`}
        description={
          onlyMember
            ? 'You are the only member, so the workspace will be deleted.'
            : 'You can only come back with a new invite link.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmLeave(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={leave.isPending}
              onClick={() =>
                leave.mutate(ws.workspaceId, {
                  onSuccess: () => toast.show(`You left ${ws.workspaceName}`, 'success'),
                  onError: (e) => toast.show(e.message, 'error'),
                })
              }
            >
              Leave
            </Button>
          </>
        }
      />
    </section>
  )
}
