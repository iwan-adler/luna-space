import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Link2, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Alert, Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Field'
import { updateWorkspace } from '../api'
import { useCreateWorkspace, useSwitchWorkspace } from '../hooks'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(60),
  emoji: z.string().trim().max(8),
})

/** /workspaces/new — another workspace for another group of friends (ADR 0018). */
export function NewWorkspacePage() {
  const create = useCreateWorkspace()
  const switchTo = useSwitchWorkspace()
  const qc = useQueryClient()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', emoji: '' },
  })
  return (
    <section aria-labelledby="new-ws-title" className="max-w-xl space-y-5">
      <div>
        <h1 id="new-ws-title" className="text-h1">
          New workspace
        </h1>
        <p className="mt-1 text-body-sm text-muted">
          Each workspace has its own opportunities, projects, calendar, notes, Vault and chat. Use
          one per group of friends or per team.
        </p>
      </div>
      <Card>
        <form
          noValidate
          className="space-y-4"
          onSubmit={form.handleSubmit((v) =>
            create.mutate(v.name, {
              onSuccess: async (id) => {
                await switchTo(id, '/settings/workspace')
                if (v.emoji.trim()) {
                  await updateWorkspace({ emoji: v.emoji }).catch(() => undefined)
                  await qc.invalidateQueries({ queryKey: ['workspace'] })
                }
              },
            }),
          )}
        >
          <div className="flex gap-3">
            <div className="w-24">
              <TextField label="Emoji" placeholder="🚀" maxLength={8} {...form.register('emoji')} />
            </div>
            <div className="flex-1">
              <TextField
                label="Name"
                placeholder="e.g. Hack Club, Study group"
                autoFocus
                error={form.formState.errors.name?.message}
                {...form.register('name')}
              />
            </div>
          </div>
          {create.error ? <Alert tone="danger">{create.error.message}</Alert> : null}
          <Button
            type="submit"
            loading={create.isPending}
            icon={<Plus className="size-4" aria-hidden />}
          >
            Create workspace
          </Button>
        </form>
      </Card>
    </section>
  )
}

/** /workspaces/join — paste an invite link someone sent you. */
export function JoinWorkspacePage() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string>()
  const token = (() => {
    const m = value.trim().match(/\/invite\/([A-Za-z0-9_-]{20,100})/)
    if (m) return m[1]
    return /^[A-Za-z0-9_-]{20,100}$/.test(value.trim()) ? value.trim() : null
  })()
  return (
    <section aria-labelledby="join-ws-title" className="max-w-xl space-y-5">
      <h1 id="join-ws-title" className="text-h1">
        Join a workspace
      </h1>
      <Card>
        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!token) return setError('Paste the whole invite link you were sent.')
            void navigate(`/invite/${encodeURIComponent(token)}`)
          }}
        >
          <TextField
            label="Invite link"
            placeholder="https://…/invite/…"
            value={value}
            error={error}
            onChange={(e) => {
              setValue(e.target.value)
              setError(undefined)
            }}
          />
          <Button type="submit" icon={<Link2 className="size-4" aria-hidden />}>
            Continue
          </Button>
        </form>
      </Card>
    </section>
  )
}
