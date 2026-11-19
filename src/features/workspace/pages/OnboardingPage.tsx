import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router'
import { z } from 'zod'
import { AuthFrame } from '@/features/auth'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { SelectField, TextField } from '@/components/ui/Field'
import { PageSpinner } from '@/components/ui/Spinner'
import { useMyProfile, useUpdateProfile } from '@/features/profile'
import { deviceTimeZone, timeZoneOptions } from '@/lib/timezones'
import { InviteLinkPanel } from '../components/InviteLinkPanel'
import { useCreateWorkspace, useMembership } from '../hooks'

const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter your name').max(60),
  timezone: z.string().min(1),
})
const workspaceSchema = z.object({ name: z.string().trim().min(1, 'Enter a name').max(60) })

/** Three-step onboarding: profile → workspace → invite friends (Flow §4, ADR 0018). */
export function OnboardingPage() {
  const navigate = useNavigate()
  const membership = useMembership()
  const profile = useMyProfile()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  if (membership.isPending || profile.isPending) return <PageSpinner />
  if (membership.data && step === 1) return <Navigate to="/" replace />

  return (
    <AuthFrame>
      <div className="mb-6 flex items-center gap-3">
        <p className="eyebrow">Step {step} of 3</p>
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`h-1 flex-1 rounded-full ${n <= step ? 'bg-primary' : 'bg-hairline'}`}
            />
          ))}
        </div>
      </div>
      <div>
        {step === 1 && profile.data ? (
          <ProfileStep
            defaults={{
              displayName: profile.data.display_name,
              timezone:
                profile.data.timezone === 'Asia/Kolkata' ? deviceTimeZone() : profile.data.timezone,
            }}
            onDone={() => setStep(2)}
          />
        ) : null}
        {step === 2 ? (
          <WorkspaceStep
            onDone={(id) => {
              setWorkspaceId(id)
              setStep(3)
            }}
          />
        ) : null}
        {step === 3 && workspaceId ? (
          <div className="space-y-4">
            <h1 className="font-display text-h1">Invite your people</h1>
            <p className="text-body-sm text-muted">
              Send this link to the friends you build with. Anyone with it can join until the
              workspace is full or the link expires in 7 days. You can also do this later in
              Settings.
            </p>
            <InviteLinkPanel workspaceId={workspaceId} />
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => navigate('/', { replace: true })}
            >
              Go to my dashboard
            </Button>
          </div>
        ) : null}
      </div>
    </AuthFrame>
  )
}

function ProfileStep({
  defaults,
  onDone,
}: {
  defaults: z.infer<typeof profileSchema>
  onDone: () => void
}) {
  const update = useUpdateProfile()
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaults,
  })
  const zones = timeZoneOptions(defaults.timezone)

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit((v) =>
        update.mutate({ display_name: v.displayName, timezone: v.timezone }, { onSuccess: onDone }),
      )}
    >
      <h1 className="font-display text-h1">Welcome! Tell us about you</h1>
      {update.error ? <Alert tone="danger">{update.error.message}</Alert> : null}
      <TextField
        label="Your name"
        error={form.formState.errors.displayName?.message}
        {...form.register('displayName')}
      />
      <SelectField
        label="Time zone"
        hint="Deadlines and reminders use this time zone."
        options={zones}
        {...form.register('timezone')}
      />
      <Button type="submit" className="w-full" loading={update.isPending}>
        Continue
      </Button>
    </form>
  )
}

function WorkspaceStep({ onDone }: { onDone: (workspaceId: string) => void }) {
  const create = useCreateWorkspace()
  const form = useForm<z.infer<typeof workspaceSchema>>({ resolver: zodResolver(workspaceSchema) })
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit((v) => create.mutate(v.name, { onSuccess: onDone }))}
    >
      <h1 className="font-display text-h1">Name your workspace</h1>
      <p className="text-body-sm text-muted">
        A private space for you and the people you build with. You can rename it later, and create
        more workspaces for other groups of friends.
      </p>
      {create.error ? <Alert tone="danger">{create.error.message}</Alert> : null}
      <TextField
        label="Workspace name"
        placeholder="e.g. Moonshot Crew"
        error={form.formState.errors.name?.message}
        {...form.register('name')}
      />
      <Button type="submit" className="w-full" loading={create.isPending}>
        Create workspace
      </Button>
    </form>
  )
}
