import {
  ArrowLeft,
  Check,
  ExternalLink,
  Flag,
  FolderKanban,
  GitBranch,
  NotebookPen,
  PartyPopper,
  Radio,
  Send,
  Trophy,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth'
import { useCreateNote } from '@/features/notes'
import { useOpportunity, useSetStatus, useViewerTimeZone } from '@/features/opportunities'
import { useProjectForOpportunity } from '@/features/projects'
import { useCurrentWorkspace, useMembers } from '@/features/workspace'
import { celebrate } from '@/lib/visuals'
import { useMissionBoard, useNow } from './hooks'
import { countdown, findMissions, type MissionSource } from './model'

const pad = (n: number) => String(n).padStart(2, '0')

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-16 flex-col items-center rounded-md border border-border bg-surface px-3 py-3 sm:min-w-24 sm:py-4">
      <span className="stat-number text-[34px] leading-none sm:text-[54px]">{pad(value)}</span>
      <span className="mt-1.5 text-caption tracking-[0.18em] text-muted uppercase">{label}</span>
    </div>
  )
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="panel space-y-3 p-5">
      <h2 className="flex items-center gap-2 text-body font-medium">
        <span className="icon-bubble size-7">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

/** /mission/:id — everything for the hackathon you are in, on one screen (ADR 0019). */
export function MissionPage() {
  const { id = '' } = useParams()
  const opp = useOpportunity(id)
  const project = useProjectForOpportunity(id)
  const tz = useViewerTimeZone()
  const now = useNow(1000)
  const { user } = useAuth()
  const { workspaceId } = useCurrentWorkspace()
  const members = useMembers(workspaceId)
  const setStatus = useSetStatus()
  const createNote = useCreateNote()
  const navigate = useNavigate()
  const toast = useToast()
  const { board, setTaskDone, setItemDone } = useMissionBoard(project.data?.id ?? null)

  if (opp.isPending) return <PageSpinner label="Opening mission control" />
  if (opp.error || !opp.data)
    return (
      <Alert tone="warning">
        This opportunity doesn&apos;t exist or isn&apos;t yours to see.{' '}
        <Link to="/opportunities" className="underline">
          Back to opportunities
        </Link>
      </Alert>
    )

  const o = opp.data
  const mission = findMissions([o as unknown as MissionSource], tz, now)[0]
  const c = mission ? countdown(mission.endsAt, now) : null
  const submitted = ['submitted', 'awaiting_result'].includes(o.status)
  const won = o.status === 'won'
  const nameOf = (uid: string | null) =>
    uid === user?.id ? 'You' : (members.data?.find((m) => m.userId === uid)?.displayName ?? '—')
  const tasks = board.data?.tasks ?? []
  const open = tasks.filter((t) => t.status !== 'done')
  const done = tasks.length - open.length
  const working = members.data
    ?.map((m) => ({
      m,
      task: tasks.find((t) => t.status === 'in_progress' && t.assignee_id === m.userId),
    }))
    .filter((x) => x.task)
  const repoUrls = project.data?.repo_urls ?? []
  const projectLinks = ((project.data?.links ?? []) as { label?: string; url?: string }[]).filter(
    (l) => typeof l.url === 'string' && /^https?:\/\//.test(l.url),
  )
  const links = [
    o.official_url ? { label: 'Official page', url: o.official_url } : null,
    o.registration_url ? { label: 'Registration', url: o.registration_url } : null,
    o.rules_url ? { label: 'Rules', url: o.rules_url } : null,
    ...repoUrls.map((u) => ({ label: 'Repository', url: u })),
    ...projectLinks.map((l) => ({ label: l.label || 'Link', url: l.url! })),
  ].filter((l): l is { label: string; url: string } => Boolean(l))

  const tone =
    c?.tone === 'urgent' ? 'text-danger' : c?.tone === 'soon' ? 'text-warning' : 'text-highlight'

  return (
    <div className="space-y-5">
      <Link
        to={`/opportunities/${o.id}`}
        className="inline-flex items-center gap-1.5 text-body-sm text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" aria-hidden /> {o.title}
      </Link>

      <section
        aria-labelledby="mission-title"
        className="panel relative overflow-hidden p-6 text-center sm:p-10"
      >
        <p className="eyebrow relative flex items-center justify-center gap-1.5 tracking-[0.2em] uppercase">
          {mission?.live ? (
            <>
              <Radio className="size-3.5 text-danger" aria-hidden /> Live now
            </>
          ) : (
            <>
              <Flag className="size-3.5" aria-hidden /> Mission control
            </>
          )}
        </p>
        <h1
          id="mission-title"
          className="relative mt-2 text-[clamp(26px,4vw,40px)] leading-tight font-semibold tracking-[-0.03em]"
        >
          <span className="text-gradient">{o.title}</span>
        </h1>
        {won ? (
          <p className="relative mt-6 flex items-center justify-center gap-2 text-h2 text-highlight">
            <Trophy className="size-6" aria-hidden /> Winner
          </p>
        ) : submitted ? (
          <p className="relative mt-6 flex items-center justify-center gap-2 text-h2 text-success">
            <Check className="size-6" aria-hidden /> Submitted. Awaiting results.
          </p>
        ) : c ? (
          <>
            <p className={`relative mt-2 text-body-sm ${tone}`}>
              {mission?.kind === 'submission_deadline' ? 'Submission closes in' : 'Event ends in'}
            </p>
            <div
              className="relative mt-4 flex justify-center gap-2 sm:gap-3"
              role="timer"
              aria-label={`${c.days} days ${c.hours} hours ${c.minutes} minutes left`}
              data-testid="mission-timer"
            >
              <Unit value={c.days} label="days" />
              <Unit value={c.hours} label="hours" />
              <Unit value={c.minutes} label="min" />
              <Unit value={c.seconds} label="sec" />
            </div>
          </>
        ) : (
          <p className="relative mt-4 text-body-sm text-muted">
            No upcoming submission deadline or event end is set. Add one on the opportunity to start
            the countdown.
          </p>
        )}
        <div className="relative mt-6 flex flex-wrap justify-center gap-2">
          {!submitted && !won ? (
            <Button
              icon={<Send className="size-4" aria-hidden />}
              loading={setStatus.isPending}
              onClick={() =>
                setStatus.mutate(
                  { id: o.id, status: 'submitted' },
                  {
                    onSuccess: () => {
                      celebrate(document.activeElement, { big: true })
                      toast.show('Submitted! Great work, team.', 'success')
                    },
                  },
                )
              }
            >
              We submitted
            </Button>
          ) : null}
          {submitted ? (
            <Button
              icon={<Trophy className="size-4" aria-hidden />}
              onClick={() =>
                setStatus.mutate(
                  { id: o.id, status: 'won' },
                  { onSuccess: () => celebrate(null, { big: true }) },
                )
              }
            >
              We won!
            </Button>
          ) : null}
          {project.data ? (
            <Link to={`/projects/${project.data.id}`}>
              <Button variant="secondary" icon={<FolderKanban className="size-4" aria-hidden />}>
                Project board
              </Button>
            </Link>
          ) : null}
          <Button
            variant="secondary"
            icon={<NotebookPen className="size-4" aria-hidden />}
            loading={createNote.isPending}
            onClick={() =>
              createNote.mutate(
                { title: `${o.title} — notes` },
                { onSuccess: (noteId) => void navigate(`/notes/${noteId}`) },
              )
            }
          >
            Notes pad
          </Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel
            title={tasks.length ? `Tasks · ${done} of ${tasks.length} done` : 'Tasks'}
            icon={<Check className="size-3.5" aria-hidden />}
          >
            {!project.data ? (
              <p className="text-body-sm text-muted">
                Turn this opportunity into a project to plan tasks here.{' '}
                <Link to={`/opportunities/${o.id}`} className="underline">
                  Open the opportunity
                </Link>
              </p>
            ) : board.isPending ? (
              <SkeletonList label="Loading tasks" variant="line" rows={4} />
            ) : board.error ? (
              <Alert tone="danger">Couldn&apos;t load the tasks.</Alert>
            ) : tasks.length === 0 ? (
              <p className="text-body-sm text-muted">
                No tasks yet. Add them on the project board.
              </p>
            ) : (
              <>
                <div className="h-2 overflow-hidden rounded-full bg-hairline" aria-hidden>
                  <div
                    className="h-full rounded-full bg-[var(--gradient-primary)] transition-[width] duration-500"
                    style={{ width: `${(done / tasks.length) * 100}%` }}
                  />
                </div>
                <ul className="space-y-1.5" data-testid="mission-tasks">
                  {[...open, ...tasks.filter((t) => t.status === 'done')].map((t) => (
                    <li key={t.id} className="flex items-center gap-2.5 text-body-sm">
                      <input
                        type="checkbox"
                        aria-label={`Done: ${t.title}`}
                        checked={t.status === 'done'}
                        onChange={(e) => {
                          const done = e.currentTarget.checked
                          if (done) celebrate(e.currentTarget)
                          setTaskDone.mutate({ id: t.id, done })
                        }}
                        className="size-4 accent-[var(--color-primary)]"
                      />
                      <span
                        className={`min-w-0 flex-1 truncate ${t.status === 'done' ? 'text-muted line-through' : ''}`}
                      >
                        {t.title}
                      </span>
                      <span className="shrink-0 text-caption text-muted">
                        {nameOf(t.assignee_id)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>

          {board.data?.checklist.length ? (
            <Panel
              title="Submission checklist"
              icon={<PartyPopper className="size-3.5" aria-hidden />}
            >
              <ul className="space-y-1.5">
                {board.data.checklist.map((i) => (
                  <li key={i.id}>
                    <label className="flex items-center gap-2.5 text-body-sm">
                      <input
                        type="checkbox"
                        checked={i.is_done}
                        onChange={(e) => {
                          if (e.currentTarget.checked) celebrate(e.currentTarget)
                          setItemDone.mutate({ id: i.id, done: e.currentTarget.checked })
                        }}
                        className="size-4 accent-[var(--color-primary)]"
                      />
                      <span className={i.is_done ? 'text-muted line-through' : ''}>{i.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

        <div className="space-y-4">
          <Panel title="Who's on what" icon={<Flag className="size-3.5" aria-hidden />}>
            {working?.length ? (
              <ul className="space-y-2">
                {working.map(({ m, task }) => (
                  <li key={m.userId} className="flex items-start gap-2.5 text-body-sm">
                    <span className="btn-primary grid size-7 shrink-0 place-items-center rounded-full text-caption font-semibold">
                      {m.displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <span>
                      <span className="font-medium">
                        {m.userId === user?.id ? 'You' : m.displayName}
                      </span>
                      <span className="block text-muted">{task!.title}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-muted">
                Nobody has a task in progress. Move one to “In progress” on the board.
              </p>
            )}
          </Panel>
          <Panel title="Quick links" icon={<GitBranch className="size-3.5" aria-hidden />}>
            {links.length ? (
              <ul className="space-y-1.5">
                {links.map((l) => (
                  <li key={l.url + l.label}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-body-sm hover:text-primary-ink"
                    >
                      <ExternalLink className="size-3.5 text-muted" aria-hidden />
                      <span className="font-medium">{l.label}</span>
                      <span className="min-w-0 truncate text-caption text-muted">
                        {l.url.replace(/^https?:\/\/(www\.)?/, '')}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-muted">
                Add the official page, the repo or a demo link to find them here.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
