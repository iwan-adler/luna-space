import { Link } from 'react-router'
import { EmptyState } from '@/components/patterns/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { useViewerTimeZone } from '@/features/profile'
import { formatDateOnly } from '@/lib/dates'
import type { MyTask } from '../api'
import { PRIORITY_LABELS, PRIORITY_TONES, STATUS_LABELS } from '../constants'
import { useMyTasks } from '../hooks'
import { dueInDays } from '../model'

type Group = 'overdue' | 'today' | 'week' | 'later' | 'none'
const GROUP_LABELS: Record<Group, string> = {
  overdue: 'Overdue',
  today: 'Today',
  week: 'Next 7 days',
  later: 'Later',
  none: 'No due date',
}

/** /tasks — every open task assigned to me, grouped by due date (FR-PRJ-06). */
export function MyTasksPage() {
  const tasks = useMyTasks()
  const tz = useViewerTimeZone()

  const groupOf = (t: MyTask): Group => {
    if (!t.due_date) return 'none'
    const d = dueInDays(t.due_date, tz)
    return d < 0 ? 'overdue' : d === 0 ? 'today' : d <= 7 ? 'week' : 'later'
  }

  return (
    <section aria-labelledby="my-tasks-title" className="space-y-4">
      <h1 id="my-tasks-title" className="font-sans text-h1">
        My tasks
      </h1>
      {tasks.isPending ? (
        <PageSpinner label="Loading your tasks" />
      ) : tasks.error ? (
        <Alert tone="danger">
          Couldn&apos;t load your tasks.{' '}
          <button type="button" className="underline" onClick={() => tasks.refetch()}>
            Retry
          </button>
        </Alert>
      ) : tasks.data.length === 0 ? (
        <EmptyState title="Nothing assigned to you">
          Tasks assigned to you in any project show up here.
        </EmptyState>
      ) : (
        (Object.keys(GROUP_LABELS) as Group[]).map((g) => {
          const items = tasks.data.filter((t) => groupOf(t) === g)
          if (items.length === 0) return null
          return (
            <section key={g} aria-label={GROUP_LABELS[g]} className="space-y-2">
              <h2 className={`eyebrow ${g === 'overdue' ? 'text-danger' : ''}`}>
                {GROUP_LABELS[g]} · {items.length}
              </h2>
              <ul
                className="panel divide-y divide-hairline overflow-hidden p-0"
                data-testid={`my-tasks-${g}`}
              >
                {items.map((t) => (
                  <li key={t.id}>
                    <Link
                      to={`/projects/${t.project_id}/board?task=${t.id}`}
                      className="flex flex-wrap items-center gap-2 px-4 py-3 hover:bg-hairline"
                    >
                      <span className="min-w-0 flex-1 text-body-sm">
                        {t.title}
                        <span className="block text-caption text-muted">
                          {t.project?.name ?? 'Project'} · {STATUS_LABELS[t.status]}
                        </span>
                      </span>
                      {t.priority === 'high' || t.priority === 'urgent' ? (
                        <Badge tone={PRIORITY_TONES[t.priority]}>
                          {PRIORITY_LABELS[t.priority]}
                        </Badge>
                      ) : null}
                      {t.due_date ? <Badge>{formatDateOnly(t.due_date)}</Badge> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}
    </section>
  )
}
