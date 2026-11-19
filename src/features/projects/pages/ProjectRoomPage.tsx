import { Eye, ExternalLink, Lock, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, NavLink, useParams, useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Alert, Card } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { controlClass, inputClass } from '@/components/ui/styles'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth'
import { useViewerTimeZone } from '@/features/profile'
import { useMembership } from '@/features/workspace'
import { formatDateOnly } from '@/lib/dates'
import { formatDateTime } from '@/lib/format'
import { ChecklistTab } from '../components/ChecklistTab'
import { FileList, UploadButton } from '../components/Files'
import { PeopleTab } from '../components/PeopleTab'
import { TaskBoard } from '../components/TaskBoard'
import { TaskDrawer } from '../components/TaskDrawer'
import { CATEGORY_LABELS, STAGE_LABELS, type ProjectStage } from '../constants'
import { ProgressRing, ProjectCover, StageTrack } from '../components/ProjectVisuals'
import { useGuestSettings, useMyGuestRooms, useRoomPeople } from '../guests'
import {
  useFiles,
  useProject,
  useProjectActivity,
  useProjectRealtime,
  useProjectTasks,
  useUpdateProject,
} from '../hooks'
import { projectLinks, type Project, type Task } from '../model'
import {
  GUEST_ROLE_LABELS,
  RoomContext,
  roomPermissions,
  type RoomAccess,
  type RoomPermissions,
  type RoomPerson,
} from '../room'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'board', label: 'Board' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'files', label: 'Files' },
  { id: 'people', label: 'People' },
  { id: 'activity', label: 'Activity' },
] as const
type Tab = (typeof TABS)[number]['id']

/**
 * The project room (UI spec §15, FR-PRJ-02). Members open it at /projects/:id/:tab inside the
 * app shell; guests at /guest/rooms/:id/:tab inside the guest shell (FR-GUEST-11).
 */
export function ProjectRoomPage({ base = '/projects' }: { base?: string }) {
  const { id = '', tab: rawTab } = useParams()
  const tab: Tab = TABS.some((t) => t.id === rawTab) ? (rawTab as Tab) : 'board'
  const project = useProject(id)
  const tasks = useProjectTasks(id)
  const membership = useMembership()
  const guestRooms = useMyGuestRooms()
  const people = useRoomPeople(id)
  const settings = useGuestSettings(id)
  const tz = useViewerTimeZone()
  const [params, setParams] = useSearchParams()
  useProjectRealtime(id)

  const access: RoomAccess | null = !project.data
    ? null
    : project.data.workspace_id === membership.data?.workspaceId
      ? 'member'
      : (guestRooms.data?.find((r) => r.project_id === id)?.role ?? null)
  const room = useMemo(
    () =>
      project.data && access
        ? { projectId: id, workspaceId: project.data.workspace_id, access, base }
        : null,
    [project.data, access, id, base],
  )

  if (project.isPending || membership.isPending || guestRooms.isPending) return <PageSpinner />
  if (project.error || !project.data || project.data.deleted_at || !room || !access) {
    return (
      <Alert tone="warning">
        This project doesn&apos;t exist, was moved to the recycle bin, or you no longer have access
        to it.{' '}
        <Link to={base === '/projects' ? '/projects' : '/guest'} className="underline">
          Back
        </Link>
      </Alert>
    )
  }
  const p = project.data
  const topTasks = (tasks.data ?? []).filter((t) => !t.parent_task_id)
  const progressTotal = topTasks.length
  const progressDone = topTasks.filter((t) => t.status === 'done').length
  const perms = roomPermissions(access, settings.data ?? null)
  const personList = people.data ?? []
  const guests = personList.filter((x) => x.kind === 'guest')
  const taskList = tasks.data ?? []
  const openTaskId = params.get('task')
  const openTask = openTaskId ? taskList.find((t) => t.id === openTaskId) : undefined
  const closeTask = () => {
    const next = new URLSearchParams(params)
    next.delete('task')
    setParams(next)
  }

  return (
    <RoomContext.Provider value={room}>
      <div className="space-y-5">
        <header className="space-y-3">
          <p className="eyebrow">
            <Link to={perms.member ? '/projects' : '/guest'} className="hover:text-text">
              {perms.member ? 'Projects' : 'Your rooms'}
            </Link>
          </p>
          <div className="panel relative overflow-hidden p-0">
            <ProjectCover name={p.name} className="h-28 sm:h-32" />
            <div className="flex flex-wrap items-end gap-4 px-5 pb-4">
              <span className="-mt-9 rounded-full bg-[var(--color-surface)] p-1.5">
                <ProgressRing done={progressDone} total={progressTotal} size={64} />
              </span>
              <div className="min-w-0 flex-1 pt-3">
                <StageTrack stage={p.stage} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-h1">{p.name}</h1>
            {p.visibility === 'private' ? (
              <Lock className="size-4 text-muted" aria-label="Private" />
            ) : null}
            <Badge tone="primary">{STAGE_LABELS[p.stage]}</Badge>
            <Badge>{CATEGORY_LABELS[p.category]}</Badge>
            {perms.member ? null : (
              <Badge tone="info" data-testid="guest-role">
                Guest · {GUEST_ROLE_LABELS[access as keyof typeof GUEST_ROLE_LABELS]}
              </Badge>
            )}
          </div>
          {perms.member && guests.length > 0 ? (
            <p
              className="flex items-center gap-1.5 text-caption text-muted"
              data-testid="guest-banner"
            >
              <Eye className="size-3.5 text-info" aria-hidden />
              {guests.length} {guests.length === 1 ? 'guest can' : 'guests can'} see items marked
              with the eye
            </p>
          ) : null}
        </header>

        <nav aria-label="Project sections" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <ul className="flex w-max gap-1.5">
            {TABS.map((t) => (
              <li key={t.id}>
                <NavLink
                  to={`${base}/${p.id}/${t.id}`}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className={`block rounded-full px-4 py-1.5 text-body-sm ${tab === t.id ? 'nav-active' : 'border border-border text-muted hover:text-text'}`}
                >
                  {t.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {tab === 'overview' ? (
          <Overview project={p} tasks={taskList} perms={perms} />
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
            <TaskBoard
              projectId={p.id}
              tasks={taskList}
              people={personList}
              viewerTz={tz}
              perms={perms}
              showGuestMarks={guests.length > 0}
            />
          )
        ) : tab === 'checklist' ? (
          <ChecklistTab projectId={p.id} perms={perms} />
        ) : tab === 'files' ? (
          <FilesTab projectId={p.id} viewerTz={tz} perms={perms} />
        ) : tab === 'people' ? (
          <PeopleTab project={p} people={personList} perms={perms} />
        ) : (
          <ActivityTab projectId={p.id} people={personList} viewerTz={tz} />
        )}

        <TaskDrawer
          projectId={p.id}
          task={openTask}
          tasks={taskList}
          people={personList}
          viewerTz={tz}
          perms={perms}
          onClose={closeTask}
        />
      </div>
    </RoomContext.Provider>
  )
}

function Overview({
  project: p,
  tasks,
  perms,
}: {
  project: Project
  tasks: Task[]
  perms: RoomPermissions
}) {
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
          {perms.editProject ? (
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
          ) : (
            <p id="project-summary" className="text-body-sm whitespace-pre-line">
              {p.summary || 'No summary yet.'}
            </p>
          )}
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
              disabled={!perms.editProject}
              onChange={(e) => save({ stage: e.target.value as ProjectStage }, 'Stage updated')}
            >
              {Object.entries(STAGE_LABELS)
                .filter(([k]) => perms.member || k !== 'archived' || p.stage === 'archived')
                .map(([k, l]) => (
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
          {p.opportunity_id && perms.member ? (
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

function FilesTab({
  projectId,
  viewerTz,
  perms,
}: {
  projectId: string
  viewerTz: string
  perms: RoomPermissions
}) {
  const files = useFiles(projectId)
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="flex-1 text-h3 font-semibold">Files</h2>
        {perms.upload ? <UploadButton projectId={projectId} /> : null}
      </div>
      <p className="text-caption text-muted">
        {perms.member
          ? 'Private to your workspace; guests only see files you mark visible. Images, PDFs, Office documents, text and ZIP files up to 25 MB.'
          : 'Files shared with guests of this room. Images, PDFs, Office documents, text and ZIP files up to 25 MB.'}
      </p>
      {files.isPending ? (
        <PageSpinner label="Loading files" />
      ) : files.error ? (
        <Alert tone="danger">Couldn&apos;t load files.</Alert>
      ) : (
        <FileList projectId={projectId} files={files.data} viewerTz={viewerTz} perms={perms} />
      )}
    </Card>
  )
}

function ActivityTab({
  projectId,
  people,
  viewerTz,
}: {
  projectId: string
  people: RoomPerson[]
  viewerTz: string
}) {
  const activity = useProjectActivity(projectId)
  const { user } = useAuth()
  const name = (id: string | null) => {
    if (id === user?.id) return 'You'
    const person = people.find((m) => m.userId === id)
    if (!person) return 'Someone'
    return person.kind === 'guest' ? `${person.displayName} (guest)` : person.displayName
  }
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
