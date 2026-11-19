import { SkeletonList } from '@/components/ui/Skeleton'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { formatDateOnly } from '@/lib/dates'
import { toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { STAGE_LABELS } from '../constants'
import { useProjects } from '../hooks'

/** Open tasks per project, counted in one query. */
function useOpenTaskCounts() {
  return useQuery({
    queryKey: ['projects', 'open-task-counts'],
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await requireSupabase()
        .from('tasks')
        .select('project_id')
        .is('deleted_at', null)
        .neq('status', 'done')
        .not('project_id', 'is', null)
        .limit(5000)
      if (error) throw toAppError(error)
      const counts = new Map<string, number>()
      for (const t of data)
        if (t.project_id) counts.set(t.project_id, (counts.get(t.project_id) ?? 0) + 1)
      return counts
    },
  })
}

/** Active projects with stage, open tasks and the end date (FR-DASH-03). */
export function ActiveProjectsWidget({
  mine,
  userId,
}: {
  mine: boolean
  userId: string | undefined
}) {
  const projects = useProjects()
  const counts = useOpenTaskCounts()
  const active = (projects.data ?? [])
    .filter((p) => p.stage !== 'archived' && p.stage !== 'completed')
    .filter((p) => !mine || p.owner_id === userId)
    .slice(0, 6)

  return (
    <section aria-labelledby="active-projects-title" className="panel space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h2 id="active-projects-title" className="text-body font-medium">
          Active projects
        </h2>
        <Link to="/projects" className="icon-btn size-8" aria-label="Open projects">
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      {projects.isPending ? (
        <SkeletonList label="Loading projects" variant="line" rows={3} />
      ) : projects.error ? (
        <p className="text-body-sm text-danger">Couldn&apos;t load projects.</p>
      ) : active.length === 0 ? (
        <p className="text-body-sm text-muted">
          No active projects. Turn an opportunity into a project to start one.
        </p>
      ) : (
        <ul className="space-y-2.5" data-testid="active-projects">
          {active.map((p) => {
            const open = counts.data?.get(p.id) ?? 0
            return (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`} className="block rounded-xl hover:text-text">
                  <span className="flex items-center gap-2 text-body-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                    <span className="shrink-0 rounded-full bg-hairline px-2 py-0.5 text-caption text-muted">
                      {STAGE_LABELS[p.stage]}
                    </span>
                  </span>
                  <span className="text-caption text-muted">
                    {open} open task{open === 1 ? '' : 's'}
                    {p.end_date ? ` · ends ${formatDateOnly(p.end_date)}` : ''}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
