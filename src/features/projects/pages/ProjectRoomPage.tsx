import { ExternalLink, Lock, Trophy } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useParams, useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Alert, Card } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { controlClass, inputClass } from '@/components/ui/styles'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth'
import { useViewerTimeZone } from '@/features/profile'
import { useCurrentWorkspace, useMembers, type Member } from '@/features/workspace'
import { formatDateOnly } from '@/lib/dates'
import { formatDateTime } from '@/lib/format'
import { ChecklistTab } from '../components/ChecklistTab'
import { FileList, UploadButton } from '../components/Files'
import { TaskBoard } from '../components/TaskBoard'
import { TaskDrawer } from '../components/TaskDrawer'
import { CATEGORY_LABELS, STAGE_LABELS, type ProjectStage } from '../constants'
import {
  useFiles,
  useProject,
  useProjectActivity,
  useProjectRealtime,
  useProjectTasks,
  useUpdateProject,
} from '../hooks'
import { projectLinks, type Project, type Task } from '../model'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'board', label: 'Board' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'files', label: 'Files' },
  { id: 'activity', label: 'Activity' },
] as const
type Tab = (typeof TABS)[number]['id']

/** /projects/:id/:tab — the project room (UI spec §15, FR-PRJ-02). */
export function ProjectRoomPage() {
  const { id = '', tab: rawTab } = useParams()
  const tab: Tab = TABS.some((t) => t.id === rawTab) ? (rawTab as Tab) : 'board'
  const project = useProject(id)
  const tasks = useProjectTasks(id)
  const { workspaceId } = useCurrentWorkspace()
  const members = useMembers(workspaceId)
  const tz = useViewerTimeZone()
  const [params, setParams] = useSearchParams()
  useProjectRealtime(id)

  if (project.isPending) return <PageSpinner />
  if (project.error || !project.data || project.data.deleted_at) {
    return (
      <Alert tone="warning">
        This project doesn&apos;t exist, was moved to the recycle bin, or is private to your
        partner.{' '}
        <Link to="/projects" className="underline">
          Back to projects
        </Link>
      </Alert>
    )
  }
  const p = project.data
  const memberList = members.data ?? []
  const taskList = tasks.data ?? []
  const openTaskId = params.get('task')
  const openTask = openTaskId ? taskList.find((t) => t.id === openTaskId) : undefined
  const closeTask = () => {
    const next = new URLSearchParams(params)
    next.delete('task')
    setParams(next)
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="eyebrow">
          <Link to="/projects" className="hover:text-text">
            Projects
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-h1 font-semibold">{p.name}</h1>
          {p.visibility === 'private' ? (
            <Lock className="size-4 text-muted" aria-label="Private" />
          ) : null}
          <Badge tone="primary">{STAGE_LABELS[p.stage]}</Badge>
          <Badge>{CATEGORY_LABELS[p.category]}</Badge>
        </div>
      </header>

      <nav aria-label="Project sections" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex w-max gap-1 rounded-full border border-hairline bg-surface-raised/70 p-1">
          {TABS.map((t) => (
            <li key={t.id}>
              <NavLink
                to={`/projects/${p.id}/${t.id}`}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`block rounded-full px-3.5 py-1 text-body-sm ${tab === t.id ? 'bg-hairline text-text' : 'text-muted hover:text-text'}`}
              >
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {tab === 'overview' ? (
        <Overview project={p} tasks={taskList} />
      ) : tab === 'board' ? (
        tasks.isPending ? (
          <PageSpinner label="Loading tasks" />
        ) : tasks.error ? (
          <Alert tone="danger">
            Couldn&apos;t load tasks.{' '}
            <button type="button" className="underline" onClick={() => tasks.refetch()}>
              Retry
            </button>
          </Alert>
        ) : (
          <TaskBoard projectId={p.id} tasks={taskList} members={memberList} viewerTz={tz} />
        )
      ) : tab === 'checklist' ? (
        <ChecklistTab projectId={p.id} />
      ) : tab === 'files' ? (
        <FilesTab projectId={p.id} viewerTz={tz} />
      ) : (
        <ActivityTab projectId={p.id} members={memberList} viewerTz={tz} />
      )}

      <TaskDrawer
        projectId={p.id}
        task={openTask}
        tasks={taskList}
        members={memberList}
        viewerTz={tz}
        onClose={closeTask}
      />
    </div>
  )
}

function Overview({ project: p, tasks }: { project: Project; tasks: Task[] }) {
  const update = useUpdateProject(p.id)
  const toast = useToast()
  const [summary, setSummary] = useState(p.summary ?? '')
  const top = tasks.filter((t) => !t.parent_task_id)
  const done = top.filter((t) => t.status === 'done').length
  const links = projectLinks(p)
  const save = (patch: Parameters<typeof update.mutate>[0], message = 'Saved') =>
    update.mutate(patch, {
      onSuccess: () => toast.show(message, 'success'),
      onError: () => toast.show("Couldn't save the change.", 'error'),
    })

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <Card className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="project-summary" className="eyebrow block">
            Summary
          </label>
          <textarea
            id="project-summary"
            rows={5}
            maxLength={5000}
            value={summary}
            placeholder="What are you building, and why?"
            onChange={(e) => setSummary(e.target.value)}
            onBlur={() => summary !== (p.summary ?? '') && save({ summary: summary || null })}
            className={inputClass}
          />
        </div>
        <p className="text-body-sm text-muted" data-testid="task-progress">
          {done} of {top.length} tasks done
        </p>
      </Card>
      <aside className="space-y-4">
        <Card className="space-y-3 text-body-sm">
          <div className="space-y-1">
            <label htmlFor="project-stage" className="eyebrow block">
              Stage
            </label>
            <select
              id="project-stage"
              className={`${controlClass} w-full`}
              value={p.stage}
              onChange={(e) => save({ stage: e.target.value as ProjectStage }, 'Stage updated')}
            >
              {Object.entries(STAGE_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <p>
            <span className="text-muted">Dates: </span>
            {p.start_date ? formatDateOnly(p.start_date) : '—'} →{' '}
            {p.end_date ? formatDateOnly(p.end_date) : '—'}
          </p>
          {p.opportunity_id ? (
            <Link
              to={`/opportunities/${p.opportunity_id}`}
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <Trophy className="size-3.5" aria-hidden /> View the opportunity
            </Link>
          ) : null}
        </Card>
        <Card>
          <h2 className="eyebrow mb-2">Links</h2>
          {links.length === 0 ? (
            <p className="text-body-sm text-muted">No links yet.</p>
          ) : (
            <ul className="space-y-1 text-body-sm">
              {links.map((l) => (
                <li key={l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {l.label} <ExternalLink className="size-3" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </aside>
    </div>
  )
}

function FilesTab({ projectId, viewerTz }: { projectId: string; viewerTz: string }) {
  const files = useFiles(projectId)
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="flex-1 text-h3 font-semibold">Files</h2>
        <UploadButton projectId={projectId} />
      </div>
      <p className="text-caption text-muted">
        Private to your workspace. Images, PDFs, Office documents, text and ZIP files up to 25 MB.
      </p>
      {files.isPending ? (
        <PageSpinner label="Loading files" />
      ) : files.error ? (
        <Alert tone="danger">Couldn&apos;t load files.</Alert>
      ) : (
        <FileList projectId={projectId} files={files.data} viewerTz={viewerTz} />
      )}
    </Card>
  )
}

function ActivityTab({
  projectId,
  members,
  viewerTz,
}: {
  projectId: string
  members: Member[]
  viewerTz: string
}) {
  const activity = useProjectActivity(projectId)
  const { user } = useAuth()
  const name = (id: string | null) =>
    id === user?.id ? 'You' : (members.find((m) => m.userId === id)?.displayName ?? 'Someone')
  if (activity.isPending) return <PageSpinner label="Loading activity" />
  if (activity.error) return <Alert tone="danger">Couldn&apos;t load activity.</Alert>
  if (activity.data.length === 0) return <p className="text-body-sm text-muted">No activity yet.</p>
  return (
    <Card>
      <ol className="space-y-3" data-testid="activity-list">
        {activity.data.map((a) => (
          <li key={a.id} className="flex gap-3 text-body-sm">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" />
            <div>
              <p>
                <span className="font-medium">{name(a.actor_id)}</span> · {a.summary}
              </p>
              <p className="text-caption text-muted">{formatDateTime(a.created_at, viewerTz)}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}
