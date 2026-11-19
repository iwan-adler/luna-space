import { Lock, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { EmptyState } from '@/components/patterns/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { SelectField, TextField } from '@/components/ui/Field'
import { SkeletonList } from '@/components/ui/Skeleton'
import { ProgressRing, ProjectCover, StageTrack } from '../components/ProjectVisuals'
import { useToast } from '@/components/ui/Toast'
import { formatDateOnly } from '@/lib/dates'
import { messageForCode, toAppError } from '@/lib/errors'
import {
  CATEGORY_LABELS,
  STAGE_LABELS,
  type ProjectCategory,
  type ProjectStage,
} from '../constants'
import { useCreateProject, useProjects, useTaskProgress } from '../hooks'

/** /projects — project rooms (FR-PRJ-01). Active first; completed and archived at the end. */
export function ProjectListPage() {
  const { data, isPending, error, refetch } = useProjects()
  const progress = useTaskProgress()
  const [creating, setCreating] = useState(false)
  const done = (s: ProjectStage) => s === 'completed' || s === 'archived'
  const sorted = data ? [...data].sort((a, b) => Number(done(a.stage)) - Number(done(b.stage))) : []

  return (
    <section aria-labelledby="projects-title" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 id="projects-title" className="flex-1 font-display text-h1">
          Projects
        </h1>
        <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => setCreating(true)}>
          New project
        </Button>
      </div>

      {isPending ? (
        <div className="grid gap-3 md:grid-cols-2">
          <SkeletonList label="Loading projects" rows={2} />
          <SkeletonList label="" rows={2} />
        </div>
      ) : error ? (
        <Alert tone="danger">
          Couldn&apos;t load projects.{' '}
          <button type="button" className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </Alert>
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No projects yet"
          action={<Button onClick={() => setCreating(true)}>Create a project</Button>}
        >
          Start a project room, or convert an opportunity you&apos;re taking part in.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2" data-testid="project-list">
          {sorted.map((p) => (
            <li key={p.id}>
              <Link to={`/projects/${p.id}`} className="panel block overflow-hidden p-0">
                <ProjectCover name={p.name} className="h-20" />
                <div className="relative px-5 pb-5">
                  <div className="-mt-7 mb-2 flex items-end justify-between gap-2">
                    <span className="rounded-full bg-[var(--color-surface)] p-1">
                      <ProgressRing
                        done={progress.data?.get(p.id)?.done ?? 0}
                        total={progress.data?.get(p.id)?.total ?? 0}
                        size={50}
                      />
                    </span>
                    <StageTrack stage={p.stage} compact />
                  </div>
                  <div className="flex items-start gap-2">
                    <h2 className="flex-1 text-h3 font-semibold">{p.name}</h2>
                    {p.visibility === 'private' ? (
                      <Lock className="mt-1 size-3.5 text-muted" aria-label="Private" />
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone={done(p.stage) ? 'neutral' : 'primary'}>
                      {STAGE_LABELS[p.stage]}
                    </Badge>
                    <Badge>{CATEGORY_LABELS[p.category]}</Badge>
                  </div>
                  {p.end_date ? (
                    <p className="mt-3 text-caption text-muted">
                      Ends {formatDateOnly(p.end_date, { weekday: true })}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <CreateProjectDialog open={creating} onOpenChange={setCreating} />
    </section>
  )
}

function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const create = useCreateProject()
  const navigate = useNavigate()
  const toast = useToast()
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ProjectCategory>('hackathon')
  const [isPrivate, setPrivate] = useState(false)
  const [error, setError] = useState<string>()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Give the project a name.')
    create.mutate(
      {
        name: name.trim(),
        category,
        stage: 'idea',
        visibility: isPrivate ? 'private' : 'shared',
        summary: null,
      },
      {
        onSuccess: (id) => {
          onOpenChange(false)
          setName('')
          toast.show('Project created', 'success')
          void navigate(`/projects/${id}`)
        },
        onError: (err) => setError(messageForCode(toAppError(err).code, toAppError(err).message)),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="New project">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextField
          label="Name"
          value={name}
          maxLength={120}
          autoFocus
          onChange={(e) => {
            setName(e.target.value)
            setError(undefined)
          }}
          error={error}
        />
        <SelectField
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as ProjectCategory)}
          options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <label className="flex items-center gap-2 text-body-sm">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setPrivate(e.target.checked)}
            className="size-4 accent-[var(--color-primary)]"
          />
          Private (only you can see it)
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            Create project
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
