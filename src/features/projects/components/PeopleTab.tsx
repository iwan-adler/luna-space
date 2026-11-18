import { Copy, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert, Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { SelectField, TextField } from '@/components/ui/Field'
import { PageSpinner } from '@/components/ui/Spinner'
import { controlClass } from '@/components/ui/styles'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth'
import { messageForCode, toAppError } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import {
  invitationStatus,
  joinUrl,
  useCreateInvitation,
  useGuestMemberships,
  useGuestSettings,
  useInvitations,
  useRemoveGuest,
  useRevokeInvitation,
  useSetGuestRole,
  useUpdateGuestSettings,
  type GuestSettingsPatch,
  type NewInvitation,
} from '../guests'
import type { Project } from '../model'
import { GUEST_ROLE_LABELS, type GuestRole, type RoomPermissions, type RoomPerson } from '../room'

const errorText = (e: unknown, fallback: string) => messageForCode(toAppError(e).code, fallback)

/** People: members, guests, invitations and room guest settings (FR-GUEST-01–10). */
export function PeopleTab({
  project,
  people,
  perms,
}: {
  project: Project
  people: RoomPerson[]
  perms: RoomPermissions
}) {
  const [inviting, setInviting] = useState(false)
  const shareable = project.visibility === 'shared' && project.stage !== 'archived'
  const members = people.filter((p) => p.kind === 'member')

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="flex-1 text-h3 font-semibold">People</h2>
            {perms.manageGuests && shareable ? (
              <Button
                size="sm"
                icon={<UserPlus className="size-4" aria-hidden />}
                onClick={() => setInviting(true)}
              >
                Invite guests
              </Button>
            ) : null}
          </div>
          {!shareable && perms.member ? (
            <p className="text-caption text-muted">
              Private and archived projects can&apos;t have guests.
            </p>
          ) : null}
          <ul className="divide-y divide-hairline" data-testid="people-list">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center gap-3 py-2.5 text-body-sm">
                <span className="flex-1">{m.displayName}</span>
                <Badge>Member</Badge>
              </li>
            ))}
            <GuestRows projectId={project.id} people={people} perms={perms} />
          </ul>
        </Card>
        {perms.manageGuests ? <Invitations projectId={project.id} /> : null}
      </div>
      {perms.manageGuests ? <GuestSettingsCard projectId={project.id} /> : null}
      {perms.manageGuests ? (
        <InviteDialog
          projectId={project.id}
          canGrantAdmin={perms.grantAdmin}
          open={inviting}
          onOpenChange={setInviting}
        />
      ) : null}
    </div>
  )
}

function GuestRows({
  projectId,
  people,
  perms,
}: {
  projectId: string
  people: RoomPerson[]
  perms: RoomPermissions
}) {
  const memberships = useGuestMemberships(projectId, perms.manageGuests)
  const setRole = useSetGuestRole(projectId)
  const remove = useRemoveGuest(projectId)
  const toast = useToast()
  const { user } = useAuth()
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null)
  const guests = people.filter((p) => p.kind === 'guest')

  return (
    <>
      {guests.map((g) => {
        const membership = memberships.data?.find((m) => m.user_id === g.userId)
        const editable =
          perms.manageGuests &&
          membership &&
          g.userId !== user?.id &&
          (perms.grantAdmin || g.role !== 'project_admin')
        return (
          <li key={g.userId} className="flex flex-wrap items-center gap-3 py-2.5 text-body-sm">
            <span className="flex-1">
              {g.displayName}
              {g.userId === user?.id ? ' (you)' : ''}
            </span>
            {editable ? (
              <>
                <label className="sr-only" htmlFor={`role-${g.userId}`}>
                  Role of {g.displayName}
                </label>
                <select
                  id={`role-${g.userId}`}
                  className={`${controlClass} py-1.5`}
                  value={g.role ?? 'viewer'}
                  onChange={(e) =>
                    setRole.mutate(
                      { membershipId: membership.id, role: e.target.value as GuestRole },
                      {
                        onSuccess: () => toast.show('Role updated', 'success'),
                        onError: (err) =>
                          toast.show(errorText(err, "Couldn't change the role."), 'error'),
                      },
                    )
                  }
                >
                  {(Object.keys(GUEST_ROLE_LABELS) as GuestRole[])
                    .filter((r) => perms.grantAdmin || r !== 'project_admin')
                    .map((r) => (
                      <option key={r} value={r}>
                        Guest · {GUEST_ROLE_LABELS[r]}
                      </option>
                    ))}
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRemoving({ id: membership.id, name: g.displayName })}
                >
                  Remove
                </Button>
              </>
            ) : (
              <Badge tone="info">Guest · {GUEST_ROLE_LABELS[g.role ?? 'viewer']}</Badge>
            )}
          </li>
        )
      })}
      <Dialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.name ?? 'guest'}?`}
        description="They lose access to this room straight away and their open assignments here are cleared. Items they created stay in the room."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() =>
                removing &&
                remove.mutate(removing.id, {
                  onSuccess: () => {
                    toast.show(`${removing.name} was removed`, 'success')
                    setRemoving(null)
                  },
                  onError: (err) =>
                    toast.show(errorText(err, "Couldn't remove the guest."), 'error'),
                })
              }
            >
              Remove guest
            </Button>
          </>
        }
      />
    </>
  )
}

function Invitations({ projectId }: { projectId: string }) {
  const invitations = useInvitations(projectId)
  const revoke = useRevokeInvitation(projectId)
  const toast = useToast()
  if (invitations.isPending) return <PageSpinner label="Loading invitations" />
  if (invitations.error) return <Alert tone="danger">Couldn&apos;t load invitations.</Alert>
  if (invitations.data.length === 0) return null
  return (
    <Card>
      <h2 className="mb-2 text-h3 font-semibold">Invitations</h2>
      <ul className="divide-y divide-hairline" data-testid="invitation-list">
        {invitations.data.map((inv) => {
          const status = invitationStatus(inv)
          return (
            <li key={inv.id} className="flex flex-wrap items-center gap-3 py-2.5 text-body-sm">
              <span className="min-w-0 flex-1">
                {inv.label || `${GUEST_ROLE_LABELS[inv.role]} link`}
                <span className="block text-caption text-muted">
                  {GUEST_ROLE_LABELS[inv.role]} · used {inv.use_count}
                  {inv.max_uses ? ` of ${inv.max_uses}` : ''} · expires{' '}
                  {formatDateTime(inv.expires_at)}
                </span>
              </span>
              <Badge tone={status === 'Active' ? 'success' : 'neutral'}>{status}</Badge>
              {status === 'Active' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    revoke.mutate(inv.id, {
                      onSuccess: () => toast.show('Invitation revoked', 'success'),
                    })
                  }
                >
                  Revoke
                </Button>
              ) : null}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

const EXPIRY_OPTIONS = [
  { value: '1', label: '1 hour' },
  { value: '24', label: '1 day' },
  { value: '168', label: '7 days' },
  { value: '720', label: '30 days' },
]

function InviteDialog({
  projectId,
  canGrantAdmin,
  open,
  onOpenChange,
}: {
  projectId: string
  canGrantAdmin: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const create = useCreateInvitation(projectId)
  const toast = useToast()
  const [role, setRole] = useState<GuestRole>('collaborator')
  const [expires, setExpires] = useState('168')
  const [maxUses, setMaxUses] = useState('')
  const [label, setLabel] = useState('')
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string>()

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      setLink(null)
      setError(undefined)
      setLabel('')
      setMaxUses('')
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const uses = maxUses.trim() ? Number(maxUses) : null
    if (uses !== null && (!Number.isInteger(uses) || uses < 1 || uses > 25))
      return setError('Maximum uses must be between 1 and 25.')
    create.mutate(
      {
        role,
        expiresHours: Number(expires) as NewInvitation['expiresHours'],
        maxUses: uses,
        label: label.trim(),
      },
      {
        onSuccess: (r) => setLink(joinUrl(r.token)),
        onError: (err) => setError(errorText(err, "Couldn't create the invitation.")),
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title={link ? 'Invitation link' : 'Invite guests to this room'}
      description={
        link
          ? 'Copy it now: for security it is shown only once. Anyone with the link can join until it expires or is used up.'
          : 'Guests only see this room, and only items marked visible to guests.'
      }
    >
      {link ? (
        <div className="space-y-3">
          <input
            readOnly
            value={link}
            aria-label="Invitation link"
            data-testid="guest-invite-link"
            className={`${controlClass} w-full font-mono text-caption`}
            onFocus={(e) => e.target.select()}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              icon={<Copy className="size-4" aria-hidden />}
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(link)
                  .then(() => toast.show('Link copied', 'success'))
                  .catch(() => undefined)
              }}
            >
              Copy
            </Button>
            <Button onClick={() => close(false)}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <SelectField
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as GuestRole)}
            hint="Viewers read; collaborators also add and update tasks, comments and files; project admins also edit project details and manage guests."
            options={(Object.keys(GUEST_ROLE_LABELS) as GuestRole[])
              .filter((r) => canGrantAdmin || r !== 'project_admin')
              .map((r) => ({ value: r, label: GUEST_ROLE_LABELS[r] }))}
          />
          <SelectField
            label="Expires after"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            options={EXPIRY_OPTIONS}
          />
          <TextField
            label="Maximum uses (optional)"
            inputMode="numeric"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="Unlimited until it expires"
          />
          <TextField
            label="Label (optional)"
            maxLength={60}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Team Nova"
            error={error}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Create link
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}

const TOGGLES: { key: keyof GuestSettingsPatch & string; label: string }[] = [
  { key: 'collaborators_can_create_tasks', label: 'Collaborators can create tasks' },
  { key: 'collaborators_can_upload_files', label: 'Collaborators can upload files' },
  { key: 'viewers_can_comment', label: 'Viewers can comment' },
  { key: 'guests_see_activity', label: 'Guests can see room activity' },
]

function GuestSettingsCard({ projectId }: { projectId: string }) {
  const settings = useGuestSettings(projectId)
  const update = useUpdateGuestSettings(projectId)
  const toast = useToast()
  const save = (patch: GuestSettingsPatch) =>
    update.mutate(patch, {
      onSuccess: () => toast.show('Guest settings saved', 'success'),
      onError: () => toast.show("Couldn't save the setting.", 'error'),
    })
  if (settings.isPending) return <PageSpinner />
  if (!settings.data) return null
  const s = settings.data
  return (
    <Card className="h-fit space-y-3">
      <h2 className="text-h3 font-semibold">Guest settings</h2>
      {TOGGLES.map((t) => (
        <label key={t.key} className="flex items-center gap-2.5 text-body-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-primary)]"
            checked={Boolean(s[t.key as keyof typeof s])}
            onChange={(e) => save({ [t.key]: e.target.checked })}
          />
          {t.label}
        </label>
      ))}
      <label className="flex items-center gap-2.5 text-body-sm">
        Maximum guests
        <select
          className={`${controlClass} py-1.5`}
          value={s.max_guests}
          onChange={(e) => save({ max_guests: Number(e.target.value) })}
        >
          {[1, 2, 3, 5, 10, 15, 20, 25].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </Card>
  )
}
